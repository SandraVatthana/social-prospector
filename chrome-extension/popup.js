/**
 * Social Prospector - Multi-Account Extension
 * Popup Script
 */

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
const apiKeyInput = document.getElementById('apiKeyInput');
const toggleApiKeyBtn = document.getElementById('toggleApiKeyBtn');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

// Éléments DOM - LinkedIn
const apiStatusDot = document.getElementById('apiStatusDot');
const apiStatusText = document.getElementById('apiStatusText');

// Éléments DOM - Privacy
const privacyLink = document.getElementById('privacyLink');

// État
let currentSessions = [];
let activeSessionId = null;
let isLoggedIn = false;
let hasApiKey = false;

/**
 * Initialiser le popup
 */
async function init() {
  await checkCurrentStatus();
  await loadSessions();
  await checkApiKeyStatus();
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
    console.error('Erreur lors de la verification du statut:', error);
    statusText.textContent = 'Erreur de verification';
  }
}

/**
 * Vérifier le statut de la clé API Claude
 */
async function checkApiKeyStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getClaudeApiKey' });

    hasApiKey = response.hasKey;

    if (hasApiKey) {
      apiStatusDot.classList.add('connected');
      apiStatusDot.classList.remove('disconnected');
      apiStatusText.textContent = 'Cle API configuree';
      // Masquer l'input et montrer un placeholder
      apiKeyInput.value = '••••••••••••••••••••';
    } else {
      apiStatusDot.classList.remove('connected');
      apiStatusDot.classList.add('disconnected');
      apiStatusText.textContent = 'Cle API non configuree';
      apiKeyInput.value = '';
    }
  } catch (error) {
    console.error('Erreur lors de la verification de la cle API:', error);
    apiStatusText.textContent = 'Erreur de verification';
  }
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
    console.error('Erreur lors du chargement des sessions:', error);
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

  // API Key
  toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  apiKeyInput.addEventListener('focus', () => {
    // Clear placeholder when focusing
    if (apiKeyInput.value === '••••••••••••••••••••') {
      apiKeyInput.value = '';
    }
  });

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

  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveApiKey();
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
}

/**
 * Fermer les paramètres
 */
function closeSettings() {
  settingsPanel.classList.remove('open');
}

/**
 * Toggle la visibilité de la clé API
 */
function toggleApiKeyVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
  } else {
    apiKeyInput.type = 'password';
  }
}

/**
 * Sauvegarder la clé API
 */
async function saveApiKey() {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey || apiKey === '••••••••••••••••••••') {
    showToast('Entrez une cle API valide', 'error');
    return;
  }

  if (!apiKey.startsWith('sk-ant-')) {
    showToast('Format de cle API invalide', 'error');
    return;
  }

  saveApiKeyBtn.disabled = true;
  saveApiKeyBtn.textContent = 'Sauvegarde...';

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'saveClaudeApiKey',
      apiKey: apiKey
    });

    if (response.error) {
      throw new Error(response.error);
    }

    showToast('Cle API sauvegardee !', 'success');
    await checkApiKeyStatus();
    closeSettings();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la cle API:', error);
    showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
  } finally {
    saveApiKeyBtn.disabled = false;
    saveApiKeyBtn.textContent = 'Sauvegarder';
  }
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
    console.error('Erreur lors de la sauvegarde:', error);
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
    console.error('Erreur lors du switch:', error);
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
    console.error('Erreur lors de la suppression:', error);
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
