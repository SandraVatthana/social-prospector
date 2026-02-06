/**
 * SOS Prospection - Multi-Platform Extension
 * Background Service Worker
 */

console.log('[SOS] ====== SERVICE WORKER STARTING ======');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  APP_URL: 'https://sosprospection.netlify.app',
  DEV_URL: 'http://localhost:5178',
  API_TIMEOUT: 30000,
  DEBUG: false
};

// Logging helpers - always log for debugging
function sosLog(...args) {
  console.log('[SOS]', ...args);
}
function sosError(...args) {
  console.error('[SOS ERROR]', ...args);
}
function sosWarn(...args) {
  console.warn('[SOS WARN]', ...args);
}

const INSTAGRAM_DOMAIN = '.instagram.com';
const INSTAGRAM_URL = 'https://www.instagram.com';

// Session cookies for Instagram multi-account
const SESSION_COOKIES = [
  'sessionid',
  'csrftoken',
  'ds_user_id',
  'mid',
  'ig_did',
  'ig_nrcb',
  'rur'
];

// ============================================
// API HELPERS
// ============================================

/**
 * Get the API base URL (production or dev)
 */
async function getApiUrl() {
  // Check if we have a custom URL stored
  const { customApiUrl } = await chrome.storage.local.get('customApiUrl');
  return customApiUrl || CONFIG.APP_URL;
}

/**
 * Get auth token for API calls
 */
async function getAuthToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken;
}

/**
 * Make authenticated API call to SOS Prospection
 */
async function apiCall(endpoint, method = 'GET', body = null) {
  const baseUrl = await getApiUrl();
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT);

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Non authentifié - connectez-vous à l\'app SOS Prospection');
      }
      throw new Error(errorData.error?.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Requête timeout - vérifiez votre connexion');
    }
    throw error;
  }
}

// ============================================
// PROSPECT IMPORT
// ============================================

/**
 * Import a single prospect to the app
 */
async function importProspect(platform, profile, posts = []) {
  console.log('[SOS] importProspect called with:', { platform, profile: JSON.stringify(profile).substring(0, 200), posts: posts.length });

  // First, store locally
  const { importedProspects = [] } = await chrome.storage.local.get('importedProspects');
  console.log('[SOS] Current importedProspects count:', importedProspects.length);

  const prospectData = {
    id: `${platform}_${profile.username || profile.fullName}_${Date.now()}`,
    platform,
    ...profile,
    posts,
    importedAt: new Date().toISOString(),
    synced: false // Will be updated if sync succeeds
  };

  // Check for duplicates
  const existingIndex = importedProspects.findIndex(p =>
    p.platform === platform && p.username === profile.username
  );

  if (existingIndex >= 0) {
    // Keep the existing synced status if updating
    prospectData.synced = importedProspects[existingIndex].synced || false;
    importedProspects[existingIndex] = prospectData;
  } else {
    importedProspects.push(prospectData);
  }

  // Limit to last 100 imports to avoid storage bloat
  const limitedProspects = importedProspects.slice(-100);
  await chrome.storage.local.set({ importedProspects: limitedProspects });
  console.log('[SOS] Saved to storage. New count:', limitedProspects.length, 'Last item:', JSON.stringify(limitedProspects[limitedProspects.length - 1]).substring(0, 200));

  // Then try to sync with backend
  try {
    console.log('[SOS] Attempting API sync to /api/prospects/extension/import');
    const result = await apiCall('/api/prospects/extension/import', 'POST', {
      platform,
      profile,
      posts
    });
    console.log('[SOS] API sync result:', JSON.stringify(result).substring(0, 200));

    // Update synced status
    prospectData.synced = true;
    const updatedIndex = limitedProspects.findIndex(p => p.id === prospectData.id);
    if (updatedIndex >= 0) {
      limitedProspects[updatedIndex].synced = true;
      await chrome.storage.local.set({ importedProspects: limitedProspects });
    }

    return {
      success: true,
      prospectId: result.data?.prospectId || prospectData.id,
      synced: true
    };
  } catch (error) {
    console.error('[SOS] Backend sync FAILED:', error.message);
    return {
      success: true,
      prospectId: prospectData.id,
      synced: false,
      warning: 'Stocké localement - synchronisation en attente'
    };
  }
}

