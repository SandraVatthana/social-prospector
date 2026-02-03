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
    console.log('[SOS Content] sosSendMessage called:', action);
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage(
        Object.assign({ action: action }, data),
        function(response) {
          console.log('[SOS Content] Got response:', response, 'lastError:', chrome.runtime.lastError);
          if (chrome.runtime.lastError) {
            console.error('[SOS Content] Runtime error:', chrome.runtime.lastError.message);
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

    // Remove existing and clean up listeners
    var existing = document.getElementById('sos-floating-container');
    if (existing) {
      if (existing._sosDragCleanup) existing._sosDragCleanup();
      existing.remove();
    }

    var container = document.createElement('div');
    container.id = 'sos-floating-container';
    container.className = 'sos-floating-container';
    container.setAttribute('data-platform', platform);

    var buttonsHtml = '<div class="sos-drag-handle">⋮⋮ glisser</div>' +
                      '<button id="sos-import-btn" class="sos-btn sos-btn-primary">' +
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

    // Make container draggable
    makeDraggable(container);

    // Event listeners
    document.getElementById('sos-import-btn').addEventListener('click', onImport);

    if (showPrepare) {
      document.getElementById('sos-prepare-btn').addEventListener('click', onPrepare);
    }

    return container;
  };

  // Make the side panel draggable by its header
  function makePanelDraggable(panel) {
    var isDragging = false;
    var offsetX = 0;
    var offsetY = 0;
    var headerEl = null;

    // Wait for header to be available (it's added via innerHTML)
    setTimeout(function() {
      headerEl = panel.querySelector('.sos-panel-header');
      if (!headerEl) return;

      headerEl.style.cursor = 'move';

      headerEl.addEventListener('mousedown', function(e) {
        // Don't drag if clicking buttons
        if (e.target.closest('button')) return;

        isDragging = true;
        panel.classList.add('sos-panel-dragging');

        var rect = panel.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        // Convert to left/top positioning immediately
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';

        e.preventDefault();
        e.stopPropagation();
      });
    }, 100);

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;

      var newX = e.clientX - offsetX;
      var newY = e.clientY - offsetY;

      // Keep within viewport
      var maxX = window.innerWidth - panel.offsetWidth;
      var maxY = window.innerHeight - panel.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      panel.style.left = newX + 'px';
      panel.style.top = newY + 'px';

      e.preventDefault();
    });

    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        panel.classList.remove('sos-panel-dragging');
      }
    });
  }

  // Make element draggable
  function makeDraggable(element) {
    var isDragging = false;
    var offsetX = 0;
    var offsetY = 0;

    // Store handlers so we can remove them if element is destroyed
    var onMouseDown = function(e) {
      // Only drag from the handle or container itself, not buttons
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      if (e.target.tagName === 'SPAN' && e.target.closest('button')) return;

      isDragging = true;
      element.classList.add('sos-dragging');

      // Get current position from bounding rect
      var rect = element.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      // CRITICAL: Convert from bottom/right to left/top positioning immediately
      // This ensures subsequent mousemove events work correctly
      element.style.left = rect.left + 'px';
      element.style.top = rect.top + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';

      e.preventDefault();
      e.stopPropagation();
    };

    var onMouseMove = function(e) {
      if (!isDragging) return;

      var newX = e.clientX - offsetX;
      var newY = e.clientY - offsetY;

      // Keep within viewport
      var maxX = window.innerWidth - element.offsetWidth;
      var maxY = window.innerHeight - element.offsetHeight;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      element.style.left = newX + 'px';
      element.style.top = newY + 'px';

      e.preventDefault();
    };

    var onMouseUp = function() {
      if (isDragging) {
        isDragging = false;
        element.classList.remove('sos-dragging');
      }
    };

    element.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Store cleanup function on element for later removal
    element._sosDragCleanup = function() {
      element.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  // ============================================
  // SMART SIDE PANEL (Multi-paste + AI Analysis)
  // ============================================

  // Store panel state globally
  window._sosPanelState = window._sosPanelState || {
    isOpen: false,
    platform: null,
    onConfirm: null,
    pastedBlocks: [],
    analyzedData: null,
    signals: null
  };

  /**
   * Affiche un panneau latéral intelligent avec multi-paste et analyse IA
   */
  window.sosShowManualInputModal = function(options) {
    var platform = options.platform || 'linkedin';
    var username = options.username || '';
    var onConfirm = options.onConfirm;

    // Store callback for later use
    window._sosPanelState.onConfirm = onConfirm;
    window._sosPanelState.platform = platform;

    var existing = document.getElementById('sos-side-panel');

    // If panel exists, just show it
    if (existing) {
      existing.classList.add('sos-panel-open');
      window._sosPanelState.isOpen = true;
      // Update username if provided and field is empty
      var usernameInput = document.getElementById('sos-manual-username');
      if (usernameInput && username && !usernameInput.value) {
        usernameInput.value = username;
      }
      return;
    }

    var platformLabels = {
      linkedin: { name: 'LinkedIn', color: '#0077b5' },
      instagram: { name: 'Instagram', color: '#E1306C' },
      tiktok: { name: 'TikTok', color: '#000000' }
    };

    var config = platformLabels[platform] || platformLabels.linkedin;

    var panel = document.createElement('div');
    panel.id = 'sos-side-panel';
    panel.className = 'sos-side-panel';

    panel.innerHTML =
      '<div class="sos-panel-header" style="background: ' + config.color + '">' +
        '<div class="sos-panel-title">' +
          '<span class="sos-panel-icon">🎯</span>' +
          '<span>Analyser un prospect</span>' +
        '</div>' +
        '<div class="sos-panel-actions">' +
          '<button class="sos-panel-minimize" id="sos-minimize-panel" title="Réduire">−</button>' +
          '<button class="sos-panel-close" id="sos-close-panel" title="Fermer">×</button>' +
        '</div>' +
      '</div>' +

      '<!-- Sync Status Banner -->' +
      '<div class="sos-sync-banner sos-sync-warning" id="sos-sync-banner">' +
        '<div class="sos-sync-icon">⚠️</div>' +
        '<div class="sos-sync-text">' +
          '<strong>Non connecté</strong>' +
          '<span>Tes imports ne sont pas sauvegardés dans l\'app</span>' +
        '</div>' +
        '<button class="sos-sync-btn" id="sos-connect-app-btn">Connecter</button>' +
      '</div>' +

      '<div class="sos-panel-body" id="sos-panel-body">' +
        '<!-- Step 1: Paste Zone -->' +
        '<div id="sos-step-paste" class="sos-step active">' +
          '<div class="sos-step-header">' +
            '<span class="sos-step-number">1</span>' +
            '<span>Coller le contenu</span>' +
          '</div>' +

          '<div class="sos-paste-zone" id="sos-paste-zone">' +
            '<div class="sos-paste-placeholder" id="sos-paste-placeholder">' +
              '<span class="sos-paste-icon">📋</span>' +
              '<span>Cliquez ici puis Ctrl+V</span>' +
              '<span class="sos-paste-hint">Profil, posts, commentaires...</span>' +
            '</div>' +
            '<textarea id="sos-paste-input" placeholder="Ctrl+V pour coller..."></textarea>' +
          '</div>' +

          '<div class="sos-pasted-blocks" id="sos-pasted-blocks">' +
            '<!-- Blocs collés apparaîtront ici -->' +
          '</div>' +

          '<div class="sos-paste-actions">' +
            '<button class="sos-btn sos-btn-secondary sos-btn-small" id="sos-clear-blocks" style="display:none;">🗑️ Tout effacer</button>' +
            '<button class="sos-btn sos-btn-primary" id="sos-analyze-btn" disabled>' +
              '<span class="sos-btn-text">✨ Analyser</span>' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<!-- Step 2: Results -->' +
        '<div id="sos-step-results" class="sos-step">' +
          '<div class="sos-step-header">' +
            '<span class="sos-step-number">2</span>' +
            '<span>Résultats de l\'analyse</span>' +
            '<button class="sos-btn-link" id="sos-back-to-paste">← Modifier</button>' +
          '</div>' +

          '<div id="sos-analysis-loading" class="sos-analysis-loading" style="display:none;">' +
            '<span class="sos-spinner"></span>' +
            '<span>Analyse en cours...</span>' +
          '</div>' +

          '<div id="sos-analysis-results" style="display:none;">' +
            '<!-- Profile Data -->' +
            '<div class="sos-result-section">' +
              '<div class="sos-result-title">👤 Profil</div>' +
              '<div class="sos-result-fields">' +
                '<div class="sos-mini-field">' +
                  '<label>Nom</label>' +
                  '<input type="text" id="sos-result-fullname" readonly>' +
                '</div>' +
                '<div class="sos-mini-field">' +
                  '<label>Titre</label>' +
                  '<input type="text" id="sos-result-headline" readonly>' +
                '</div>' +
                '<div class="sos-mini-field">' +
                  '<label>Entreprise</label>' +
                  '<input type="text" id="sos-result-company" readonly>' +
                '</div>' +
              '</div>' +
            '</div>' +

            '<!-- Signals -->' +
            '<div class="sos-result-section" id="sos-signals-section">' +
              '<div class="sos-result-title">🎯 Signaux détectés</div>' +
              '<div id="sos-signals-list" class="sos-signals-list">' +
                '<!-- Signaux ajoutés dynamiquement -->' +
              '</div>' +
            '</div>' +

            '<!-- Approach Angles -->' +
            '<div class="sos-result-section" id="sos-angles-section">' +
              '<div class="sos-result-title">💡 Angles d\'approche</div>' +
              '<div id="sos-angles-list" class="sos-angles-list">' +
                '<!-- Angles ajoutés dynamiquement -->' +
              '</div>' +
            '</div>' +

            '<!-- Notes -->' +
            '<div class="sos-form-group">' +
              '<label>Notes personnelles</label>' +
              '<textarea id="sos-result-notes" rows="2" placeholder="Ajouter vos notes..."></textarea>' +
            '</div>' +

            '<!-- Raw Content Toggle -->' +
            '<div class="sos-raw-toggle" id="sos-raw-toggle">' +
              '<span class="sos-raw-toggle-icon">▶</span>' +
              '<span>Voir le contenu analysé</span>' +
            '</div>' +
            '<div class="sos-raw-content" id="sos-raw-content">' +
              '<pre id="sos-raw-text"></pre>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<!-- Recent Imports Section -->' +
        '<div class="sos-recent-section" id="sos-recent-section">' +
          '<div class="sos-recent-header" id="sos-recent-toggle">' +
            '<span class="sos-recent-toggle-icon">▶</span>' +
            '<span>Derniers imports</span>' +
            '<span class="sos-recent-count" id="sos-recent-count">0</span>' +
          '</div>' +
          '<div class="sos-recent-list" id="sos-recent-list">' +
            '<!-- Populated dynamically -->' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="sos-panel-footer">' +
        '<div id="sos-footer-paste">' +
          '<span class="sos-block-count" id="sos-block-count">0 bloc collé</span>' +
        '</div>' +
        '<div id="sos-footer-results" style="display:none;">' +
          '<button class="sos-btn sos-btn-secondary" id="sos-cancel-add">Annuler</button>' +
          '<button class="sos-btn sos-btn-secondary" id="sos-prepare-dm-btn">✉️ Préparer DM</button>' +
          '<button class="sos-btn sos-btn-primary" id="sos-confirm-add">Ajouter au CRM</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Make the panel draggable by its header
    makePanelDraggable(panel);

    // Initialize state
    window._sosPanelState.pastedBlocks = [];
    window._sosPanelState.analyzedData = null;

    // Show panel with animation
    setTimeout(function() {
      panel.classList.add('sos-panel-open');
      window._sosPanelState.isOpen = true;
    }, 10);

    // Check auth status and update sync banner
    checkAndUpdateSyncStatus();

    // Load recent imports
    loadRecentImportsInPanel(platform);

    // Connect app button
    document.getElementById('sos-connect-app-btn').addEventListener('click', function() {
      window.open(window.SOS_CONFIG.APP_URL, '_blank');
    });

    // Recent imports toggle
    document.getElementById('sos-recent-toggle').addEventListener('click', function() {
      var section = document.getElementById('sos-recent-section');
      section.classList.toggle('sos-recent-open');
    });

    // Get elements
    var pasteInput = document.getElementById('sos-paste-input');
    var pasteZone = document.getElementById('sos-paste-zone');
    var pastePlaceholder = document.getElementById('sos-paste-placeholder');
    var pastedBlocksContainer = document.getElementById('sos-pasted-blocks');
    var blockCountEl = document.getElementById('sos-block-count');
    var clearBlocksBtn = document.getElementById('sos-clear-blocks');
    var analyzeBtn = document.getElementById('sos-analyze-btn');

    // Close/minimize handlers
    document.getElementById('sos-close-panel').addEventListener('click', function() {
      panel.classList.remove('sos-panel-open');
      window._sosPanelState.isOpen = false;
    });

    document.getElementById('sos-minimize-panel').addEventListener('click', function() {
      panel.classList.toggle('sos-panel-minimized');
    });

    // Paste zone click -> focus input
    pasteZone.addEventListener('click', function() {
      pasteInput.focus();
    });

    // Handle paste
    pasteInput.addEventListener('paste', function(e) {
      setTimeout(function() {
        var text = pasteInput.value.trim();
        if (text) {
          addPastedBlock(text);
          pasteInput.value = '';
        }
      }, 10);
    });

    // Also handle direct input (for typing/testing)
    pasteInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var text = pasteInput.value.trim();
        if (text) {
          addPastedBlock(text);
          pasteInput.value = '';
        }
      }
    });

    function addPastedBlock(text) {
      var blockId = Date.now();
      window._sosPanelState.pastedBlocks.push({ id: blockId, text: text });

      // Detect block type
      var blockType = detectBlockType(text);

      var blockEl = document.createElement('div');
      blockEl.className = 'sos-pasted-block';
      blockEl.dataset.blockId = blockId;
      blockEl.innerHTML =
        '<div class="sos-block-header">' +
          '<span class="sos-block-type">' + blockType.icon + ' ' + blockType.label + '</span>' +
          '<button class="sos-block-remove" data-block-id="' + blockId + '">×</button>' +
        '</div>' +
        '<div class="sos-block-preview">' + sosEscapeHtml(text.substring(0, 100)) + (text.length > 100 ? '...' : '') + '</div>';

      pastedBlocksContainer.appendChild(blockEl);

      // Update UI
      updateBlockCount();
      clearBlocksBtn.style.display = 'inline-flex';
      analyzeBtn.disabled = false;

      // Add remove handler
      blockEl.querySelector('.sos-block-remove').addEventListener('click', function(e) {
        e.stopPropagation();
        var id = parseInt(this.dataset.blockId);
        window._sosPanelState.pastedBlocks = window._sosPanelState.pastedBlocks.filter(function(b) { return b.id !== id; });
        blockEl.remove();
        updateBlockCount();
        if (window._sosPanelState.pastedBlocks.length === 0) {
          clearBlocksBtn.style.display = 'none';
          analyzeBtn.disabled = true;
        }
      });
    }

    function detectBlockType(text) {
      var lower = text.toLowerCase();
      if (lower.includes('experience') || lower.includes('ans d\'expérience') || lower.includes('poste actuel')) {
        return { icon: '💼', label: 'Profil' };
      }
      if (lower.includes('j\'ai') || lower.includes('je suis') || lower.includes('nous avons') || lower.includes('🔥') || lower.includes('💡')) {
        return { icon: '📝', label: 'Post' };
      }
      if (lower.includes('commentaire') || lower.includes('@')) {
        return { icon: '💬', label: 'Commentaire' };
      }
      if (lower.includes('formation') || lower.includes('diplôme') || lower.includes('école')) {
        return { icon: '🎓', label: 'Formation' };
      }
      return { icon: '📄', label: 'Contenu' };
    }

    function updateBlockCount() {
      var count = window._sosPanelState.pastedBlocks.length;
      blockCountEl.textContent = count + ' bloc' + (count > 1 ? 's' : '') + ' collé' + (count > 1 ? 's' : '');
    }

    // Clear all blocks
    clearBlocksBtn.addEventListener('click', function() {
      window._sosPanelState.pastedBlocks = [];
      pastedBlocksContainer.innerHTML = '';
      updateBlockCount();
      clearBlocksBtn.style.display = 'none';
      analyzeBtn.disabled = true;
    });

    // Analyze button
    analyzeBtn.addEventListener('click', function() {
      analyzeContent();
    });

    // Back to paste step
    document.getElementById('sos-back-to-paste').addEventListener('click', function() {
      showStep('paste');
    });

    // Cancel add
    document.getElementById('sos-cancel-add').addEventListener('click', function() {
      showStep('paste');
    });

    // Confirm add to CRM
    document.getElementById('sos-confirm-add').addEventListener('click', function() {
      addToCRM();
    });

    // Prepare DM button in panel
    document.getElementById('sos-prepare-dm-btn').addEventListener('click', function() {
      var data = window._sosPanelState.analyzedData || {};
      var prospectData = {
        platform: window._sosPanelState.platform,
        username: username || data.username || '',
        fullName: document.getElementById('sos-result-fullname').value || data.fullName || '',
        headline: document.getElementById('sos-result-headline').value || data.headline || '',
        company: document.getElementById('sos-result-company').value || data.company || '',
        bio: data.bio || '',
        signals: window._sosPanelState.signals || [],
        angles: window._sosPanelState.angles || []
      };

      if (!prospectData.fullName) {
        sosShowToast('Analysez d\'abord un profil', 'warning');
        return;
      }

      sosShowPrepareDMModal(prospectData, function(prospect) {
        return sosSendMessage('generateDM', {
          platform: window._sosPanelState.platform,
          prospect: prospect
        });
      });
    });

    // Raw content toggle
    document.getElementById('sos-raw-toggle').addEventListener('click', function() {
      var toggle = this;
      var content = document.getElementById('sos-raw-content');
      toggle.classList.toggle('sos-raw-open');
      content.classList.toggle('sos-raw-visible');
    });

    function showStep(step) {
      document.getElementById('sos-step-paste').classList.toggle('active', step === 'paste');
      document.getElementById('sos-step-results').classList.toggle('active', step === 'results');
      document.getElementById('sos-footer-paste').style.display = step === 'paste' ? 'flex' : 'none';
      document.getElementById('sos-footer-results').style.display = step === 'results' ? 'flex' : 'none';
    }

    function analyzeContent() {
      console.log('[SOS Content] analyzeContent called');
      var allText = window._sosPanelState.pastedBlocks.map(function(b) { return b.text; }).join('\n\n---\n\n');
      console.log('[SOS Content] Sending to analyze, length:', allText.length);

      showStep('results');
      document.getElementById('sos-analysis-loading').style.display = 'flex';
      document.getElementById('sos-analysis-results').style.display = 'none';

      // Send to backend for AI analysis
      sosSendMessage('analyzeProspect', {
        platform: window._sosPanelState.platform,
        content: allText,
        username: username
      })
        .then(function(result) {
          console.log('[SOS Content] Analysis result:', result);
          console.log('[SOS Content] Signals received:', result.signals?.length || 0);
          window._sosPanelState.analyzedData = result.profile || {};
          window._sosPanelState.signals = result.signals || [];
          window._sosPanelState.angles = result.angles || [];

          displayResults(result);
        })
        .catch(function(err) {
          console.error('[SOS Content] Analysis failed:', err);
          sosError('Analysis failed', err);
          // Fallback: basic parsing
          var basicData = basicParse(allText);
          window._sosPanelState.analyzedData = basicData;
          displayResults({ profile: basicData, signals: [], angles: [] });
        });
    }

    function basicParse(text) {
      // Simple regex-based extraction as fallback
      var lines = text.split('\n').filter(function(l) { return l.trim(); });
      var data = { fullName: '', headline: '', company: '', bio: '' };

      // First non-empty line is often the name
      if (lines.length > 0) {
        var firstLine = lines[0].trim();
        if (firstLine.length < 50 && !firstLine.includes('http')) {
          data.fullName = firstLine;
        }
      }

      // Look for common patterns
      for (var i = 0; i < Math.min(lines.length, 10); i++) {
        var line = lines[i];
        if (line.includes(' chez ') || line.includes(' at ') || line.includes(' @ ')) {
          data.headline = line;
        }
        if (line.includes('À propos') || line.includes('About')) {
          data.bio = lines.slice(i + 1, i + 4).join(' ');
        }
      }

      return data;
    }

    function displayResults(result) {
      document.getElementById('sos-analysis-loading').style.display = 'none';
      document.getElementById('sos-analysis-results').style.display = 'block';

      var profile = result.profile || {};
      document.getElementById('sos-result-fullname').value = profile.fullName || '';
      document.getElementById('sos-result-headline').value = profile.headline || '';
      document.getElementById('sos-result-company').value = profile.company || '';

      // Populate raw content
      var rawText = window._sosPanelState.pastedBlocks.map(function(b, i) {
        return '--- Bloc ' + (i + 1) + ' ---\n' + b.text.substring(0, 500) + (b.text.length > 500 ? '...' : '');
      }).join('\n\n');
      document.getElementById('sos-raw-text').textContent = rawText;

      // Display signals
      var signalsList = document.getElementById('sos-signals-list');
      signalsList.innerHTML = '';
      var signals = result.signals || [];
      if (signals.length === 0) {
        signalsList.innerHTML = '<div class="sos-no-signals">Aucun signal détecté</div>';
      } else {
        signals.forEach(function(signal) {
          var isStrong = signal.type === 'fort';
          var signalEl = document.createElement('div');
          signalEl.className = 'sos-signal ' + (isStrong ? 'sos-signal-strong' : 'sos-signal-weak');
          signalEl.innerHTML =
            '<span class="sos-signal-icon">' + (isStrong ? '🔥' : '💡') + '</span>' +
            '<div class="sos-signal-content">' +
              '<span class="sos-signal-text">' + sosEscapeHtml(signal.text || '') + '</span>' +
              (signal.reason ? '<span class="sos-signal-reason">' + sosEscapeHtml(signal.reason) + '</span>' : '') +
            '</div>';
          signalsList.appendChild(signalEl);
        });
      }

      // Display angles
      var anglesList = document.getElementById('sos-angles-list');
      anglesList.innerHTML = '';
      var angles = result.angles || [];
      if (angles.length === 0) {
        anglesList.innerHTML = '<div class="sos-no-angles">Collez plus de contenu pour des suggestions</div>';
      } else {
        angles.forEach(function(angle) {
          var angleEl = document.createElement('div');
          angleEl.className = 'sos-angle';
          var hookText = typeof angle === 'string' ? angle : (angle.hook || angle.text || '');
          var reasonText = typeof angle === 'object' ? (angle.reason || '') : '';
          angleEl.innerHTML =
            '<span class="sos-angle-hook">' + sosEscapeHtml(hookText) + '</span>' +
            (reasonText ? '<span class="sos-angle-reason">' + sosEscapeHtml(reasonText) + '</span>' : '');
          anglesList.appendChild(angleEl);
        });
      }
    }

    function addToCRM() {
      var confirmBtn = document.getElementById('sos-confirm-add');
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="sos-spinner"></span>';

      var data = window._sosPanelState.analyzedData || {};
      var profileData = {
        platform: window._sosPanelState.platform,
        username: username || data.username || '',
        fullName: document.getElementById('sos-result-fullname').value || data.fullName || '',
        firstName: (document.getElementById('sos-result-fullname').value || '').split(' ')[0] || '',
        headline: document.getElementById('sos-result-headline').value || data.headline || '',
        company: document.getElementById('sos-result-company').value || data.company || '',
        bio: data.bio || '',
        about: data.bio || '',
        notes: document.getElementById('sos-result-notes').value || '',
        signals: window._sosPanelState.signals || [],
        angles: window._sosPanelState.angles || [],
        rawContent: window._sosPanelState.pastedBlocks.map(function(b) { return b.text; }).join('\n\n'),
        profileUrl: buildProfileUrl(window._sosPanelState.platform, username),
        source: 'smart_paste',
        manualEntry: true
      };

      var currentOnConfirm = window._sosPanelState.onConfirm;
      if (currentOnConfirm) {
        currentOnConfirm(profileData)
          .then(function() {
            sosShowToast('Prospect ajouté !', 'success');
            // Reset for next prospect
            resetPanel();
            confirmBtn.innerHTML = 'Ajouter au CRM';
            confirmBtn.disabled = false;
          })
          .catch(function(err) {
            sosError('Add failed', err);
            sosShowToast('Erreur: ' + (err.message || 'Échec'), 'error');
            confirmBtn.innerHTML = 'Ajouter au CRM';
            confirmBtn.disabled = false;
          });
      }
    }

    function resetPanel() {
      window._sosPanelState.pastedBlocks = [];
      window._sosPanelState.analyzedData = null;
      window._sosPanelState.signals = null;
      window._sosPanelState.angles = null;
      pastedBlocksContainer.innerHTML = '';
      updateBlockCount();
      clearBlocksBtn.style.display = 'none';
      analyzeBtn.disabled = true;
      document.getElementById('sos-result-notes').value = '';
      showStep('paste');
    }
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

  // ============================================
  // SYNC STATUS & RECENT IMPORTS
  // ============================================

  /**
   * Check authentication status and update the sync banner
   */
  function checkAndUpdateSyncStatus() {
    console.log('[SOS] Checking auth status...');
    sosSendMessage('getAuthStatus', {})
      .then(function(result) {
        console.log('[SOS] Auth status result:', result);
        var banner = document.getElementById('sos-sync-banner');
        if (!banner) {
          console.log('[SOS] Banner element not found');
          return;
        }

        if (result && result.isAuthenticated) {
          console.log('[SOS] User is authenticated!');
          banner.className = 'sos-sync-banner sos-sync-connected';
          banner.innerHTML =
            '<div class="sos-sync-icon">✅</div>' +
            '<div class="sos-sync-text">' +
              '<strong>Connecté</strong>' +
              '<span>Tes imports sont sauvegardés</span>' +
            '</div>' +
            '<button class="sos-sync-btn sos-sync-btn-open" id="sos-open-app-btn">Voir mes prospects</button>';

          document.getElementById('sos-open-app-btn').addEventListener('click', function() {
            window.open(window.SOS_CONFIG.APP_URL + '/prospects', '_blank');
          });
        } else {
          console.log('[SOS] User is NOT authenticated, result:', result);
          banner.className = 'sos-sync-banner sos-sync-warning';
          banner.innerHTML =
            '<div class="sos-sync-icon">⚠️</div>' +
            '<div class="sos-sync-text">' +
              '<strong>Non connecté</strong>' +
              '<span>Connecte-toi à l\'app pour synchroniser</span>' +
            '</div>' +
            '<button class="sos-sync-btn" id="sos-connect-app-btn">Se connecter</button>' +
            '<button class="sos-sync-btn sos-sync-btn-secondary" id="sos-refresh-auth-btn" title="Vérifier">🔄</button>';

          document.getElementById('sos-connect-app-btn').addEventListener('click', function() {
            // Open the app - the content-app.js will automatically sync the token
            window.open(window.SOS_CONFIG.APP_URL + '/login', '_blank');
          });

          document.getElementById('sos-refresh-auth-btn').addEventListener('click', function() {
            var btn = this;
            btn.disabled = true;
            btn.textContent = '...';
            checkAndUpdateSyncStatus();
            setTimeout(function() {
              btn.disabled = false;
              btn.textContent = '🔄';
            }, 1500);
          });
        }
      })
      .catch(function(err) {
        console.error('[SOS] Auth status check failed:', err);
        sosError('Failed to check auth status', err);
      });
  }

  /**
   * Load and display recent imports in the panel
   */
  function loadRecentImportsInPanel(currentPlatform) {
    sosGetStorage('importedProspects').then(function(prospects) {
      prospects = prospects || [];

      // Filter by current platform and sort by date
      var filtered = prospects
        .filter(function(p) { return p.platform === currentPlatform; })
        .sort(function(a, b) { return new Date(b.importedAt) - new Date(a.importedAt); })
        .slice(0, 5);

      var countEl = document.getElementById('sos-recent-count');
      var listEl = document.getElementById('sos-recent-list');

      if (!countEl || !listEl) return;

      countEl.textContent = filtered.length;

      if (filtered.length === 0) {
        listEl.innerHTML = '<div class="sos-recent-empty">Aucun import récent</div>';
        return;
      }

      listEl.innerHTML = filtered.map(function(p, index) {
        var initials = getInitialsFromName(p.fullName || p.username || '??');
        var timeAgo = formatTimeAgo(p.importedAt);
        var syncClass = p.synced ? 'sos-synced' : 'sos-local';
        var syncLabel = p.synced ? 'Sync' : 'Local';
        var profileUrl = buildProfileUrl(currentPlatform, p.username);
        var hasAnalysis = p.signals && p.signals.length > 0;

        return '<div class="sos-recent-item" data-index="' + index + '">' +
          '<div class="sos-recent-avatar">' + initials + '</div>' +
          '<div class="sos-recent-info">' +
            '<div class="sos-recent-name">' + sosEscapeHtml(p.fullName || p.username || 'Inconnu') + '</div>' +
            '<div class="sos-recent-meta">' +
              (hasAnalysis ? '🎯 ' + p.signals.length + ' signaux • ' : '') +
              sosEscapeHtml((p.headline || '').substring(0, 25)) + ' • ' + timeAgo +
            '</div>' +
          '</div>' +
          '<a href="' + profileUrl + '" target="_blank" class="sos-recent-link" title="Ouvrir le profil" onclick="event.stopPropagation();">🔗</a>' +
          '<span class="sos-recent-badge ' + syncClass + '">' + syncLabel + '</span>' +
        '</div>';
      }).join('');

      // Add click handlers to show analysis
      listEl.querySelectorAll('.sos-recent-item').forEach(function(item) {
        item.addEventListener('click', function() {
          var index = parseInt(item.dataset.index);
          var prospect = filtered[index];
          if (prospect) {
            showProspectAnalysis(prospect);
          }
        });
      });
    });
  }

  /**
   * Get initials from a name
   */
  function getInitialsFromName(name) {
    if (!name) return '??';
    var parts = name.trim().split(' ').filter(function(p) { return p; });
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return '??';
  }

  /**
   * Show a prospect's analysis in the panel
   */
  function showProspectAnalysis(prospect) {
    // Store in panel state
    window._sosPanelState.analyzedData = prospect;
    window._sosPanelState.signals = prospect.signals || [];
    window._sosPanelState.angles = prospect.angles || [];

    // Switch to results view
    var stepPaste = document.getElementById('sos-step-paste');
    var stepResults = document.getElementById('sos-step-results');
    var footerPaste = document.getElementById('sos-footer-paste');
    var footerResults = document.getElementById('sos-footer-results');

    if (stepPaste) stepPaste.classList.remove('active');
    if (stepResults) stepResults.classList.add('active');
    if (footerPaste) footerPaste.style.display = 'none';
    if (footerResults) footerResults.style.display = 'flex';

    // Hide loading, show results
    var loading = document.getElementById('sos-analysis-loading');
    var results = document.getElementById('sos-analysis-results');
    if (loading) loading.style.display = 'none';
    if (results) results.style.display = 'block';

    // Populate profile fields
    var fullnameEl = document.getElementById('sos-result-fullname');
    var headlineEl = document.getElementById('sos-result-headline');
    var companyEl = document.getElementById('sos-result-company');

    if (fullnameEl) fullnameEl.value = prospect.fullName || '';
    if (headlineEl) headlineEl.value = prospect.headline || '';
    if (companyEl) companyEl.value = prospect.company || '';

    // Populate signals
    var signalsList = document.getElementById('sos-signals-list');
    if (signalsList) {
      var signals = prospect.signals || [];
      if (signals.length === 0) {
        signalsList.innerHTML = '<div class="sos-no-signals">Aucun signal détecté</div>';
      } else {
        signalsList.innerHTML = signals.map(function(signal) {
          var isStrong = signal.type === 'fort';
          return '<div class="sos-signal ' + (isStrong ? 'sos-signal-strong' : 'sos-signal-weak') + '">' +
            '<span class="sos-signal-icon">' + (isStrong ? '🔥' : '💡') + '</span>' +
            '<div class="sos-signal-content">' +
              '<span class="sos-signal-text">' + sosEscapeHtml(signal.text || '') + '</span>' +
              (signal.reason ? '<span class="sos-signal-reason">' + sosEscapeHtml(signal.reason) + '</span>' : '') +
            '</div>' +
          '</div>';
        }).join('');
      }
    }

    // Populate angles
    var anglesList = document.getElementById('sos-angles-list');
    if (anglesList) {
      var angles = prospect.angles || [];
      if (angles.length === 0) {
        anglesList.innerHTML = '<div class="sos-no-angles">Aucun angle suggéré</div>';
      } else {
        anglesList.innerHTML = angles.map(function(angle) {
          var hookText = typeof angle === 'string' ? angle : (angle.hook || angle.text || '');
          var reasonText = typeof angle === 'object' ? (angle.reason || '') : '';
          return '<div class="sos-angle">' +
            '<span class="sos-angle-hook">' + sosEscapeHtml(hookText) + '</span>' +
            (reasonText ? '<span class="sos-angle-reason">' + sosEscapeHtml(reasonText) + '</span>' : '') +
          '</div>';
        }).join('');
      }
    }

    // Populate raw content if available
    var rawText = document.getElementById('sos-raw-text');
    if (rawText && prospect.rawContent) {
      rawText.textContent = prospect.rawContent.substring(0, 1000) + (prospect.rawContent.length > 1000 ? '...' : '');
    }

    // Populate notes
    var notesEl = document.getElementById('sos-result-notes');
    if (notesEl) {
      notesEl.value = prospect.notes || '';
    }

    // Collapse recent imports section
    var recentSection = document.getElementById('sos-recent-section');
    if (recentSection) {
      recentSection.classList.remove('sos-recent-open');
    }

    // Show toast
    sosShowToast('Analyse de ' + (prospect.fullName || prospect.username) + ' chargée', 'info');
  }

  /**
   * Format a date as relative time
   */
  function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    var now = new Date();
    var diffMs = now - date;
    var diffMins = Math.floor(diffMs / 60000);
    var diffHours = Math.floor(diffMs / 3600000);
    var diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'maintenant';
    if (diffMins < 60) return diffMins + 'min';
    if (diffHours < 24) return diffHours + 'h';
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return diffDays + 'j';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  // Log initialization
  sosLog('Common utilities loaded');

})();
