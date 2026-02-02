/**
 * SOS Prospection - Multi-Platform Extension
 * Popup Script
 */

const DEBUG = false;
function sosLog(...args) { if (DEBUG) console.log('[SOS Popup]', ...args); }
function sosError(...args) { if (DEBUG) console.error('[SOS Popup]', ...args); }

// Éléments DOM - Instagram
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const accountsList = document.getElementById('accountsList');
const emptyState = document.getElementById('emptyState');
const addAccountBtn = document.getElementById('addAccountBtn');
const addModal = document.getElementById('addModal');
const accountNameInput = document.getElementById('accountNameInput');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const confirmAddBtn = document.getElementById('confirmAddBtn');

// Éléments DOM - Tabs
const platformTabs = document.querySelectorAll('.platform-tab');
const platformContents = document.querySelectorAll('.platform-content');

// Éléments DOM - Settings
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');

// Éléments DOM - App Auth
const appAuthDot = document.getElementById('appAuthDot');
const appAuthText = document.getElementById('appAuthText');
const openAppBtn = document.getElementById('openAppBtn');

// Éléments DOM - Privacy
const privacyLink = document.getElementById('privacyLink');

// Éléments DOM - Recent Imports
const instagramImportsList = document.getElementById('instagramImportsList');
const linkedinImportsList = document.getElementById('linkedinImportsList');
const tiktokImportsList = document.getElementById('tiktokImportsList');
const instagramEmptyImports = document.getElementById('instagramEmptyImports');
const linkedinEmptyImports = document.getElementById('linkedinEmptyImports');
const tiktokEmptyImports = document.getElementById('tiktokEmptyImports');

// Éléments DOM - Sync Warning
const syncWarningBanner = document.getElementById('syncWarningBanner');
const connectAppBtn = document.getElementById('connectAppBtn');

// Configuration
const APP_URL = 'https://sosprospection.com';
const MAX_RECENT_IMPORTS = 5;

// État
let currentSessions = [];
let activeSessionId = null;
let isLoggedIn = false;
let isAppAuthenticated = false;

/**
 * Initialiser le popup
 */
async function init() {
  await checkCurrentStatus();
  await loadSessions();
  await checkAppAuthStatus();
  await loadRecentImports();
  setupEventListeners();
}

/**
 * Vérifier le statut de connexion Instagram
 */
async function checkCurrentStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'detectAccount' });

    if (response.error) {
      throw new Error(response.error);
    }

    isLoggedIn = response.isLoggedIn;

    if (isLoggedIn) {
      statusDot.classList.add('connected');
      statusDot.classList.remove('disconnected');

      // Chercher si ce compte est dans nos sessions
      const { sessions = [] } = await chrome.storage.local.get('sessions');
      const matchingSession = sessions.find(s => s.userId === response.userId);

      if (matchingSession) {
        statusText.textContent = `Connecte : ${matchingSession.name}`;
      } else {
        statusText.textContent = 'Connecte (compte non sauvegarde)';
      }
    } else {
      statusDot.classList.remove('connected');
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Non connecte a Instagram';
    }

    // Activer/désactiver le bouton d'ajout
    addAccountBtn.disabled = !isLoggedIn;
  } catch (error) {
    sosError('Erreur lors de la verification du statut:', error);
    statusText.textContent = 'Erreur de verification';
  }
}

/**
 * Vérifier le statut de connexion à l'app SOS Prospection
 */
async function checkAppAuthStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getAuthStatus' });

    isAppAuthenticated = response.isAuthenticated;

    if (isAppAuthenticated) {
      appAuthDot.classList.add('connected');
      appAuthDot.classList.remove('disconnected');
      appAuthText.textContent = 'Connecte a l\'app';
      openAppBtn.textContent = 'Ouvrir l\'app';
      // Hide sync warning
      if (syncWarningBanner) {
        syncWarningBanner.style.display = 'none';
      }
    } else {
      appAuthDot.classList.remove('connected');
      appAuthDot.classList.add('disconnected');
      appAuthText.textContent = 'Non connecte';
      openAppBtn.textContent = 'Se connecter';
      // Show sync warning
      if (syncWarningBanner) {
        syncWarningBanner.style.display = 'flex';
      }
    }
  } catch (error) {
    sosError('Erreur lors de la verification de l\'auth app:', error);
    appAuthText.textContent = 'Erreur de verification';
  }
}

/**
 * Charger les prospects importés récemment
 */