/**
 * Import multiple prospects (bulk)
 */
async function importProspects(platform, profiles) {
  sosLog(' Bulk importing prospects:', profiles.length);

  const results = [];

  for (const profile of profiles) {
    try {
      const result = await importProspect(platform, profile, []);
      results.push({ ...result, profile });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        profile
      });
    }
  }

  const successful = results.filter(r => r.success).length;

  return {
    success: true,
    imported: successful,
    failed: results.length - successful,
    total: results.length,
    results
  };
}

// ============================================
// DM GENERATION VIA APP
// ============================================

/**
 * Generate DM via app API
 */
async function generateDM(platform, prospect) {
  sosLog(' Generating DM for:', { platform, prospect: prospect.username });

  try {
    const result = await apiCall('/api/sequence/first-dm', 'POST', {
      prospect: {
        ...prospect,
        platform
      }
    });

    if (result.data?.dm?.message) {
      return {
        success: true,
        message: result.data.dm.message,
        metadata: result.data.dm
      };
    }

    throw new Error('Réponse invalide de l\'API');
  } catch (error) {
    sosError(' DM generation failed:', error);
    throw new Error('Échec de la génération: ' + error.message);
  }
}

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

/**
 * Check if a name matches a known prospect in local storage
 */
async function checkProspect(name, platform) {
  if (!name) return { found: false };

  try {
    // Get locally stored prospects
    const result = await chrome.storage.local.get(['localProspects', 'recentImports']);
    const prospects = result.localProspects || [];
    const recentImports = result.recentImports || [];

    // Combine and search
    const allProspects = [...prospects, ...recentImports];

    // Normalize name for comparison
    const normalizedName = name.toLowerCase().trim();

    const found = allProspects.find(p => {
      const prospectName = (p.fullName || p.username || '').toLowerCase().trim();
      return prospectName === normalizedName ||
             prospectName.includes(normalizedName) ||
             normalizedName.includes(prospectName);
    });

    if (found) {
      return {
        found: true,
        prospect: found
      };
    }

    return { found: false };
  } catch (error) {
    sosError('checkProspect failed:', error);
    return { found: false };
  }
}

/**
 * Analyze a conversation and suggest next response
 */
async function analyzeConversation(platform, prospect, messages) {
  sosLog('Analyzing conversation:', { platform, prospect: prospect?.fullName, messageCount: messages?.length });

  try {
    // Try API call first
    const result = await apiCall('/api/conversations/analyze', 'POST', {
      platform,
      prospect,
      messages
    });

    if (result.data) {
      return {
        success: true,
        temperature: result.data.temperature || 'neutral',
        insight: result.data.insight || 'Analyse terminée',
        suggestion: result.data.suggestion || null,
        nextAction: result.data.nextAction || null
      };
    }

    throw new Error('Réponse invalide');
  } catch (error) {
    sosError('analyzeConversation API failed:', error);

    // Fallback: generate local analysis
    return generateLocalConversationAnalysis(messages, prospect);
  }
}

/**
 * Generate a local conversation analysis when API is unavailable
 */
