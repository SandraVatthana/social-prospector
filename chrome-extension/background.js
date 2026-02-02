/**
 * SOS Prospection - Multi-Platform Extension
 * Background Service Worker
 */

console.log('[SOS] ====== SERVICE WORKER STARTING ======');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  APP_URL: 'https://sosprospection.com',
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
  sosLog(' Importing prospect:', { platform, profile });

  // First, store locally
  const { importedProspects = [] } = await chrome.storage.local.get('importedProspects');

  const prospectData = {
    id: `${platform}_${profile.username || profile.fullName}_${Date.now()}`,
    platform,
    ...profile,
    posts,
    importedAt: new Date().toISOString()
  };

  // Check for duplicates
  const existingIndex = importedProspects.findIndex(p =>
    p.platform === platform && p.username === profile.username
  );

  if (existingIndex >= 0) {
    importedProspects[existingIndex] = prospectData;
  } else {
    importedProspects.push(prospectData);
  }

  await chrome.storage.local.set({ importedProspects });

  // Then try to sync with backend
  try {
    const result = await apiCall('/api/prospects/extension/import', 'POST', {
      platform,
      profile,
      posts
    });

    return {
      success: true,
      prospectId: result.data?.prospectId || prospectData.id,
      synced: true
    };
  } catch (error) {
    sosWarn(' Backend sync failed, stored locally:', error.message);
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