async function loadRecentImports() {
  try {
    const { importedProspects = [] } = await chrome.storage.local.get('importedProspects');

    // Trier par date d'import (plus récent en premier)
    const sortedProspects = importedProspects
      .sort((a, b) => new Date(b.importedAt) - new Date(a.importedAt));

    // Filtrer par plateforme et limiter
    const instagramImports = sortedProspects
      .filter(p => p.platform === 'instagram')
      .slice(0, MAX_RECENT_IMPORTS);

    const linkedinImports = sortedProspects
      .filter(p => p.platform === 'linkedin')
      .slice(0, MAX_RECENT_IMPORTS);

    const tiktokImports = sortedProspects
      .filter(p => p.platform === 'tiktok')
      .slice(0, MAX_RECENT_IMPORTS);

    // Afficher
    renderRecentImports(instagramImports, instagramImportsList, instagramEmptyImports, 'instagram');
    renderRecentImports(linkedinImports, linkedinImportsList, linkedinEmptyImports, 'linkedin');
    renderRecentImports(tiktokImports, tiktokImportsList, tiktokEmptyImports, 'tiktok');

  } catch (error) {
    sosError('Erreur lors du chargement des imports:', error);
  }
}

/**
 * Afficher les imports récents dans une liste
 */
function renderRecentImports(imports, listElement, emptyElement, platform) {
  if (!listElement || !emptyElement) return;

  if (imports.length === 0) {
    listElement.innerHTML = '';
    emptyElement.style.display = 'block';
    return;
  }

  emptyElement.style.display = 'none';

  listElement.innerHTML = imports.map(prospect => {
    const initials = getInitials(prospect.fullName || prospect.username);
    const importDate = formatRelativeTime(prospect.importedAt);
    const syncStatus = prospect.synced !== false ? 'synced' : 'local';
    const syncLabel = syncStatus === 'synced' ? 'Sync' : 'Local';

    // Déterminer l'URL du profil
    let profileUrl = '';
    if (platform === 'linkedin') {
      profileUrl = prospect.profileUrl || `https://linkedin.com/in/${prospect.username}`;
    } else if (platform === 'instagram') {
      profileUrl = `https://instagram.com/${prospect.username}`;
    } else if (platform === 'tiktok') {
      profileUrl = `https://tiktok.com/@${prospect.username}`;
    }

    return `
      <div class="recent-import-item" data-url="${escapeHtml(profileUrl)}">
        <div class="recent-import-avatar ${platform}">${initials}</div>
        <div class="recent-import-info">
          <div class="recent-import-name">${escapeHtml(prospect.fullName || prospect.username || 'Inconnu')}</div>
          <div class="recent-import-meta">${escapeHtml(prospect.headline || prospect.bio?.substring(0, 40) || '')} • ${importDate}</div>
        </div>
        <span class="recent-import-badge ${syncStatus}">${syncLabel}</span>
      </div>
    `;
  }).join('');

  // Ajouter lien vers l'app si authentifié
  if (isAppAuthenticated) {
    listElement.innerHTML += `
      <a href="${APP_URL}/prospects" target="_blank" class="view-all-link">
        Voir tous mes prospects dans l'app
      </a>
    `;
  }

  // Event listeners pour ouvrir les profils
  listElement.querySelectorAll('.recent-import-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) {
        window.open(url, '_blank');
      }
    });
  });
}

/**
 * Obtenir les initiales d'un nom
 */
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return '??';
}

/**
 * Formater une date en temps relatif
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'maintenant';
  if (diffMins < 60) return `il y a ${diffMins}min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/**
 * Charger les sessions sauvegardées
 */
async function loadSessions() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getSessions' });

    if (response.error) {
      throw new Error(response.error);
    }

    currentSessions = response.sessions || [];
    activeSessionId = response.activeSessionId;

    renderAccounts();
  } catch (error) {
    sosError('Erreur lors du chargement des sessions:', error);
    showToast('Erreur lors du chargement', 'error');
  }
}

/**
 * Afficher la liste des comptes
 */