function generateLocalConversationAnalysis(messages, prospect) {
  if (!messages || messages.length === 0) {
    return {
      success: true,
      temperature: 'neutral',
      insight: 'Aucun message à analyser.',
      suggestion: null
    };
  }

  // Get last message from them (not from me)
  const theirMessages = messages.filter(m => !m.isMe);
  const lastTheirMessage = theirMessages[theirMessages.length - 1];

  if (!lastTheirMessage) {
    return {
      success: true,
      temperature: 'neutral',
      insight: 'En attente de leur réponse.',
      suggestion: null
    };
  }

  const text = lastTheirMessage.text.toLowerCase();
  const firstName = (prospect?.fullName || '').split(' ')[0];

  // Simple sentiment analysis
  let temperature = 'neutral';
  let insight = '';
  let suggestion = null;

  // Check for positive signals
  const positiveWords = ['merci', 'intéressant', 'super', 'génial', 'curieux', 'intéressé', 'volontiers', 'oui', 'bien sûr', 'avec plaisir'];
  const negativeWords = ['non merci', 'pas intéressé', 'pas le moment', 'pas besoin', 'désabonner', 'stop'];
  const questionWords = ['comment', 'pourquoi', 'quand', 'quel', 'quelle', '?'];

  const hasPositive = positiveWords.some(w => text.includes(w));
  const hasNegative = negativeWords.some(w => text.includes(w));
  const hasQuestion = questionWords.some(w => text.includes(w));

  if (hasNegative) {
    temperature = 'cold';
    insight = 'Réponse négative détectée. Mieux vaut ne pas insister.';
    suggestion = {
      message: 'Pas de souci, merci pour votre retour. Bonne continuation !',
      reason: 'Réponse courtoise pour clôturer positivement'
    };
  } else if (hasPositive && hasQuestion) {
    temperature = 'hot';
    insight = 'Signal très positif ! Elle pose des questions et montre de l\'intérêt.';
    suggestion = {
      message: firstName ?
        `Avec plaisir ${firstName} ! Je serais ravi d'en discuter plus en détail. Seriez-vous disponible pour un échange de 15 minutes cette semaine ?` :
        'Avec plaisir ! Je serais ravi d\'en discuter. Seriez-vous disponible pour un échange de 15 minutes ?',
      reason: 'Lead chaud - c\'est le moment de proposer un échange'
    };
  } else if (hasPositive) {
    temperature = 'warm';
    insight = 'Réponse positive, mais pas encore d\'engagement fort.';
    suggestion = {
      message: firstName ?
        `Merci ${firstName} ! Au fait, comment gérez-vous actuellement ce sujet dans votre activité ?` :
        'Merci ! Au fait, comment gérez-vous actuellement ce sujet dans votre activité ?',
      reason: 'Continuez à creuser pour comprendre ses besoins'
    };
  } else if (hasQuestion) {
    temperature = 'warm';
    insight = 'Elle pose des questions - signe de curiosité.';
    suggestion = {
      message: 'Bonne question ! En fait, l\'approche dépend vraiment du contexte. Quel est votre principal défi actuellement sur ce sujet ?',
      reason: 'Les questions montrent un intérêt - répondez et engagez'
    };
  } else {
    temperature = 'neutral';
    insight = 'Réponse neutre. Essayez de relancer avec une question.';
    suggestion = {
      message: firstName ?
        `${firstName}, j'ai vu que vous travaillez dans ce domaine. Quel est votre plus grand défi en ce moment ?` :
        'J\'ai vu votre profil et je suis curieux : quel est votre plus grand défi en ce moment dans votre activité ?',
      reason: 'Une question ouverte peut relancer la conversation'
    };
  }

  return {
    success: true,
    temperature,
    insight,
    suggestion
  };
}

// ============================================
// STRATEGIC COMMENTS
// ============================================

/**
 * Generate a strategic comment for a LinkedIn post
 */
async function generateStrategicComment(platform, post, commentType = 'deepen') {
  sosLog('Generating strategic comment:', { platform, author: post?.authorName, type: commentType });

  try {
    // Try API call first
    const result = await apiCall('/api/comments/generate', 'POST', {
      platform,
      post,
      commentType
    });

    if (result.data) {
      return {
        success: true,
        comment: result.data.comment || '',
        angle: result.data.angle || null,
        strategy: result.data.strategy || null,
        icpMatch: result.data.icpMatch || false
      };
    }

    throw new Error('Réponse invalide');
  } catch (error) {
    sosError('generateStrategicComment API failed:', error);

    // Fallback: generate local comment suggestion
    return generateLocalComment(post, commentType);
  }
}

/**
 * Generate comment based on selected type (for fallback)
 */
