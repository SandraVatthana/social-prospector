/**
 * SOS Prospection - Instagram Content Script
 * Assistant de saisie manuelle pour Instagram - 100% légal
 *
 * Version 2.0 - Formulaire manuel (pas de scraping automatique)
 * Depends on: content-common.js (loaded first via manifest)
 */

(function() {
  'use strict';

  var PLATFORM = 'instagram';

  // ============================================
  // PAGE DETECTION
  // ============================================

  function detectPageType() {
    var path = window.location.pathname;

    // Profile page: /username/ (not /p/, /reel/, /stories/, etc.)
    if (path.match(/^\/[^\/]+\/?$/) && !isSpecialPage(path)) {
      return 'profile';
    }

    // Post page: /p/xxx/
    if (path.indexOf('/p/') > -1) {
      return 'post';
    }

    // Reel page: /reel/xxx/ or /reels/xxx/
    if (path.indexOf('/reel') > -1) {
      return 'reel';
    }

    // Stories
    if (path.indexOf('/stories/') > -1) {
      return 'stories';
    }

    // Direct messages
    if (path.indexOf('/direct/') > -1) {
      return 'direct';
    }

    // Explore
    if (path.indexOf('/explore/') > -1) {
      return 'explore';
    }

    return 'unknown';
  }

  function isSpecialPage(path) {
    var special = ['/explore', '/reels', '/direct', '/accounts', '/p/', '/reel/', '/stories/'];
    return special.some(function(s) {
      return path.indexOf(s) > -1;
    });
  }

  function isProfilePage() {
    return detectPageType() === 'profile';
  }

  // ============================================
  // USERNAME EXTRACTION (from URL only - legal)
  // ============================================

  function getCurrentUsername() {
    var path = window.location.pathname;
    var match = path.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
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

    var pageType = detectPageType();

    // Method 1: If we're in DM view
    if (pageType === 'direct') {
      var messageInput = document.querySelector('textarea[placeholder*="Message"]') ||
                         document.querySelector('[contenteditable="true"]') ||
                         document.querySelector('[data-testid="message-text-input"]');

      if (messageInput) {
        if (messageInput.tagName === 'TEXTAREA') {
          messageInput.value = message;
          messageInput.focus();
          // Trigger input event
          var event = new Event('input', { bubbles: true });
          messageInput.dispatchEvent(event);
        } else {
          messageInput.innerText = message;
          messageInput.focus();
        }

        sosShowToast('Message pré-rempli !', 'success');
        return true;
      }
    }

    // Method 2: Try to open DM from profile
    if (pageType === 'profile') {
      // Find the "Message" button on profile
      var messageBtn = document.querySelector('button:has(svg[aria-label*="Message"])') ||
                       Array.from(document.querySelectorAll('button')).find(function(btn) {
                         return btn.innerText.toLowerCase().includes('message');
                       });

      if (messageBtn) {
        messageBtn.click();

        // Wait for DM modal/page and prefill
        setTimeout(function() {
          var input = document.querySelector('textarea[placeholder*="Message"]') ||
                      document.querySelector('[contenteditable="true"]');

          if (input) {
            if (input.tagName === 'TEXTAREA') {
              input.value = message;
              input.focus();
              var evt = new Event('input', { bubbles: true });
              input.dispatchEvent(evt);
            } else {
              input.innerText = message;
              input.focus();
            }
            sosShowToast('Message pré-rempli !', 'success');
          } else {
            sosCopyToClipboard(message);
            sosShowToast('Message copié - collez-le dans la conversation', 'info');
          }
        }, 2000);

        return true;
      }
    }

    // Fallback: copy to clipboard
    sosCopyToClipboard(message);
    sosShowToast('Message copié - ouvrez une conversation pour le coller', 'info');
    return false;
  }

  // ============================================
  // UI HANDLERS - Manual Input Mode
  // ============================================

  function handleImport() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil Instagram pour ajouter un prospect', 'warning');
      return;
    }

    var username = getCurrentUsername();

    // Ouvrir le formulaire de saisie manuelle
    sosShowManualInputModal({
      platform: PLATFORM,
      username: username || '',
      onConfirm: function(profileData) {
        return sendToApp({ profile: profileData, posts: [] });
      }
    });
  }

  function handlePrepareDM() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil Instagram pour préparer un DM', 'warning');
      return;
    }

    var username = getCurrentUsername();

    // On utilise le formulaire manuel pour collecter les infos
    sosShowManualInputModal({
      platform: PLATFORM,
      username: username || '',
      onConfirm: function(profileData) {
        // Après validation, on montre le modal de préparation DM
        return new Promise(function(resolve) {
          sosShowPrepareDMModal(profileData, function(prospect) {
            return generateDMViaApp(prospect);
          });
          resolve();
        });
      }
    });
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================

  function setupEventListeners() {
    document.addEventListener('sos-prefill-dm', function(e) {
      var detail = e.detail || {};
      prefillDM(detail.message, detail.prospect);
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initUI() {
    var pageType = detectPageType();

    if (pageType === 'profile') {
      sosCreateFloatingButton({
        platform: PLATFORM,
        onImport: handleImport,
        onPrepare: handlePrepareDM,
        showPrepare: true
      });
    }
  }

  function init() {
    sosLog('Instagram content script loaded (Manual Input Mode)');
    setupEventListeners();
    setTimeout(initUI, 2000); // Instagram loads slower
    sosObserveUrlChanges(initUI);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
