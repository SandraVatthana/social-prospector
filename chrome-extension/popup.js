/**
 * Social Prospector - Multi-Account Extension
 * Popup Script
 */

// Éléments DOM
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const accountsList = document.getElementById('accountsList');
const emptyState = document.getElementById('emptyState');
const addAccountBtn = document.getElementById('addAccountBtn');
const addModal = document.getElementById('addModal');
const accountNameInput = document.getElementById('accountNameInput');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const confirmAddBtn = document.getElementById('confirmAddBtn');

// État
let currentSessions = [];
let activeSessionId = null;
let isLoggedIn = false;

/**
 * Initialiser le popup
 */
async function init() {
  await checkCurrentStatus();
  await loadSessions();
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
        statusText.textContent = `Connecté : ${matchingSession.name}`;
      } else {
        statusText.textContent = 'Connecté (compte non sauvegardé)';
      }
    } else {
      statusDot.classList.remove('connected');
      statusDot.classList.add('disconnected');
      statusText.textContent = 'Non connecté à Instagram';
    }

    // Activer/désactiver le bouton d'ajout
    addAccountBtn.disabled = !isLoggedIn;
  } catch (error) {
    console.error('Erreur lors de la vérification du statut:', error);
    statusText.textContent = 'Erreur de vérification';
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
          <div class="account-meta">Sauvegardé le ${savedDate}</div>
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
  // Bouton d'ajout
  addAccountBtn.addEventListener('click', () => {
    if (!isLoggedIn) {
      showToast('Connectez-vous d\'abord à Instagram', 'error');
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

    showToast('Compte sauvegardé !', 'success');
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
    showToast('Ce compte est déjà actif', 'info');
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

    showToast(`Basculé vers ${response.name}`, 'success');
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

    showToast('Compte supprimé', 'success');
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