function generateCommentByType(firstName, commentType) {
  switch (commentType) {
    case 'challenge':
      return {
        success: true,
        comment: firstName
          ? `Intéressant ${firstName}, mais je me demande si on ne sous-estime pas l'importance du contexte dans cette approche. Dans certains cas, l'inverse pourrait aussi fonctionner. Qu'en penses-tu ?`
          : `Point de vue intéressant, mais je me demande si cette approche fonctionne dans tous les contextes. Parfois, l'inverse peut aussi être vrai. Quel est ton retour d'expérience là-dessus ?`,
        angle: 'challenger avec respect',
        strategy: 'Nuancer pour créer un débat constructif',
        icpMatch: false
      };
    case 'testimonial':
      return {
        success: true,
        comment: firstName
          ? `Ça me parle ${firstName} ! J'ai vécu une situation similaire il y a quelques mois. Ce qui m'a le plus marqué, c'est l'importance de rester flexible dans l'exécution. Tu as ressenti la même chose ?`
          : `Ça résonne vraiment avec mon expérience. J'ai traversé quelque chose de similaire récemment et ça m'a appris l'importance de l'adaptabilité. C'est souvent là que tout se joue.`,
        angle: 'témoignage personnel',
        strategy: 'Créer une connexion par le partage d\'expérience',
        icpMatch: false
      };
    case 'resource':
      return {
        success: true,
        comment: firstName
          ? `Merci ${firstName} pour cette réflexion ! Si le sujet t'intéresse, je recommande le livre "Deep Work" de Cal Newport qui approfondit vraiment cette thématique. Tu connais ?`
          : `Réflexion pertinente ! Pour aller plus loin sur ce sujet, le livre "Atomic Habits" de James Clear apporte un éclairage complémentaire très concret. Une vraie pépite.`,
        angle: 'partage de ressource',
        strategy: 'Apporter de la valeur avec une ressource concrète',
        icpMatch: false
      };
    default:
      return {
        success: true,
        comment: firstName
          ? `Merci ${firstName} pour ce partage enrichissant. Cela me fait penser à une situation similaire que j'ai vécue. Quel a été ton déclic pour aborder ce sujet ?`
          : `Réflexion intéressante qui résonne avec mon expérience. La nuance est souvent dans les détails d'exécution. Qu'est-ce qui t'a le plus surpris ?`,
        angle: 'apport de valeur',
        strategy: 'Commentaire engageant et pertinent',
        icpMatch: false
      };
  }
}

/**
 * Generate a local comment suggestion when API is unavailable
 */
function generateLocalComment(post, commentType = 'deepen') {
  const authorName = post?.authorName || '';
  const firstName = authorName.split(' ')[0];

  // If user selected a specific comment type, use it directly
  if (commentType && commentType !== 'deepen') {
    return generateCommentByType(firstName, commentType);
  }

  const content = (post?.content || '').toLowerCase();

  // Analyze content for themes
  let angle = 'apport de valeur';
  let comment = '';

  // Check for different themes
  const themes = {
    experience: ['partage', 'retour', 'expérience', 'appris', 'leçon', 'erreur'],
    advice: ['conseil', 'astuce', 'tips', 'recommand', 'suggère', 'devriez'],
    question: ['?', 'avis', 'pensez', 'comment faites'],
    achievement: ['fier', 'annonce', 'nouvelle', 'lancement', 'réussi', 'atteint'],
    insight: ['observation', 'constat', 'tendance', 'évolution', 'changement']
  };

  let detectedTheme = 'general';
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(k => content.includes(k))) {
      detectedTheme = theme;
      break;
    }
  }

  switch (detectedTheme) {
    case 'experience':
      angle = 'partage d\'expérience similaire';
      comment = firstName
        ? `Merci ${firstName} pour ce retour d'expérience ! J'ai vécu quelque chose de similaire récemment et ça m'a permis de confirmer l'importance de ce que tu décris. Quel a été ton plus grand apprentissage ?`
        : `Retour d'expérience précieux qui résonne avec ce que j'observe dans mon domaine. La clé semble être dans l'exécution. Comment as-tu géré les obstacles ?`;
      break;
    case 'advice':
      angle = 'enrichissement du conseil';
      comment = firstName
        ? `Excellent conseil ${firstName} ! J'ajouterais qu'un élément souvent sous-estimé est la régularité dans l'application. C'est ce qui fait la différence sur le long terme.`
        : `Point très pertinent. Dans mon expérience, combiner cette approche avec une vision long terme amplifie vraiment les résultats.`;
      break;
    case 'question':
      angle = 'réponse expert';
      comment = `Excellente question ! De mon côté, j'ai observé que la clé réside souvent dans la simplicité d'exécution plutôt que dans la complexité de la stratégie. Et toi, quelle approche privilégies-tu ?`;
      break;
    case 'achievement':
      angle = 'félicitations + connexion';
      comment = firstName
        ? `Bravo ${firstName} pour cette belle réussite ! Ce genre de parcours inspire. Quelle a été l'étape la plus décisive selon toi ?`
        : `Félicitations pour cette réussite ! Le chemin compte autant que la destination. Quelle sera la prochaine étape ?`;
      break;
    case 'insight':
      angle = 'enrichissement du constat';
      comment = `Observation très juste. J'observe la même tendance dans mon secteur. Ce qui me frappe, c'est l'accélération de ce phénomène ces derniers mois.`;
      break;
    default:
      angle = 'apport de valeur';
      comment = firstName
        ? `Merci ${firstName} pour ce partage enrichissant. Cela me fait penser à une situation similaire que j'ai vécue. Quel a été ton déclic pour aborder ce sujet ?`
        : `Réflexion intéressante qui résonne avec mon expérience. La nuance est souvent dans les détails d'exécution. Qu'est-ce qui t'a le plus surpris ?`;
  }

  return {
    success: true,
    comment,
    angle,
    strategy: 'Un bon commentaire = visibilité + valeur. Tu te fais remarquer avant le DM.',
    icpMatch: false
  };
}

