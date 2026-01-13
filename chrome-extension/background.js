/**
 * Social Prospector - Multi-Account Extension
 * Background Service Worker
 *
 * Gère les sessions Instagram (cookies) pour le multi-compte
 */

const INSTAGRAM_DOMAIN = '.instagram.com';
const INSTAGRAM_URL = 'https://www.instagram.com';
const LINKEDIN_DOMAIN = '.linkedin.com';

// URL du backend Social Prospector (Netlify Functions)
const BACKEND_URL = 'https://sosprospection.com';

// Cookies Instagram importants pour la session
const SESSION_COOKIES = [
  'sessionid',
  'csrftoken',
  'ds_user_id',
  'mid',
  'ig_did',
  'ig_nrcb',
  'rur'
];

/**
 * Récupérer tous les cookies Instagram actuels
 */
async function getInstagramCookies() {
  const cookies = await chrome.cookies.getAll({ domain: INSTAGRAM_DOMAIN });
  return cookies;
}

/**
 * Sauvegarder la session actuelle
 */
async function saveCurrentSession(accountName) {
  const cookies = await getInstagramCookies();

  if (!cookies || cookies.length === 0) {
    throw new Error('Aucune session Instagram détectée. Connectez-vous d\'abord à Instagram.');
  }

  // Vérifier qu'on a bien un sessionid (= connecté)
  const sessionCookie = cookies.find(c => c.name === 'sessionid');
  if (!sessionCookie || !sessionCookie.value) {
    throw new Error('Vous n\'êtes pas connecté à Instagram. Connectez-vous d\'abord.');
  }

  // Récupérer le ds_user_id pour identifier le compte
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

  // Récupérer les sessions existantes
  const { sessions = [] } = await chrome.storage.local.get('sessions');

  // Vérifier si ce compte existe déjà (même userId)
  const existingIndex = sessions.findIndex(s => s.userId === userId);

  if (existingIndex >= 0) {
    // Mettre à jour la session existante
    sessions[existingIndex] = session;
  } else {
    // Ajouter la nouvelle session
    sessions.push(session);
  }

  await chrome.storage.local.set({ sessions });

  return session;
}

/**
 * Charger une session (remplacer les cookies)
 */
async function loadSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    throw new Error('Session introuvable');
  }

  // Supprimer tous les cookies Instagram actuels
  const currentCookies = await getInstagramCookies();
  for (const cookie of currentCookies) {
    await chrome.cookies.remove({
      url: `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`,
      name: cookie.name
    });
  }

  // Restaurer les cookies de la session
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
      console.warn(`Erreur lors de la restauration du cookie ${cookie.name}:`, e);
    }
  }

  // Sauvegarder la session active
  await chrome.storage.local.set({ activeSessionId: sessionId });

  return session;
}

/**
 * Supprimer une session
 */
async function deleteSession(sessionId) {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const updatedSessions = sessions.filter(s => s.id !== sessionId);
  await chrome.storage.local.set({ sessions: updatedSessions });

  // Si c'était la session active, la retirer
  const { activeSessionId } = await chrome.storage.local.get('activeSessionId');
  if (activeSessionId === sessionId) {
    await chrome.storage.local.remove('activeSessionId');
  }
}

/**
 * Récupérer toutes les sessions
 */
async function getSessions() {
  const { sessions = [] } = await chrome.storage.local.get('sessions');
  const { activeSessionId } = await chrome.storage.local.get('activeSessionId');

  return {
    sessions,
    activeSessionId
  };
}

/**
 * Détecter le compte actuellement connecté
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
 * Recharger l'onglet Instagram actif
 */
async function reloadInstagramTab() {
  const tabs = await chrome.tabs.query({ url: '*://*.instagram.com/*' });
  for (const tab of tabs) {
    await chrome.tabs.reload(tab.id);
  }
}


/**
 * Importer des profils LinkedIn vers le backend
 */
async function importLinkedInProfiles(profiles) {
  if (!profiles || profiles.length === 0) {
    throw new Error('Aucun profil a importer');
  }

  const { linkedinProfiles = [] } = await chrome.storage.local.get('linkedinProfiles');
  const existingUrls = new Set(linkedinProfiles.map(p => p.profileUrl));
  const newProfiles = profiles.filter(p => !existingUrls.has(p.profileUrl));

  const updatedProfiles = [...linkedinProfiles, ...newProfiles.map(p => ({
    ...p,
    importedAt: new Date().toISOString(),
    source: 'linkedin'
  }))];

  await chrome.storage.local.set({ linkedinProfiles: updatedProfiles });

  try {
    const response = await fetch(`${BACKEND_URL}/api/prospects/linkedin/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profiles: newProfiles,
        importedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.warn('Erreur backend, profils stockes localement uniquement');
    }
  } catch (e) {
    console.warn('Backend non disponible, profils stockes localement:', e.message);
  }

  return {
    success: true,
    imported: newProfiles.length,
    duplicates: profiles.length - newProfiles.length,
    total: updatedProfiles.length
  };
}

/**
 * Recuperer les profils LinkedIn stockes
 */
async function getLinkedInProfiles() {
  const { linkedinProfiles = [] } = await chrome.storage.local.get('linkedinProfiles');
  return linkedinProfiles;
}

/**
 * Supprimer un profil LinkedIn
 */
async function deleteLinkedInProfile(profileUrl) {
  const { linkedinProfiles = [] } = await chrome.storage.local.get('linkedinProfiles');
  const updatedProfiles = linkedinProfiles.filter(p => p.profileUrl !== profileUrl);
  await chrome.storage.local.set({ linkedinProfiles: updatedProfiles });
  return { success: true, remaining: updatedProfiles.length };
}

// Écouter les messages du popup et des content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    try {
      switch (request.action) {
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

        case 'importLinkedInProfiles':
          return await importLinkedInProfiles(request.profiles);

        case 'getLinkedInProfiles':
          return await getLinkedInProfiles();

        case 'deleteLinkedInProfile':
          return await deleteLinkedInProfile(request.profileUrl);

        default:
          throw new Error('Action inconnue: ' + request.action);
      }
    } catch (error) {
      return { error: error.message };
    }
  };

  handleAsync().then(sendResponse);
  return true; // Indique une réponse asynchrone
});

// Log au démarrage
console.log('Social Prospector Multi-Account extension loaded (Instagram + LinkedIn)');