function renderAccounts() {
  if (currentSessions.length === 0) {
    accountsList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  accountsList.innerHTML = currentSessions.map(session => {
    const initial = session.name.charAt(0).toUpperCase();
    const isActive = session.id === activeSessionId;
    const savedDate = new Date(session.savedAt).toLocaleDateString('fr-FR');

    return `
      <div class="account-item ${isActive ? 'active' : ''}" data-session-id="${session.id}">
        <div class="account-avatar">${initial}</div>
        <div class="account-info">
          <div class="account-name">${escapeHtml(session.name)}</div>
          <div class="account-meta">Sauvegarde le ${savedDate}</div>
        </div>
        <div class="account-actions">
          <button class="btn-delete" data-delete="${session.id}" title="Supprimer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Event listeners pour les comptes
  document.querySelectorAll('.account-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Ne pas switcher si on clique sur supprimer
      if (e.target.closest('.btn-delete')) return;

      const sessionId = item.dataset.sessionId;
      switchToAccount(sessionId);
    });
  });

  // Event listeners pour supprimer
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.dataset.delete;
      deleteAccount(sessionId);
    });
  });
}

/**
 * Configurer les event listeners
 */
function setupEventListeners() {
  // Platform Tabs
  platformTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const platform = tab.dataset.platform;
      switchPlatformTab(platform);
    });
  });

  // Settings
  settingsBtn.addEventListener('click', openSettings);
  closeSettingsBtn.addEventListener('click', closeSettings);

  // App Auth
  openAppBtn.addEventListener('click', () => {
    window.open(APP_URL, '_blank');
  });

  // Connect App Button (from warning banner)
  if (connectAppBtn) {
    connectAppBtn.addEventListener('click', () => {
      window.open(APP_URL, '_blank');
    });
  }

  // Bouton d'ajout
  addAccountBtn.addEventListener('click', () => {
    if (!isLoggedIn) {
      showToast('Connectez-vous d\'abord a Instagram', 'error');
      return;
    }
    openAddModal();
  });

  // Modal
  cancelAddBtn.addEventListener('click', closeAddModal);
  confirmAddBtn.addEventListener('click', saveCurrentAccount);

  // Fermer modal en cliquant à l'extérieur
  addModal.addEventListener('click', (e) => {
    if (e.target === addModal) {
      closeAddModal();
    }
  });

  // Enter dans l'input
  accountNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveCurrentAccount();
    }
  });

  // Privacy link
  privacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    openSettings();
    // Scroll to privacy section after a small delay to ensure panel is open
    setTimeout(() => {
      const privacySection = document.querySelector('.privacy-section');
      if (privacySection) {
        privacySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  });

  // Refresh recent imports buttons
  const refreshInstagram = document.getElementById('refreshInstagramImports');
  const refreshLinkedIn = document.getElementById('refreshLinkedInImports');
  const refreshTikTok = document.getElementById('refreshTikTokImports');

  if (refreshInstagram) {
    refreshInstagram.addEventListener('click', () => loadRecentImports());
  }
  if (refreshLinkedIn) {
    refreshLinkedIn.addEventListener('click', () => loadRecentImports());
  }
  if (refreshTikTok) {
    refreshTikTok.addEventListener('click', () => loadRecentImports());
  }
}

/**
 * Changer d'onglet de plateforme
 */
function switchPlatformTab(platform) {
  // Update tabs
  platformTabs.forEach(tab => {
    if (tab.dataset.platform === platform) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update content
  platformContents.forEach(content => {
    if (content.id === `${platform}-content`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

/**
 * Ouvrir les paramètres
 */
function openSettings() {
  settingsPanel.classList.add('open');
  // Refresh auth status when opening settings
  checkAppAuthStatus();
}

/**
 * Fermer les paramètres
 */
function closeSettings() {
  settingsPanel.classList.remove('open');
}

/**
 * Ouvrir la modal d'ajout
 */
function openAddModal() {
  accountNameInput.value = '';
  addModal.classList.add('open');
  accountNameInput.focus();
}

/**
 * Fermer la modal d'ajout
 */
function closeAddModal() {
  addModal.classList.remove('open');
  accountNameInput.value = '';
}

/**
 * Sauvegarder le compte actuel
 */
async function saveCurrentAccount() {
  const name = accountNameInput.value.trim();

  if (!name) {
    showToast('Entrez un nom pour ce compte', 'error');
    return;
  }

  confirmAddBtn.disabled = true;
  confirmAddBtn.textContent = 'Sauvegarde...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveSession',
      accountName: name
    });

    if (response.error) {
      throw new Error(response.error);
    }

    showToast('Compte sauvegarde !', 'success');
    closeAddModal();
    await loadSessions();
    await checkCurrentStatus();
  } catch (error) {
    sosError('Erreur lors de la sauvegarde:', error);
    showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
  } finally {
    confirmAddBtn.disabled = false;
    confirmAddBtn.textContent = 'Sauvegarder';
  }
}

/**
 * Changer de compte
 */
async function switchToAccount(sessionId) {
  if (sessionId === activeSessionId) {
    showToast('Ce compte est deja actif', 'info');
    return;
  }

  const item = document.querySelector(`[data-session-id="${sessionId}"]`);
  if (item) {
    item.classList.add('loading');
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'loadSession',
      sessionId: sessionId
    });

    if (response.error) {
      throw new Error(response.error);
    }

    showToast(`Bascule vers ${response.name}`, 'success');
    activeSessionId = sessionId;
    renderAccounts();
    await checkCurrentStatus();
  } catch (error) {
    sosError('Erreur lors du switch:', error);
    showToast(error.message || 'Erreur lors du changement', 'error');
  } finally {
    if (item) {
      item.classList.remove('loading');
    }
  }
}

/**
 * Supprimer un compte
 */
async function deleteAccount(sessionId) {
  const session = currentSessions.find(s => s.id === sessionId);

  if (!confirm(`Supprimer "${session?.name}" ?`)) {
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'deleteSession',
      sessionId: sessionId
    });

    if (response.error) {
      throw new Error(response.error);
    }

    showToast('Compte supprime', 'success');
    await loadSessions();
  } catch (error) {
    sosError('Erreur lors de la suppression:', error);
    showToast('Erreur lors de la suppression', 'error');
  }
}

/**
 * Afficher une notification toast
 */
function showToast(message, type = 'info') {
  // Supprimer les toasts existants
  document.querySelectorAll('.toast').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Échapper le HTML pour éviter les XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', init);