/**
 * Track a comment interaction
 */
async function trackComment(platform, post, comment, icpMatch) {
  sosLog('Tracking comment:', { platform, author: post?.authorName, icpMatch });

  try {
    // Try API call first
    const result = await apiCall('/api/comments/track', 'POST', {
      platform,
      post,
      comment,
      icpMatch,
      commentedAt: new Date().toISOString()
    });

    if (result.success) {
      return { success: true };
    }

    throw new Error('Tracking failed');
  } catch (error) {
    sosError('trackComment API failed:', error);

    // Fallback: store locally
    const { trackedComments = [] } = await chrome.storage.local.get('trackedComments');
    trackedComments.push({
      platform,
      authorName: post?.authorName || '',
      authorHeadline: post?.authorHeadline || '',
      postUrl: post?.url || '',
      comment,
      icpMatch,
      commentedAt: new Date().toISOString()
    });

    // Keep only last 50 comments
    if (trackedComments.length > 50) {
      trackedComments.splice(0, trackedComments.length - 50);
    }

    await chrome.storage.local.set({ trackedComments });

    return { success: true, storedLocally: true };
  }
}

// ============================================
// SMART PASTE ANALYSIS
// ============================================

/**
 * Analyze pasted content using AI to extract profile data and signals
 */
async function analyzeProspectContent(platform, content, username) {
  console.log('[SOS] analyzeProspectContent called:', { platform, contentLength: content?.length, username });

  try {
    const baseUrl = await getApiUrl();
    console.log('[SOS] API URL:', baseUrl);

    const result = await apiCall('/api/prospects/analyze-paste', 'POST', {
      platform,
      content,
      username
    });

    console.log('[SOS] API response:', JSON.stringify(result, null, 2));

    if (result.data) {
      const response = {
        success: true,
        profile: result.data.profile || {},
        signals: result.data.signals || [],
        angles: result.data.angles || []
      };
      console.log('[SOS] Returning signals:', response.signals.length, 'angles:', response.angles.length);
      return response;
    }

    console.error('[SOS] No data in response:', result);
    throw new Error('Réponse invalide de l\'API');
  } catch (error) {
    console.error('[SOS] analyzeProspectContent error:', error.message, error);
    // Fallback to basic parsing
    return {
      success: true,
      profile: basicParseContent(content),
      signals: [],
      angles: [],
      fallback: true
    };
  }
}

/**
 * Basic content parsing as fallback when API is unavailable
 */
