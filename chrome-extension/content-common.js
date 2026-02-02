/**
 * SOS Prospection - Common Content Script Utilities
 * Shared functions for LinkedIn, Instagram, and TikTok content scripts
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  window.SOS_CONFIG = {
    APP_URL: 'https://sosprospection.com',
    DEV_URL: 'http://localhost:5178',
    DEBUG: false
  };

  // Check for dev mode from storage (set via background.js or popup)
  // The background.js handles the actual API URL via customApiUrl storage
  // Content scripts use the default, background handles the routing

  // ============================================
  // LOGGING
  // ============================================

  window.sosLog = function(message, data) {
    if (window.SOS_CONFIG.DEBUG) {
      console.log('[SOS Prospection]', message, data || '');
    }
  };

  window.sosError = function(message, error) {
    if (window.SOS_CONFIG.DEBUG) {
      console.error('[SOS Prospection]', message, error || '');
    }
  };

  // ============================================
  // DOM UTILITIES
  // ============================================

  window.sosEscapeHtml = function(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  };

  window.sosWaitForElement = function(selector, timeout) {
    timeout = timeout || 5000;
    return new Promise(function(resolve, reject) {
      var element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      var observer = new MutationObserver(function(mutations, obs) {
        var el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(function() {
        observer.disconnect();
        reject(new Error('Element not found: ' + selector));
      }, timeout);
    });
  };

  // ============================================
  // COMMUNICATION WITH BACKGROUND
  // ============================================

  window.sosSendMessage = function(action, data) {
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        Object.assign({ action: action }, data),
        function(response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            // Provide better error messages for common issues
            var errorMsg = response.error;
            if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('non authentifié')) {
              errorMsg = 'Connectez-vous à l\'app SOS Prospection d\'abord';
            } else if (errorMsg.includes('timeout') || errorMsg.includes('network')) {
              errorMsg = 'Erreur de connexion - vérifiez votre internet';
            }
            reject(new Error(errorMsg));
          } else {
            resolve(response);
          }
        }
      );
    });
  };

  // ============================================
  // NOTIFICATION TOAST
  // ============================================

  window.sosShowToast = function(message, type) {
    type = type || 'info';

    // Remove existing toasts
    var existingToasts = document.querySelectorAll('.sos-toast');
    existingToasts.forEach(function(t) { t.remove(); });

    var toast = document.createElement('div');
    toast.className = 'sos-toast sos-toast-' + type;
    toast.innerHTML = '<span class="sos-toast-icon">' + getToastIcon(type) + '</span>' +
                      '<span class="sos-toast-message">' + sosEscapeHtml(message) + '</span>';

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(function() {
      toast.classList.add('sos-toast-visible');
    }, 10);

    // Auto remove
    setTimeout(function() {
      toast.classList.remove('sos-toast-visible');
      setTimeout(function() {
        toast.remove();
      }, 300);
    }, 3000);
  };

  function getToastIcon(type) {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  }

  // ============================================
  // COPY TO CLIPBOARD
  // ============================================

  window.sosCopyToClipboard = function(text) {
    return navigator.clipboard.writeText(text).then(function() {
      sosShowToast('Copié !', 'success');
      return true;
    }).catch(function(err) {
      sosError('Copy failed', err);
      sosShowToast('Erreur de copie', 'error');
      return false;
    });
  };

  // ============================================
  // FLOATING BUTTON UI
  // ============================================

  window.sosCreateFloatingButton = function(options) {
    options = options || {};
    var platform = options.platform || 'unknown';
    var onImport = options.onImport || function() {};
    var onPrepare = options.onPrepare || function() {};
    var showPrepare = options.showPrepare !== false;

    // Remove existing
    var existing = document.getElementById('sos-floating-container');
    if (existing) existing.remove();

    var container = document.createElement('div');
    container.id = 'sos-floating-container';
    container.className = 'sos-floating-container';
    container.setAttribute('data-platform', platform);

    var buttonsHtml = '<button id="sos-import-btn" class="sos-btn sos-btn-primary">' +
                      '<span class="sos-btn-icon">📥</span>' +
                      '<span class="sos-btn-text">Importer</span>' +
                      '</button>';

    if (showPrepare) {
      buttonsHtml += '<button id="sos-prepare-btn" class="sos-btn sos-btn-secondary">' +
                     '<span class="sos-btn-icon">✉️</span>' +
                     '<span class="sos-btn-text">Préparer DM</span>' +
                     '</button>';
    }

    container.innerHTML = '<div class="sos-floating-buttons">' + buttonsHtml + '</div>';

    document.body.appendChild(container);

    // Event listeners
    document.getElementById('sos-import-btn').addEventListener('click', onImport);

    if (showPrepare) {
      document.getElementById('sos-prepare-btn').addEventListener('click', onPrepare);
    }

    return container;
  };

  // ============================================
  // SIDE PANEL (100% Legal - No Scraping)
  // ============================================

  // Store panel state globally
  window._sosPanelState = window._sosPanelState || {
    isOpen: false,
    platform: null,
    onConfirm: null
  };

  /**
   * Affiche un panneau latéral permanent pour saisir les données du prospect
   * Le panneau reste visible pendant la navigation
   */
  window.sosShowManualInputModal = function(options) {
    var platform = options.platform || 'linkedin';
    var username = options.username || '';
    var onConfirm = options.onConfirm;

    // Store callback for later use
    window._sosPanelState.onConfirm = onConfirm;
    window._sosPanelState.platform = platform;

    var existing = document.getElementById('sos-side-panel');

    // If panel exists, just update username and show it
    if (existing) {
      var usernameInput = document.getElementById('sos-manual-username');
      if (usernameInput && username && !usernameInput.value) {
        usernameInput.value = username;
      }
      existing.classList.add('sos-panel-open');
      window._sosPanelState.isOpen = true;
      return;
    }

    var platformLabels = {
      linkedin: { name: 'LinkedIn', fields: ['fullName', 'headline', 'company', 'about'], color: '#0077b5' },
      instagram: { name: 'Instagram', fields: ['fullName', 'bio', 'followers'], color: '#E1306C' },
      tiktok: { name: 'TikTok', fields: ['fullName', 'bio', 'followers'], color: '#000000' }
    };

    var config = platformLabels[platform] || platformLabels.linkedin;

    var panel = document.createElement('div');
    panel.id = 'sos-side-panel';
    panel.className = 'sos-side-panel';

    panel.innerHTML =
      '<div class="sos-panel-header" style="background: ' + config.color + '">' +
        '<div class="sos-panel-title">' +
          '<span class="sos-panel-icon">✏️</span>' +
          '<span>Ajouter un prospect</span>' +
        '</div>' +
        '<div class="sos-panel-actions">' +
          '<button class="sos-panel-minimize" id="sos-minimize-panel" title="Réduire">−</button>' +
          '<button class="sos-panel-close" id="sos-close-panel" title="Fermer">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="sos-panel-body">' +
        '<p class="sos-panel-hint">💡 Copiez-collez les infos depuis le profil à gauche</p>' +

        '<div class="sos-form-group">' +
          '<label>Identifiant *</label>' +
          '<input type="text" id="sos-manual-username" placeholder="ex: jean-dupont" value="' + sosEscapeHtml(username) + '">' +
        '</div>' +

        '<div class="sos-form-group">' +
          '<label>Nom complet *</label>' +
          '<input type="text" id="sos-manual-fullname" placeholder="Sélectionnez et collez le nom">' +
        '</div>' +

        (config.fields.includes('headline') ?
        '<div class="sos-form-group">' +
          '<label>Titre / Poste</label>' +
          '<input type="text" id="sos-manual-headline" placeholder="Sélectionnez et collez le titre">' +
        '</div>' : '') +

        (config.fields.includes('company') ?
        '<div class="sos-form-group">' +
          '<label>Entreprise</label>' +
          '<input type="text" id="sos-manual-company" placeholder="Nom de l\'entreprise">' +
        '</div>' : '') +

        (config.fields.includes('bio') || config.fields.includes('about') ?
        '<div class="sos-form-group">' +
          '<label>' + (platform === 'linkedin' ? 'À propos' : 'Bio') + '</label>' +
          '<textarea id="sos-manual-bio" rows="2" placeholder="Copiez la section À propos..."></textarea>' +
        '</div>' : '') +

        (config.fields.includes('followers') ?
        '<div class="sos-form-group">' +
          '<label>Followers</label>' +
          '<input type="text" id="sos-manual-followers" placeholder="ex: 5000">' +
        '</div>' : '') +

        '<div class="sos-form-group">' +
          '<label>Notes perso</label>' +
          '<textarea id="sos-manual-notes" rows="2" placeholder="Pourquoi ce prospect ?"></textarea>' +
        '</div>' +

        '<div class="sos-form-group">' +
          '<label>Dernier post (optionnel)</label>' +
          '<textarea id="sos-manual-post" rows="2" placeholder="Pour personnaliser le message..."></textarea>' +
        '</div>' +

        '<label class="sos-panel-checkbox">' +
          '<input type="checkbox" id="sos-manual-consent">' +
          '<span>Données saisies manuellement</span>' +
        '</label>' +
      '</div>' +
      '<div class="sos-panel-footer">' +
        '<button class="sos-btn sos-btn-secondary" id="sos-clear-form">Effacer</button>' +
        '<button class="sos-btn sos-btn-primary" id="sos-confirm-manual" disabled>Ajouter</button>' +
      '</div>';

    document.body.appendChild(panel);

    // Show panel with animation
    setTimeout(function() {
      panel.classList.add('sos-panel-open');
      window._sosPanelState.isOpen = true;
    }, 10);

    // Event listeners
    var closePanel = function() {
      panel.classList.remove('sos-panel-open');
      window._sosPanelState.isOpen = false;
    };

    var minimizePanel = function() {
      panel.classList.toggle('sos-panel-minimized');
    };

    document.getElementById('sos-close-panel').addEventListener('click', closePanel);
    document.getElementById('sos-minimize-panel').addEventListener('click', minimizePanel);

    // Clear form
    document.getElementById('sos-clear-form').addEventListener('click', function() {
      document.getElementById('sos-manual-username').value = '';
      document.getElementById('sos-manual-fullname').value = '';
      var headline = document.getElementById('sos-manual-headline');
      var company = document.getElementById('sos-manual-company');
      var bio = document.getElementById('sos-manual-bio');
      var followers = document.getElementById('sos-manual-followers');
      var notes = document.getElementById('sos-manual-notes');
      var post = document.getElementById('sos-manual-post');
      if (headline) headline.value = '';
      if (company) company.value = '';
      if (bio) bio.value = '';
      if (followers) followers.value = '';
      if (notes) notes.value = '';
      if (post) post.value = '';
      document.getElementById('sos-manual-consent').checked = false;
      updateConfirmButton();
    });

    // Enable/disable confirm button
    var consentCheckbox = document.getElementById('sos-manual-consent');
    var confirmBtn = document.getElementById('sos-confirm-manual');
    var usernameInput = document.getElementById('sos-manual-username');
    var fullnameInput = document.getElementById('sos-manual-fullname');

    function updateConfirmButton() {
      var hasRequired = usernameInput.value.trim() && fullnameInput.value.trim();
      var hasConsent = consentCheckbox.checked;
      confirmBtn.disabled = !(hasRequired && hasConsent);
    }

    consentCheckbox.addEventListener('change', updateConfirmButton);
    usernameInput.addEventListener('input', updateConfirmButton);
    fullnameInput.addEventListener('input', updateConfirmButton);

    confirmBtn.addEventListener('click', function() {
      var currentPlatform = window._sosPanelState.platform;
      var currentOnConfirm = window._sosPanelState.onConfirm;
      var followersEl = document.getElementById('sos-manual-followers');

      var profileData = {
        platform: currentPlatform,
        username: usernameInput.value.trim(),
        fullName: fullnameInput.value.trim(),
        firstName: fullnameInput.value.trim().split(' ')[0] || '',
        headline: document.getElementById('sos-manual-headline') ? document.getElementById('sos-manual-headline').value.trim() : '',
        company: document.getElementById('sos-manual-company') ? document.getElementById('sos-manual-company').value.trim() : '',
        bio: document.getElementById('sos-manual-bio') ? document.getElementById('sos-manual-bio').value.trim() : '',
        about: document.getElementById('sos-manual-bio') ? document.getElementById('sos-manual-bio').value.trim() : '',
        notes: document.getElementById('sos-manual-notes').value.trim(),
        recentPost: document.getElementById('sos-manual-post').value.trim(),
        followers_count: followersEl ? parseFollowersCount(followersEl.value) : null,
        profileUrl: buildProfileUrl(currentPlatform, usernameInput.value.trim()),
        source: 'manual_input',
        manualEntry: true
      };

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="sos-spinner"></span>';

      if (currentOnConfirm) {
        currentOnConfirm(profileData)
          .then(function() {
            sosShowToast('Prospect ajouté !', 'success');
            // Clear form for next prospect
            document.getElementById('sos-clear-form').click();
            confirmBtn.innerHTML = 'Ajouter';
          })
          .catch(function(err) {
            sosError('Manual import failed', err);
            sosShowToast('Erreur: ' + (err.message || 'Échec'), 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Ajouter';
          });
      }
    });
  };

  /**
   * Toggle le panneau latéral
   */
  window.sosToggleSidePanel = function() {
    var panel = document.getElementById('sos-side-panel');
    if (panel) {
      panel.classList.toggle('sos-panel-open');
      window._sosPanelState.isOpen = panel.classList.contains('sos-panel-open');
    }
  };

  function parseFollowersCount(str) {
    if (!str) return null;
    str = str.replace(/[,\s]/g, '').toLowerCase();
    if (str.includes('k')) return Math.round(parseFloat(str) * 1000);
    if (str.includes('m')) return Math.round(parseFloat(str) * 1000000);
    return parseInt(str, 10) || null;
  }

  function buildProfileUrl(platform, username) {
    username = (username || '').replace('@', '');
    switch (platform) {
      case 'linkedin': return 'https://www.linkedin.com/in/' + username;
      case 'instagram': return 'https://www.instagram.com/' + username + '/';
      case 'tiktok': return 'https://www.tiktok.com/@' + username;
      default: return '';
    }
  }

  // ============================================
  // IMPORT MODAL (Legacy - kept for compatibility)
  // ============================================

  window.sosShowImportModal = function(profileData, onConfirm) {
    // Remove existing
    var existing = document.getElementById('sos-import-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'sos-import-modal';
    modal.className = 'sos-modal';

    var platformIcon = getPlatformIcon(profileData.platform);
    var displayName = profileData.fullName || profileData.username || 'Ce profil';

    modal.innerHTML = '<div class="sos-modal-overlay"></div>' +
      '<div class="sos-modal-content">' +
      '<div class="sos-modal-header">' +
      '<h3>' + platformIcon + ' Importer dans SOS Prospection</h3>' +
      '<button class="sos-modal-close" id="sos-close-import">×</button>' +
      '</div>' +
      '<div class="sos-modal-body">' +
      '<div class="sos-profile-preview">' +
      '<div class="sos-profile-avatar">' + (displayName.charAt(0).toUpperCase()) + '</div>' +
      '<div class="sos-profile-info">' +
      '<div class="sos-profile-name">' + sosEscapeHtml(displayName) + '</div>' +
      '<div class="sos-profile-headline">' + sosEscapeHtml(profileData.headline || profileData.bio || '') + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="sos-import-details">' +
      '<h4>Données importées :</h4>' +
      '<ul>' +
      '<li>Nom et identifiant</li>' +
      '<li>Bio / À propos</li>' +
      (profileData.posts && profileData.posts.length > 0 ? '<li>' + profileData.posts.length + ' post(s) récent(s)</li>' : '') +
      (profileData.experiences && profileData.experiences.length > 0 ? '<li>Parcours professionnel</li>' : '') +
      '</ul>' +
      '</div>' +
      '<label class="sos-checkbox-label">' +
      '<input type="checkbox" id="sos-consent-check">' +
      '<span>J\'accepte d\'importer ces données dans mon CRM</span>' +
      '</label>' +
      '</div>' +
      '<div class="sos-modal-footer">' +
      '<button class="sos-btn sos-btn-cancel" id="sos-cancel-import">Annuler</button>' +
      '<button class="sos-btn sos-btn-primary" id="sos-confirm-import" disabled>Importer</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Show modal with animation
    setTimeout(function() {
      modal.classList.add('sos-modal-visible');
    }, 10);

    // Event listeners
    var closeModal = function() {
      modal.classList.remove('sos-modal-visible');
      setTimeout(function() {
        modal.remove();
      }, 300);
    };

    document.getElementById('sos-close-import').addEventListener('click', closeModal);
    document.getElementById('sos-cancel-import').addEventListener('click', closeModal);
    document.querySelector('.sos-modal-overlay').addEventListener('click', closeModal);

    var checkbox = document.getElementById('sos-consent-check');
    var confirmBtn = document.getElementById('sos-confirm-import');

    checkbox.addEventListener('change', function() {
      confirmBtn.disabled = !checkbox.checked;
    });

    confirmBtn.addEventListener('click', function() {
      if (!checkbox.checked) return;

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="sos-spinner"></span> Import...';

      onConfirm(profileData)
        .then(function(result) {
          sosShowToast('Profil importé !', 'success');
          closeModal();

          // Open app in new tab
          if (result && result.prospectId) {
            window.open(window.SOS_CONFIG.APP_URL + '/prospects/' + result.prospectId, '_blank');
          } else {
            window.open(window.SOS_CONFIG.APP_URL + '/prospects?source=' + profileData.platform, '_blank');
          }
        })
        .catch(function(err) {
          sosError('Import failed', err);
          sosShowToast('Erreur: ' + err.message, 'error');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = 'Importer';
        });
    });

    return modal;
  };

  function getPlatformIcon(platform) {
    switch (platform) {
      case 'linkedin': return '💼';
      case 'instagram': return '📸';
      case 'tiktok': return '🎵';
      default: return '👤';
    }
  }

  // ============================================
  // PREPARE DM MODAL
  // ============================================

  window.sosShowPrepareDMModal = function(prospectData, onGenerate) {
    // Remove existing
    var existing = document.getElementById('sos-dm-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'sos-dm-modal';
    modal.className = 'sos-modal';

    var displayName = prospectData.fullName || prospectData.username || 'Ce prospect';

    modal.innerHTML = '<div class="sos-modal-overlay"></div>' +
      '<div class="sos-modal-content">' +
      '<div class="sos-modal-header">' +
      '<h3>✉️ Préparer le DM pour ' + sosEscapeHtml(displayName) + '</h3>' +
      '<button class="sos-modal-close" id="sos-close-dm">×</button>' +
      '</div>' +
      '<div class="sos-modal-body">' +
      '<div class="sos-dm-status" id="sos-dm-status">' +
      '<span class="sos-spinner"></span> Génération du message...' +
      '</div>' +
      '<div class="sos-dm-result sos-hidden" id="sos-dm-result">' +
      '<textarea id="sos-dm-text" rows="4" placeholder="Message généré..."></textarea>' +
      '<div class="sos-dm-meta" id="sos-dm-meta">0/300 caractères</div>' +
      '</div>' +
      '</div>' +
      '<div class="sos-modal-footer">' +
      '<button class="sos-btn sos-btn-cancel" id="sos-cancel-dm">Annuler</button>' +
      '<button class="sos-btn sos-btn-secondary sos-hidden" id="sos-regenerate-dm">🔄 Régénérer</button>' +
      '<button class="sos-btn sos-btn-secondary sos-hidden" id="sos-copy-dm">📋 Copier</button>' +
      '<button class="sos-btn sos-btn-primary sos-hidden" id="sos-send-dm">✉️ Pré-remplir DM</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Show modal
    setTimeout(function() {
      modal.classList.add('sos-modal-visible');
    }, 10);

    var closeModal = function() {
      modal.classList.remove('sos-modal-visible');
      setTimeout(function() {
        modal.remove();
      }, 300);
    };

    document.getElementById('sos-close-dm').addEventListener('click', closeModal);
    document.getElementById('sos-cancel-dm').addEventListener('click', closeModal);
    document.querySelector('.sos-modal-overlay').addEventListener('click', closeModal);

    // Generate message
    onGenerate(prospectData)
      .then(function(result) {
        showDMResult(result.message);
      })
      .catch(function(err) {
        sosError('DM generation failed', err);
        document.getElementById('sos-dm-status').innerHTML =
          '<span class="sos-error-icon">❌</span> Erreur: ' + sosEscapeHtml(err.message);
      });

    function showDMResult(message) {
      document.getElementById('sos-dm-status').classList.add('sos-hidden');
      document.getElementById('sos-dm-result').classList.remove('sos-hidden');
      document.getElementById('sos-regenerate-dm').classList.remove('sos-hidden');
      document.getElementById('sos-copy-dm').classList.remove('sos-hidden');
      document.getElementById('sos-send-dm').classList.remove('sos-hidden');

      var textarea = document.getElementById('sos-dm-text');
      textarea.value = message;
      updateCharCount(message.length);

      textarea.addEventListener('input', function(e) {
        updateCharCount(e.target.value.length);
      });

      document.getElementById('sos-copy-dm').addEventListener('click', function() {
        sosCopyToClipboard(textarea.value);
      });

      document.getElementById('sos-regenerate-dm').addEventListener('click', function() {
        document.getElementById('sos-dm-status').classList.remove('sos-hidden');
        document.getElementById('sos-dm-status').innerHTML = '<span class="sos-spinner"></span> Régénération...';
        document.getElementById('sos-dm-result').classList.add('sos-hidden');

        onGenerate(prospectData)
          .then(function(result) {
            showDMResult(result.message);
          })
          .catch(function(err) {
            document.getElementById('sos-dm-status').innerHTML =
              '<span class="sos-error-icon">❌</span> Erreur: ' + sosEscapeHtml(err.message);
          });
      });

      document.getElementById('sos-send-dm').addEventListener('click', function() {
        // This will be implemented per-platform
        var event = new CustomEvent('sos-prefill-dm', {
          detail: { message: textarea.value, prospect: prospectData }
        });
        document.dispatchEvent(event);
        closeModal();
      });
    }

    function updateCharCount(len) {
      var meta = document.getElementById('sos-dm-meta');
      meta.textContent = len + '/300 caractères';
      meta.className = 'sos-dm-meta' + (len > 300 ? ' sos-char-warning' : '');
    }

    return modal;
  };

  // ============================================
  // URL CHANGE OBSERVER
  // ============================================

  window.sosObserveUrlChanges = function(callback) {
    var lastUrl = location.href;

    var observer = new MutationObserver(function() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(callback, 1000);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  };

  // ============================================
  // STORAGE HELPERS
  // ============================================

  window.sosGetStorage = function(key) {
    return new Promise(function(resolve) {
      chrome.storage.local.get(key, function(result) {
        resolve(result[key]);
      });
    });
  };

  window.sosSetStorage = function(key, value) {
    var data = {};
    data[key] = value;
    return new Promise(function(resolve) {
      chrome.storage.local.set(data, resolve);
    });
  };

  // Log initialization
  sosLog('Common utilities loaded');

})();
