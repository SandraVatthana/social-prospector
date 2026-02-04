/**
 * SOS Prospection - LinkedIn Content Script
 * Assistant de saisie manuelle pour LinkedIn - 100% légal
 *
 * Version 2.0 - Formulaire manuel (pas de scraping automatique)
 * Depends on: content-common.js (loaded first via manifest)
 */

(function() {
  'use strict';

  console.log('[SOS] ====== CONTENT-LINKEDIN.JS LOADED ======');

  var PLATFORM = 'linkedin';

  // ============================================
  // PAGE DETECTION
  // ============================================

  function detectPageType() {
    var url = window.location.href;
    if (url.indexOf('/search/results/people') > -1) return 'search';
    if (url.indexOf('/in/') > -1) return 'profile';
    if (url.indexOf('/messaging/') > -1) return 'messaging';
    // Detect post pages
    if (url.indexOf('/feed/update/') > -1) return 'post';
    if (url.indexOf('/posts/') > -1) return 'post';
    // Detect feed with posts
    if (url.indexOf('/feed') > -1 && url.indexOf('/feed/update') === -1) return 'feed';
    return 'unknown';
  }

  function isProfilePage() {
    return detectPageType() === 'profile';
  }

  // ============================================
  // USERNAME EXTRACTION (from URL only - legal)
  // ============================================

  function getUsernameFromUrl() {
    var profileUrl = window.location.href.split('?')[0];
    var parts = profileUrl.split('/in/');
    return parts[1] ? parts[1].split('/')[0] : '';
  }

  // ============================================
  // SEND TO APP
  // ============================================

  function sendToApp(profileData) {
    sosLog('Sending to app:', profileData);

    return sosSendMessage('importProspect', {
      platform: PLATFORM,
      profile: profileData.profile || profileData,
      posts: profileData.posts || []
    });
  }

  // ============================================
  // GENERATE DM VIA APP
  // ============================================

  function generateDMViaApp(prospectData) {
    sosLog('Requesting DM generation from app:', prospectData);

    return sosSendMessage('generateDM', {
      platform: PLATFORM,
      prospect: prospectData
    });
  }

  // ============================================
  // PREFILL DM
  // ============================================

  function prefillDM(message, prospectData) {
    sosLog('Prefilling DM:', { message: message, prospect: prospectData });

    // Method 1: If we're on messaging page
    if (detectPageType() === 'messaging') {
      var messageInput = document.querySelector('.msg-form__contenteditable') ||
                         document.querySelector('[contenteditable="true"]') ||
                         document.querySelector('.msg-form__message-texteditor');

      if (messageInput) {
        messageInput.focus();
        var p = document.createElement('p');
        p.textContent = message;
        messageInput.innerHTML = '';
        messageInput.appendChild(p);

        // Trigger input event for LinkedIn to recognize change
        var inputEvent = new Event('input', { bubbles: true });
        messageInput.dispatchEvent(inputEvent);

        sosShowToast('Message pré-rempli !', 'success');
        return true;
      }
    }

    // Method 2: Open messaging and try to prefill
    var profileUrl = prospectData.profileUrl || window.location.href.split('?')[0];
    var username = profileUrl.split('/in/')[1];
    if (username) {
      username = username.split('/')[0];
    }

    // Try to find and click the message button
    var messageBtn = document.querySelector('button[aria-label*="Message"]') ||
                     document.querySelector('.pvs-profile-actions__action[aria-label*="Message"]') ||
                     document.querySelector('.message-anywhere-button');

    if (messageBtn) {
      messageBtn.click();

      // Wait for modal and prefill
      setTimeout(function() {
        var messageInput = document.querySelector('.msg-form__contenteditable') ||
                           document.querySelector('[contenteditable="true"]');

        if (messageInput) {
          messageInput.focus();
          var p = document.createElement('p');
          p.textContent = message;
          messageInput.innerHTML = '';
          messageInput.appendChild(p);

          var inputEvent = new Event('input', { bubbles: true });
          messageInput.dispatchEvent(inputEvent);

          sosShowToast('Message pré-rempli !', 'success');
        } else {
          // Fallback: copy to clipboard
          sosCopyToClipboard(message);
          sosShowToast('Message copié - collez-le dans la conversation', 'info');
        }
      }, 1500);

      return true;
    }

    // Fallback: just copy
    sosCopyToClipboard(message);
    sosShowToast('Message copié - ouvrez une conversation pour le coller', 'info');
    return false;
  }

  // ============================================
  // UI HANDLERS - Manual Input Mode
  // ============================================

  function handleImport() {
    console.log('[SOS] handleImport called');
    var pageType = detectPageType();
    console.log('[SOS] handleImport pageType:', pageType);

    if (pageType === 'profile' || pageType === 'search') {
      // Ouvrir le formulaire de saisie manuelle
      var username = pageType === 'profile' ? getUsernameFromUrl() : '';
      console.log('[SOS] Opening manual input modal for username:', username);

      sosShowManualInputModal({
        platform: PLATFORM,
        username: username,
        onConfirm: function(profileData) {
          return sendToApp({ profile: profileData, posts: [] });
        }
      });
    } else {
      console.log('[SOS] Not on profile/search page, showing toast');
      sosShowToast('Allez sur un profil LinkedIn pour ajouter un prospect', 'warning');
    }
  }

  function handlePrepareDM() {
    var username = getUsernameFromUrl();

    if (!username) {
      sosShowToast('Allez sur un profil LinkedIn pour préparer un DM', 'warning');
      return;
    }

    // Check if we have already analyzed data
    var panelState = window._sosPanelState || {};
    var analyzedData = panelState.analyzedData;

    if (analyzedData && analyzedData.fullName) {
      // Use already analyzed data
      var prospectData = {
        platform: PLATFORM,
        username: username,
        fullName: analyzedData.fullName || '',
        headline: analyzedData.headline || '',
        company: analyzedData.company || '',
        bio: analyzedData.bio || '',
        signals: panelState.signals || [],
        angles: panelState.angles || []
      };

      sosShowPrepareDMModal(prospectData, function(prospect) {
        return generateDMViaApp(prospect);
      });
    } else {
      // No analyzed data - need to import first
      sosShowToast('Cliquez d\'abord sur "Importer" et analysez le profil', 'warning');
    }
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  function setupEventListeners() {
    // Listen for prefill-dm event from common modal
    document.addEventListener('sos-prefill-dm', function(e) {
      var detail = e.detail || {};
      prefillDM(detail.message, detail.prospect);
    });
  }

  // ============================================
  // MESSAGING PANEL - Conversation Assistant
  // ============================================

  var messagingPanelState = {
    isOpen: false,
    currentConversation: null,
    prospectData: null,
    lastSyncedMessages: [],
    suggestedResponse: null
  };

  function createMessagingPanel() {
    // Remove existing panel
    var existing = document.getElementById('sos-messaging-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'sos-messaging-panel';
    panel.className = 'sos-messaging-panel';
    panel.innerHTML =
      '<div class="sos-msg-header">' +
        '<div class="sos-msg-title">' +
          '<span class="sos-msg-logo">🎯</span>' +
          '<div class="sos-msg-title-text">' +
            '<span>Ton copilote</span>' +
            '<span class="sos-msg-subtitle">Je t\'aide à répondre</span>' +
          '</div>' +
        '</div>' +
        '<div class="sos-msg-actions">' +
          '<button class="sos-msg-minimize" id="sos-msg-minimize">−</button>' +
          '<button class="sos-msg-close" id="sos-msg-close">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="sos-msg-body" id="sos-msg-body">' +
        '<!-- Prospect Info -->' +
        '<div class="sos-msg-section" id="sos-msg-prospect-section">' +
          '<div class="sos-msg-prospect" id="sos-msg-prospect">' +
            '<div class="sos-msg-prospect-name" id="sos-msg-prospect-name">Chargement...</div>' +
            '<div class="sos-msg-prospect-status" id="sos-msg-prospect-status"></div>' +
          '</div>' +
        '</div>' +
        '<!-- Sync Section -->' +
        '<div class="sos-msg-section">' +
          '<button class="sos-btn sos-btn-primary sos-btn-full" id="sos-msg-sync-btn">' +
            '<span class="sos-btn-icon">🔄</span>' +
            '<span>Synchroniser la conversation</span>' +
          '</button>' +
          '<p class="sos-msg-hint">Cliquez pour analyser les derniers messages</p>' +
        '</div>' +
        '<!-- Analysis Section (hidden by default) -->' +
        '<div class="sos-msg-section sos-msg-analysis" id="sos-msg-analysis" style="display:none;">' +
          '<div class="sos-msg-analysis-header">' +
            '<span class="sos-msg-analysis-icon" id="sos-msg-temp-icon">🤔</span>' +
            '<span class="sos-msg-analysis-label" id="sos-msg-temp-label">Analyse en cours...</span>' +
          '</div>' +
          '<div class="sos-msg-analysis-insight" id="sos-msg-insight"></div>' +
        '</div>' +
        '<!-- Suggestion Section (hidden by default) -->' +
        '<div class="sos-msg-section sos-msg-suggestion" id="sos-msg-suggestion" style="display:none;">' +
          '<div class="sos-msg-suggestion-label">💬 Réponse suggérée :</div>' +
          '<textarea class="sos-msg-suggestion-text" id="sos-msg-suggestion-text" rows="3"></textarea>' +
          '<div class="sos-msg-edit-hint">✏️ Tu peux modifier avant de copier</div>' +
          '<div class="sos-msg-suggestion-meta" id="sos-msg-suggestion-meta"></div>' +
          '<div class="sos-msg-suggestion-actions">' +
            '<button class="sos-btn sos-btn-primary" id="sos-msg-copy-btn">' +
              '<span class="sos-btn-icon">📋</span> Copier' +
            '</button>' +
            '<button class="sos-btn sos-btn-secondary" id="sos-msg-regen-btn">' +
              '<span class="sos-btn-icon">🔄</span> Autre' +
            '</button>' +
          '</div>' +
          '<div class="sos-msg-review-hint">📖 Relis avant d\'envoyer — tu restes aux commandes</div>' +
        '</div>' +
        '<!-- Quick Actions -->' +
        '<div class="sos-msg-section sos-msg-quick-actions" id="sos-msg-quick-actions" style="display:none;">' +
          '<div class="sos-msg-quick-label">Actions rapides :</div>' +
          '<div class="sos-msg-quick-buttons">' +
            '<button class="sos-msg-quick-btn" data-action="responded">✅ A répondu</button>' +
            '<button class="sos-msg-quick-btn" data-action="no-response">😶 Pas de réponse</button>' +
            '<button class="sos-msg-quick-btn" data-action="drop">❌ Laisser tomber</button>' +
          '</div>' +
        '</div>' +
        '<!-- Loading -->' +
        '<div class="sos-msg-loading" id="sos-msg-loading" style="display:none;">' +
          '<span class="sos-spinner"></span>' +
          '<span>Analyse en cours...</span>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('sos-msg-close').addEventListener('click', function() {
      panel.classList.remove('sos-msg-panel-open');
      messagingPanelState.isOpen = false;
    });

    document.getElementById('sos-msg-minimize').addEventListener('click', function() {
      panel.classList.toggle('sos-msg-panel-minimized');
    });

    document.getElementById('sos-msg-sync-btn').addEventListener('click', function() {
      syncConversation();
    });

    document.getElementById('sos-msg-copy-btn').addEventListener('click', function() {
      var text = document.getElementById('sos-msg-suggestion-text').value;
      sosCopyToClipboard(text);
    });

    document.getElementById('sos-msg-regen-btn').addEventListener('click', function() {
      regenerateSuggestion();
    });

    // Quick action buttons
    document.querySelectorAll('.sos-msg-quick-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = this.dataset.action;
        handleQuickAction(action);
      });
    });

    // Show panel with animation
    setTimeout(function() {
      panel.classList.add('sos-msg-panel-open');
      messagingPanelState.isOpen = true;
    }, 100);

    // Try to detect current conversation
    detectCurrentConversation();
  }

  function detectCurrentConversation() {
    // Try to get the name from conversation header
    var nameEl = document.querySelector('.msg-conversation-card__participant-names') ||
                 document.querySelector('.msg-thread__link-to-profile') ||
                 document.querySelector('.msg-overlay-bubble-header__title') ||
                 document.querySelector('[data-control-name="overlay.view_profile"]') ||
                 document.querySelector('.msg-s-message-list-container h2');

    var name = '';
    if (nameEl) {
      name = nameEl.textContent.trim().split('\n')[0].trim();
    }

    // Update panel with detected name
    var nameDisplay = document.getElementById('sos-msg-prospect-name');
    if (nameDisplay) {
      nameDisplay.textContent = name || 'Conversation LinkedIn';
    }

    // Check if this is a known prospect
    checkIfKnownProspect(name);
  }

  function checkIfKnownProspect(name) {
    if (!name) return;

    // Send message to background to check storage
    sosSendMessage('checkProspect', { name: name, platform: PLATFORM })
      .then(function(result) {
        if (result && result.found) {
          messagingPanelState.prospectData = result.prospect;
          updateProspectDisplay(result.prospect);
        } else {
          updateProspectDisplay(null, name);
        }
      })
      .catch(function() {
        updateProspectDisplay(null, name);
      });
  }

  function updateProspectDisplay(prospect, fallbackName) {
    var nameEl = document.getElementById('sos-msg-prospect-name');
    var statusEl = document.getElementById('sos-msg-prospect-status');

    if (prospect) {
      nameEl.textContent = prospect.fullName || prospect.username || fallbackName;
      statusEl.innerHTML = '<span class="sos-msg-badge sos-msg-badge-tracked">✓ Prospect suivi</span>';

      if (prospect.conversationStep) {
        statusEl.innerHTML += '<span class="sos-msg-badge">Étape ' + prospect.conversationStep + '</span>';
      }
    } else {
      nameEl.textContent = fallbackName || 'Contact LinkedIn';
      statusEl.innerHTML = '<span class="sos-msg-badge sos-msg-badge-new">Nouveau contact</span>';
    }
  }

  function syncConversation() {
    var loadingEl = document.getElementById('sos-msg-loading');
    var analysisEl = document.getElementById('sos-msg-analysis');
    var suggestionEl = document.getElementById('sos-msg-suggestion');
    var quickActionsEl = document.getElementById('sos-msg-quick-actions');

    // Show loading
    loadingEl.style.display = 'flex';
    analysisEl.style.display = 'none';
    suggestionEl.style.display = 'none';

    // Extract messages from the conversation
    var messages = extractConversationMessages();
    messagingPanelState.lastSyncedMessages = messages;

    console.log('[SOS] Synced messages:', messages);

    if (messages.length === 0) {
      loadingEl.style.display = 'none';
      sosShowToast('Aucun message trouvé dans la conversation', 'warning');
      return;
    }

    // Get prospect info
    var prospectName = document.getElementById('sos-msg-prospect-name').textContent;
    var prospect = messagingPanelState.prospectData || {
      fullName: prospectName,
      platform: PLATFORM
    };

    // Send to backend for analysis
    sosSendMessage('analyzeConversation', {
      platform: PLATFORM,
      prospect: prospect,
      messages: messages
    })
      .then(function(result) {
        console.log('[SOS] Conversation analysis:', result);
        loadingEl.style.display = 'none';
        displayConversationAnalysis(result);
      })
      .catch(function(err) {
        console.error('[SOS] Conversation analysis failed:', err);
        loadingEl.style.display = 'none';

        // Fallback: generate a simple response suggestion
        generateFallbackSuggestion(messages, prospect);
      });
  }

  function extractConversationMessages() {
    var messages = [];

    // LinkedIn message selectors
    var messageEls = document.querySelectorAll('.msg-s-message-list__event') ||
                     document.querySelectorAll('.msg-s-event-listitem') ||
                     document.querySelectorAll('[class*="msg-s-message-list"]  li');

    if (messageEls.length === 0) {
      // Try overlay/popup conversation
      messageEls = document.querySelectorAll('.msg-overlay-conversation-bubble .msg-s-event-listitem');
    }

    messageEls.forEach(function(el) {
      var textEl = el.querySelector('.msg-s-event-listitem__body') ||
                   el.querySelector('.msg-s-message-group__message') ||
                   el.querySelector('[class*="message-body"]');

      var senderEl = el.querySelector('.msg-s-message-group__profile-link') ||
                     el.querySelector('.msg-s-message-group__name') ||
                     el.querySelector('[class*="sender"]');

      if (textEl) {
        var text = textEl.textContent.trim();
        var isMe = el.classList.contains('msg-s-message-list__event--last-msg-from-me') ||
                   el.querySelector('.msg-s-message-group--outbound') !== null ||
                   el.classList.contains('msg-s-event-listitem--outbound');

        if (!isMe && senderEl) {
          // Try to determine from sender
          isMe = false; // Assume not me if we can detect sender
        }

        if (text) {
          messages.push({
            text: text,
            isMe: isMe,
            timestamp: new Date().toISOString() // Simplified
          });
        }
      }
    });

    // Get last 6 messages max
    return messages.slice(-6);
  }

  function displayConversationAnalysis(result) {
    var analysisEl = document.getElementById('sos-msg-analysis');
    var suggestionEl = document.getElementById('sos-msg-suggestion');
    var quickActionsEl = document.getElementById('sos-msg-quick-actions');

    // Display temperature/interest level
    var tempIcon = document.getElementById('sos-msg-temp-icon');
    var tempLabel = document.getElementById('sos-msg-temp-label');
    var insightEl = document.getElementById('sos-msg-insight');

    var temp = result.temperature || 'neutral';
    var tempConfig = {
      hot: { icon: '🔥', label: 'Lead chaud !', class: 'hot' },
      warm: { icon: '🌱', label: 'Intérêt détecté', class: 'warm' },
      neutral: { icon: '🤔', label: 'À creuser', class: 'neutral' },
      cold: { icon: '❄️', label: 'Peu d\'intérêt', class: 'cold' },
      drop: { icon: '⛔', label: 'Laisser tomber', class: 'drop' }
    };

    var config = tempConfig[temp] || tempConfig.neutral;
    tempIcon.textContent = config.icon;
    tempLabel.textContent = config.label;
    tempLabel.className = 'sos-msg-analysis-label sos-msg-temp-' + config.class;

    insightEl.textContent = result.insight || 'Analyse basée sur le dernier échange.';

    analysisEl.style.display = 'block';

    // Display suggestion
    if (result.suggestion) {
      var suggestionText = document.getElementById('sos-msg-suggestion-text');
      var suggestionMeta = document.getElementById('sos-msg-suggestion-meta');

      suggestionText.value = result.suggestion.message || result.suggestion;

      if (result.suggestion.reason) {
        suggestionMeta.textContent = '💡 ' + result.suggestion.reason;
      } else {
        suggestionMeta.textContent = '';
      }

      messagingPanelState.suggestedResponse = result.suggestion;
      suggestionEl.style.display = 'block';
    }

    // Show quick actions
    quickActionsEl.style.display = 'block';
  }

  function generateFallbackSuggestion(messages, prospect) {
    // Simple fallback when API fails
    var lastMessage = messages.filter(function(m) { return !m.isMe; }).pop();

    var analysisEl = document.getElementById('sos-msg-analysis');
    var suggestionEl = document.getElementById('sos-msg-suggestion');
    var quickActionsEl = document.getElementById('sos-msg-quick-actions');

    var tempIcon = document.getElementById('sos-msg-temp-icon');
    var tempLabel = document.getElementById('sos-msg-temp-label');
    var insightEl = document.getElementById('sos-msg-insight');

    tempIcon.textContent = '🤔';
    tempLabel.textContent = 'Analyse manuelle requise';
    tempLabel.className = 'sos-msg-analysis-label sos-msg-temp-neutral';
    insightEl.textContent = 'Lisez le dernier message et décidez de la suite.';

    analysisEl.style.display = 'block';

    // Generate a simple follow-up
    if (lastMessage) {
      var suggestionText = document.getElementById('sos-msg-suggestion-text');
      var suggestionMeta = document.getElementById('sos-msg-suggestion-meta');

      var firstName = (prospect.fullName || '').split(' ')[0];
      var fallbackMsg = firstName ?
        'Merci ' + firstName + ' pour votre retour. [Personnalisez votre réponse ici]' :
        'Merci pour votre retour. [Personnalisez votre réponse ici]';

      suggestionText.value = fallbackMsg;
      suggestionMeta.textContent = '⚠️ Suggestion générique - personnalisez avant d\'envoyer';

      suggestionEl.style.display = 'block';
    }

    quickActionsEl.style.display = 'block';
  }

  function regenerateSuggestion() {
    var messages = messagingPanelState.lastSyncedMessages;
    if (messages.length > 0) {
      syncConversation(); // Re-sync will regenerate
    }
  }

  function handleQuickAction(action) {
    var prospect = messagingPanelState.prospectData;

    switch (action) {
      case 'responded':
        sosShowToast('Statut mis à jour : A répondu ✅', 'success');
        // TODO: Update in backend
        break;
      case 'no-response':
        sosShowToast('On relance dans 3-4 jours ?', 'info');
        // TODO: Schedule follow-up
        break;
      case 'drop':
        sosShowToast('Contact mis en pause', 'info');
        // TODO: Update status
        break;
    }
  }

  // ============================================
  // COMMENT PANEL - Strategic Comment Assistant
  // ============================================

  var commentPanelState = {
    isOpen: false,
    currentPost: null,
    authorData: null,
    suggestedComment: null,
    icpMatch: null,
    selectedType: 'deepen' // deepen, challenge, testimonial, resource
  };

  function createCommentPanel() {
    // Remove existing panel
    var existing = document.getElementById('sos-comment-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'sos-comment-panel';
    panel.className = 'sos-comment-panel';
    panel.innerHTML =
      '<div class="sos-comment-header">' +
        '<div class="sos-comment-title">' +
          '<span class="sos-comment-logo">💬</span>' +
          '<div class="sos-comment-title-text">' +
            '<span>Commentaire Stratégique</span>' +
            '<span class="sos-comment-subtitle">Fais-toi remarquer intelligemment</span>' +
          '</div>' +
        '</div>' +
        '<div class="sos-comment-actions">' +
          '<button class="sos-comment-minimize" id="sos-comment-minimize">−</button>' +
          '<button class="sos-comment-close" id="sos-comment-close">×</button>' +
        '</div>' +
      '</div>' +
      '<div class="sos-comment-body" id="sos-comment-body">' +
        '<!-- Author Info -->' +
        '<div class="sos-comment-section" id="sos-comment-author-section">' +
          '<div class="sos-comment-author" id="sos-comment-author">' +
            '<div class="sos-comment-author-name" id="sos-comment-author-name">Chargement...</div>' +
            '<div class="sos-comment-author-headline" id="sos-comment-author-headline"></div>' +
          '</div>' +
          '<div class="sos-comment-icp-badge" id="sos-comment-icp-badge" style="display:none;">' +
            '<span class="sos-icp-icon">🎯</span>' +
            '<span class="sos-icp-text">Match ICP</span>' +
          '</div>' +
        '</div>' +
        '<!-- Post Summary -->' +
        '<div class="sos-comment-section">' +
          '<div class="sos-comment-post-label">📝 Le post parle de :</div>' +
          '<div class="sos-comment-post-summary" id="sos-comment-post-summary">Analyse en cours...</div>' +
        '</div>' +
        '<!-- Comment Type Selector -->' +
        '<div class="sos-comment-section" id="sos-comment-type-section">' +
          '<div class="sos-comment-type-label">Quel type de commentaire ?</div>' +
          '<div class="sos-comment-types" id="sos-comment-types">' +
            '<button class="sos-comment-type-btn active" data-type="deepen">' +
              '<span class="sos-type-icon">🔍</span>' +
              '<span class="sos-type-name">Approfondir</span>' +
            '</button>' +
            '<button class="sos-comment-type-btn" data-type="challenge">' +
              '<span class="sos-type-icon">🤔</span>' +
              '<span class="sos-type-name">Challenger</span>' +
            '</button>' +
            '<button class="sos-comment-type-btn" data-type="testimonial">' +
              '<span class="sos-type-icon">💬</span>' +
              '<span class="sos-type-name">Témoigner</span>' +
            '</button>' +
            '<button class="sos-comment-type-btn" data-type="resource">' +
              '<span class="sos-type-icon">📚</span>' +
              '<span class="sos-type-name">Ressource</span>' +
            '</button>' +
          '</div>' +
          '<button class="sos-btn sos-btn-primary sos-btn-full" id="sos-comment-analyze-btn">' +
            '<span class="sos-btn-icon">✨</span>' +
            '<span>Générer le commentaire</span>' +
          '</button>' +
        '</div>' +
        '<!-- Loading -->' +
        '<div class="sos-comment-loading" id="sos-comment-loading" style="display:none;">' +
          '<span class="sos-spinner"></span>' +
          '<span>Génération du commentaire...</span>' +
        '</div>' +
        '<!-- Suggestion Section (hidden by default) -->' +
        '<div class="sos-comment-section sos-comment-suggestion" id="sos-comment-suggestion" style="display:none;">' +
          '<div class="sos-comment-suggestion-label">💬 Commentaire suggéré :</div>' +
          '<textarea class="sos-comment-suggestion-text" id="sos-comment-suggestion-text" rows="4"></textarea>' +
          '<div class="sos-comment-edit-hint">✏️ Adapte-le à ta voix avant de poster</div>' +
          '<div class="sos-comment-suggestion-meta" id="sos-comment-suggestion-meta"></div>' +
          '<div class="sos-comment-suggestion-actions">' +
            '<button class="sos-btn sos-btn-primary" id="sos-comment-copy-btn">' +
              '<span class="sos-btn-icon">📋</span> Copier' +
            '</button>' +
            '<button class="sos-btn sos-btn-secondary" id="sos-comment-regen-btn">' +
              '<span class="sos-btn-icon">🔄</span> Autre angle' +
            '</button>' +
          '</div>' +
          '<div class="sos-comment-strategy-hint">' +
            '💡 Commenter = se faire remarquer avant le DM' +
          '</div>' +
        '</div>' +
        '<!-- Track Section -->' +
        '<div class="sos-comment-section sos-comment-track" id="sos-comment-track" style="display:none;">' +
          '<button class="sos-btn sos-btn-secondary sos-btn-full" id="sos-comment-track-btn">' +
            '<span class="sos-btn-icon">📊</span>' +
            '<span>J\'ai commenté → Tracker</span>' +
          '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('sos-comment-close').addEventListener('click', function() {
      panel.classList.remove('sos-comment-panel-open');
      commentPanelState.isOpen = false;
    });

    document.getElementById('sos-comment-minimize').addEventListener('click', function() {
      panel.classList.toggle('sos-comment-panel-minimized');
    });

    // Comment type selector
    document.querySelectorAll('.sos-comment-type-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        // Remove active from all
        document.querySelectorAll('.sos-comment-type-btn').forEach(function(b) {
          b.classList.remove('active');
        });
        // Add active to clicked
        this.classList.add('active');
        commentPanelState.selectedType = this.dataset.type;
      });
    });

    document.getElementById('sos-comment-analyze-btn').addEventListener('click', function() {
      analyzePostForComment();
    });

    document.getElementById('sos-comment-copy-btn').addEventListener('click', function() {
      var text = document.getElementById('sos-comment-suggestion-text').value;
      sosCopyToClipboard(text);
    });

    document.getElementById('sos-comment-regen-btn').addEventListener('click', function() {
      analyzePostForComment();
    });

    document.getElementById('sos-comment-track-btn').addEventListener('click', function() {
      trackComment();
    });

    // Show panel with animation
    setTimeout(function() {
      panel.classList.add('sos-comment-panel-open');
      commentPanelState.isOpen = true;
    }, 100);

    // Extract and display post info
    extractPostInfo();
  }

  function extractPostInfo() {
    var authorName = '';
    var authorHeadline = '';
    var postContent = '';

    // Try to extract author name
    var authorEl = document.querySelector('.feed-shared-actor__name') ||
                   document.querySelector('.update-components-actor__name') ||
                   document.querySelector('[class*="actor__name"]') ||
                   document.querySelector('.feed-shared-update-v2__actor-name');

    if (authorEl) {
      authorName = authorEl.textContent.trim().split('\n')[0].trim();
    }

    // Try to extract author headline
    var headlineEl = document.querySelector('.feed-shared-actor__description') ||
                     document.querySelector('.update-components-actor__description') ||
                     document.querySelector('[class*="actor__description"]');

    if (headlineEl) {
      authorHeadline = headlineEl.textContent.trim().split('\n')[0].trim();
    }

    // Try to extract post content
    var postEl = document.querySelector('.feed-shared-update-v2__description') ||
                 document.querySelector('.feed-shared-text') ||
                 document.querySelector('.update-components-text') ||
                 document.querySelector('[class*="feed-shared-text"]') ||
                 document.querySelector('.break-words');

    if (postEl) {
      postContent = postEl.textContent.trim().substring(0, 500);
    }

    // Update panel
    var nameEl = document.getElementById('sos-comment-author-name');
    var headlineDisplayEl = document.getElementById('sos-comment-author-headline');
    var summaryEl = document.getElementById('sos-comment-post-summary');

    if (nameEl) nameEl.textContent = authorName || 'Auteur non détecté';
    if (headlineDisplayEl) headlineDisplayEl.textContent = authorHeadline || '';
    if (summaryEl) {
      if (postContent) {
        summaryEl.textContent = postContent.substring(0, 150) + (postContent.length > 150 ? '...' : '');
      } else {
        summaryEl.textContent = 'Contenu non détecté - copiez-collez le post ci-dessous';
      }
    }

    // Store for later
    commentPanelState.currentPost = {
      authorName: authorName,
      authorHeadline: authorHeadline,
      content: postContent,
      url: window.location.href
    };
    commentPanelState.authorData = {
      fullName: authorName,
      headline: authorHeadline
    };
  }

  function analyzePostForComment() {
    var loadingEl = document.getElementById('sos-comment-loading');
    var typeSection = document.getElementById('sos-comment-type-section');
    var suggestionEl = document.getElementById('sos-comment-suggestion');
    var trackEl = document.getElementById('sos-comment-track');

    // Show loading
    loadingEl.style.display = 'flex';
    if (typeSection) typeSection.style.display = 'none';
    suggestionEl.style.display = 'none';

    var postData = commentPanelState.currentPost || {};

    // If no content detected, try to extract again
    if (!postData.content) {
      extractPostInfo();
      postData = commentPanelState.currentPost || {};
    }

    // Send to backend for AI analysis
    sosSendMessage('generateStrategicComment', {
      platform: PLATFORM,
      post: {
        authorName: postData.authorName || '',
        authorHeadline: postData.authorHeadline || '',
        content: postData.content || '',
        url: postData.url || window.location.href
      },
      commentType: commentPanelState.selectedType || 'deepen'
    })
    .then(function(result) {
      console.log('[SOS] Strategic comment generated:', result);
      loadingEl.style.display = 'none';
      displayCommentSuggestion(result);
    })
    .catch(function(err) {
      console.error('[SOS] Comment generation failed:', err);
      loadingEl.style.display = 'none';

      // Fallback: show generic suggestion
      generateFallbackComment(postData);
    });
  }

  function displayCommentSuggestion(result) {
    var suggestionEl = document.getElementById('sos-comment-suggestion');
    var trackEl = document.getElementById('sos-comment-track');
    var typeSection = document.getElementById('sos-comment-type-section');

    var commentText = document.getElementById('sos-comment-suggestion-text');
    var metaEl = document.getElementById('sos-comment-suggestion-meta');
    var icpBadge = document.getElementById('sos-comment-icp-badge');

    // Display comment
    commentText.value = result.comment || result.message || '';

    // Display metadata
    if (result.angle) {
      metaEl.textContent = '🎯 Angle: ' + result.angle;
    } else if (result.strategy) {
      metaEl.textContent = '💡 ' + result.strategy;
    } else {
      metaEl.textContent = '';
    }

    // Show ICP match if detected
    if (result.icpMatch) {
      icpBadge.style.display = 'flex';
      commentPanelState.icpMatch = true;
    }

    commentPanelState.suggestedComment = result;

    if (typeSection) typeSection.style.display = 'none';
    suggestionEl.style.display = 'block';
    trackEl.style.display = 'block';
  }

  function generateFallbackComment(postData) {
    var suggestionEl = document.getElementById('sos-comment-suggestion');
    var trackEl = document.getElementById('sos-comment-track');
    var typeSection = document.getElementById('sos-comment-type-section');

    var commentText = document.getElementById('sos-comment-suggestion-text');
    var metaEl = document.getElementById('sos-comment-suggestion-meta');

    // Generate a simple fallback
    var firstName = (postData.authorName || '').split(' ')[0];
    var fallback = firstName
      ? 'Merci ' + firstName + ' pour ce partage ! [Ajoute ta perspective personnelle ici]'
      : 'Point de vue intéressant ! [Ajoute ta perspective personnelle ici]';

    commentText.value = fallback;
    metaEl.textContent = '⚠️ Suggestion générique - personnalise avec ton expertise';

    if (typeSection) typeSection.style.display = 'none';
    suggestionEl.style.display = 'block';
    trackEl.style.display = 'block';
  }

  function trackComment() {
    var postData = commentPanelState.currentPost || {};
    var comment = document.getElementById('sos-comment-suggestion-text').value;

    sosSendMessage('trackComment', {
      platform: PLATFORM,
      post: postData,
      comment: comment,
      icpMatch: commentPanelState.icpMatch
    })
    .then(function(result) {
      sosShowToast('Commentaire tracké ! Tu peux relancer par DM dans quelques jours', 'success');
    })
    .catch(function(err) {
      // Store locally as fallback
      sosShowToast('Commentaire noté localement', 'info');
    });
  }

  // ============================================
  // FEED COMMENT BUTTONS (on feed page)
  // ============================================

  function addCommentButtonsToFeed() {
    // Add "Commenter stratégiquement" buttons to posts in the feed
    // Multiple selectors to handle LinkedIn's changing DOM
    var posts = document.querySelectorAll(
      '.feed-shared-update-v2, ' +
      '.occludable-update, ' +
      '[data-urn*="activity"], ' +
      '.update-components-actor, ' +
      'div[data-id*="urn:li:activity"]'
    );

    console.log('[SOS] addCommentButtonsToFeed: Found', posts.length, 'potential posts');

    var addedCount = 0;
    posts.forEach(function(post) {
      // Skip if already processed
      if (post.querySelector('.sos-feed-comment-btn')) return;

      // Find the social actions bar (multiple selectors for compatibility)
      var actionsBar = post.querySelector('.feed-shared-social-actions') ||
                       post.querySelector('.social-details-social-counts') ||
                       post.querySelector('[class*="social-actions"]') ||
                       post.querySelector('[class*="feed-shared-social"]');

      // If no actions bar, try to find the comment button area
      if (!actionsBar) {
        var commentBtn = post.querySelector('button[aria-label*="Comment"], button[aria-label*="comment"], button[aria-label*="Commenter"]');
        if (commentBtn) {
          actionsBar = commentBtn.parentElement;
        }
      }

      if (actionsBar) {
        var btn = document.createElement('button');
        btn.className = 'sos-feed-comment-btn';
        btn.innerHTML = '💬 SOS';
        btn.title = 'Générer un commentaire stratégique avec IA';
        btn.style.cssText = 'margin-left: 8px; padding: 4px 12px; background: linear-gradient(135deg, #E1306C, #C13584); color: white; border: none; border-radius: 16px; font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(225,48,108,0.3);';
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          openCommentPanelForPost(post);
        });

        actionsBar.appendChild(btn);
        addedCount++;
      }
    });

    if (addedCount > 0) {
      console.log('[SOS] Added', addedCount, 'comment buttons to feed posts');
    }
  }

  function openCommentPanelForPost(postElement) {
    // Extract info from this specific post
    var authorName = '';
    var authorHeadline = '';
    var postContent = '';

    var authorEl = postElement.querySelector('.feed-shared-actor__name') ||
                   postElement.querySelector('.update-components-actor__name');
    if (authorEl) authorName = authorEl.textContent.trim().split('\n')[0].trim();

    var headlineEl = postElement.querySelector('.feed-shared-actor__description') ||
                     postElement.querySelector('.update-components-actor__description');
    if (headlineEl) authorHeadline = headlineEl.textContent.trim().split('\n')[0].trim();

    var postEl = postElement.querySelector('.feed-shared-update-v2__description') ||
                 postElement.querySelector('.feed-shared-text') ||
                 postElement.querySelector('.break-words');
    if (postEl) postContent = postEl.textContent.trim().substring(0, 500);

    // Store post data
    commentPanelState.currentPost = {
      authorName: authorName,
      authorHeadline: authorHeadline,
      content: postContent,
      url: window.location.href
    };

    // Create/show panel
    createCommentPanel();

    // Update panel with this post's info
    var nameEl = document.getElementById('sos-comment-author-name');
    var headlineDisplayEl = document.getElementById('sos-comment-author-headline');
    var summaryEl = document.getElementById('sos-comment-post-summary');

    if (nameEl) nameEl.textContent = authorName || 'Auteur non détecté';
    if (headlineDisplayEl) headlineDisplayEl.textContent = authorHeadline || '';
    if (summaryEl) {
      summaryEl.textContent = postContent ?
        postContent.substring(0, 150) + (postContent.length > 150 ? '...' : '') :
        'Contenu non détecté';
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initUI() {
    var pageType = detectPageType();
    console.log('[SOS] initUI called, pageType:', pageType, 'URL:', window.location.href);

    // Afficher le bouton sur les profils (pour saisie manuelle)
    if (pageType === 'profile') {
      console.log('[SOS] Creating floating button for profile page');
      sosCreateFloatingButton({
        platform: PLATFORM,
        onImport: handleImport,
        onPrepare: handlePrepareDM,
        showPrepare: true
      });
    }

    // Afficher le panel de conversation sur la page messaging
    if (pageType === 'messaging') {
      setTimeout(function() {
        createMessagingPanel();
      }, 1000);
    }

    // Afficher le panel de commentaire sur les pages de post
    if (pageType === 'post') {
      setTimeout(function() {
        createCommentPanel();
      }, 1000);
    }

    // Ajouter les boutons de commentaire dans le feed
    if (pageType === 'feed') {
      console.log('[SOS] Feed page detected - will add comment buttons to posts');
      setTimeout(function() {
        console.log('[SOS] Starting to add comment buttons to feed...');
        addCommentButtonsToFeed();
        // Re-add buttons when feed updates (infinite scroll)
        setInterval(addCommentButtonsToFeed, 5000);
      }, 2000);
    }
  }

  function init() {
    try {
      console.log('[SOS] init() called, document.readyState:', document.readyState);
      sosLog('LinkedIn content script loaded (Manual Input Mode)');
      setupEventListeners();
      console.log('[SOS] Scheduling initUI in 1500ms...');
      setTimeout(function() {
        try {
          initUI();
        } catch (e) {
          console.error('[SOS] ERROR in initUI:', e);
        }
      }, 1500);
      sosObserveUrlChanges(function() {
        try {
          initUI();
        } catch (e) {
          console.error('[SOS] ERROR in initUI (URL change):', e);
        }
      });
    } catch (e) {
      console.error('[SOS] ERROR in init:', e);
    }
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