function basicParseContent(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const profile = {
    fullName: '',
    headline: '',
    company: '',
    bio: ''
  };

  // First line is often the name
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 60 && !firstLine.includes('http') && !firstLine.includes('@')) {
      profile.fullName = firstLine;
    }
  }

  // Look for patterns
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    // Headline patterns
    if (!profile.headline && (lower.includes(' chez ') || lower.includes(' at ') || lower.includes(' | '))) {
      profile.headline = line;
      // Extract company
      const match = line.match(/(?:chez|at|@)\s+(.+?)(?:\s*[|·•]|$)/i);
      if (match) profile.company = match[1].trim();
    }

    // Bio/About section
    if (lower.includes('à propos') || lower === 'about') {
      profile.bio = lines.slice(i + 1, i + 5).join(' ').substring(0, 500);
    }

    // Followers
    const followersMatch = line.match(/([\d,\.]+[kmKM]?)\s*(?:followers|abonnés)/i);
    if (followersMatch) {
      profile.followers = followersMatch[1];
    }
  }

  return profile;
}

// ============================================
// INSTAGRAM SESSION MANAGEMENT
// ============================================

/**
 * Get all Instagram cookies
 */
async function getInstagramCookies() {
  const cookies = await chrome.cookies.getAll({ domain: INSTAGRAM_DOMAIN });
  return cookies;
}

/**
 * Save current Instagram session
 */
async function saveCurrentSession(accountName) {
  const cookies = await getInstagramCookies();

  if (!cookies || cookies.length === 0) {
    throw new Error('Aucune session Instagram détectée. Connectez-vous d\'abord à Instagram.');
  }

  const sessionCookie = cookies.find(c => c.name === 'sessionid');
  if (!sessionCookie || !sessionCookie.value) {
    throw new Error('Vous n\'êtes pas connecté à Instagram. Connectez-vous d\'abord.');
  }

  const userIdCookie = cookies.find(c => c.name === 'ds_user_id');
  const userId = userIdCookie?.value || 'unknown';

  const session = {
    id: `session_${Date.now()}`,
    name: accountName,
    userId: userId,
    cookies: cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate
    })),
    savedAt: new Date().toISOString()
  };

  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const existingIndex = sessions.findIndex(s => s.userId === userId);

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  await chrome.storage.local.set({ sessions });
  return session;
}

/**
 * Load an Instagram session
 */
async function loadSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error('Session introuvable');
  }

  // Remove current cookies
  const currentCookies = await getInstagramCookies();
  for (const cookie of currentCookies) {
    await chrome.cookies.remove({
      url: `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
      name: cookie.name
    });
  }

  // Restore session cookies
  for (const cookie of session.cookies) {
    try {
      await chrome.cookies.set({
        url: INSTAGRAM_URL,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite || 'no_restriction',
        expirationDate: cookie.expirationDate
      });
    } catch (e) {
      sosWarn(`Error restoring cookie ${cookie.name}:`, e);
    }
  }

  await chrome.storage.local.set({ activeSessionId: sessionId });
  return session;
}

/**
 * Delete an Instagram session
 */
async function deleteSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ sessions: updatedSessions });

  const { activeSessionId } = await chrome.storage.local.get('activeSessionId');
  if (activeSessionId === sessionId) {
    await chrome.storage.local.remove('activeSessionId');
  }
}

/**
 * Get all saved sessions
 */
async function getSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const { activeSessionId } = await chrome.storage.local.get('activeSessionId');
  return { sessions, activeSessionId };
}

/**
 * Detect current Instagram account
 */
async function detectCurrentAccount() {
  const cookies = await getInstagramCookies();
  const sessionCookie = cookies.find(c => c.name === 'sessionid');
  const userIdCookie = cookies.find(c => c.name === 'ds_user_id');

  return {
    isLoggedIn: !!sessionCookie?.value,
    userId: userIdCookie?.value || null
  };
}

/**
 * Reload Instagram tabs
 */
async function reloadInstagramTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
  for (const tab of tabs) {
    await chrome.tabs.reload(tab.id);
  }
}

// ============================================
// AUTH TOKEN MANAGEMENT
// ============================================

/**
 * Save auth token for API calls
 */
async function saveAuthToken(token) {
  await chrome.storage.local.set({ authToken: token });
  return { success: true };
}

/**
 * Get auth status
 */
async function getAuthStatus() {
  const token = await getAuthToken();
  return {
    isAuthenticated: !!token,
    hasToken: !!token
  };
}

// ============================================
// LEGACY LINKEDIN SUPPORT
// ============================================

/**
 * Import LinkedIn profiles (legacy support)
 */
async function importLinkedInProfiles(profiles) {
  return importProspects('linkedin', profiles);
}

/**
 * Get stored LinkedIn profiles
 */
async function getLinkedInProfiles() {
  const { importedProspects = [] } = await chrome.storage.local.get('importedProspects');
  return importedProspects.filter(p => p.platform === 'linkedin');
}

// ============================================
// MESSAGE HANDLER
// ============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[SOS] Message received:', request.action, request);

  const handleAsync = async () => {
    try {
      switch (request.action) {
        // Prospect import
        case 'importProspect':
          return await importProspect(request.platform, request.profile, request.posts);

        case 'importProspects':
          return await importProspects(request.platform, request.profiles);

        // DM generation
        case 'generateDM':
          return await generateDM(request.platform, request.prospect);

        // Smart paste analysis
        case 'analyzeProspect':
          return await analyzeProspectContent(request.platform, request.content, request.username);

        // Instagram sessions
        case 'getSessions':
          return await getSessions();

        case 'saveSession':
          return await saveCurrentSession(request.accountName);

        case 'loadSession':
          const session = await loadSession(request.sessionId);
          await reloadInstagramTab();
          return session;

        case 'deleteSession':
          await deleteSession(request.sessionId);
          return { success: true };

        case 'detectAccount':
          return await detectCurrentAccount();

        // Auth
        case 'saveAuthToken':
          return await saveAuthToken(request.token);

        case 'getAuthStatus':
          return await getAuthStatus();

        // Legacy LinkedIn support
        case 'importLinkedInProfiles':
          return await importLinkedInProfiles(request.profiles);

        case 'getLinkedInProfiles':
          return await getLinkedInProfiles();

        // Conversation management
        case 'checkProspect':
          return await checkProspect(request.name, request.platform);

        case 'analyzeConversation':
          return await analyzeConversation(request.platform, request.prospect, request.messages);

        // Strategic comment generation
        case 'generateStrategicComment':
          return await generateStrategicComment(request.platform, request.post, request.commentType);

        // Track comment interaction
        case 'trackComment':
          return await trackComment(request.platform, request.post, request.comment, request.icpMatch);

        default:
          throw new Error('Action inconnue: ' + request.action);
      }
    } catch (error) {
      sosError(' Error handling message:', error);
      return { error: error.message };
    }
  };

  handleAsync().then(sendResponse);
  return true;
});

// ============================================
// EXTERNAL MESSAGE HANDLER (from app)
// ============================================

/**
 * Listen for messages from the SOS Prospection app
 * This allows the app to send the auth token to the extension
 */
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  // Verify the sender is from our app domain (strict origin check)
  const allowedOrigins = [
    'https://sosprospection.com'
  ];

  let senderOrigin = null;
  try {
    senderOrigin = new URL(sender.url).origin;
  } catch {
    sosWarn(' Invalid sender URL:', sender.url);
    sendResponse({ error: 'Unauthorized origin' });
    return;
  }

  if (!allowedOrigins.includes(senderOrigin)) {
    sosWarn(' Rejected external message from:', senderOrigin);
    sendResponse({ error: 'Unauthorized origin' });
    return;
  }

  sosLog(' Received external message:', request.action);

  if (request.action === 'setAuthToken') {
    saveAuthToken(request.token)
      .then(() => {
        sosLog(' Auth token saved from app');
        sendResponse({ success: true });
      })
      .catch(err => {
        sosError(' Failed to save auth token:', err);
        sendResponse({ error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'getAuthStatus') {
    getAuthStatus()
      .then(status => sendResponse(status))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.action === 'clearAuthToken') {
    chrome.storage.local.remove('authToken', () => {
      sosLog(' Auth token cleared');
      sendResponse({ success: true });
    });
    return true;
  }

  sendResponse({ error: 'Unknown action' });
});

// ============================================
// STARTUP
// ============================================

console.log('[SOS] ====== SERVICE WORKER READY ======');
console.log('[SOS] Extension loaded v3.1 - Multi-platform support');
