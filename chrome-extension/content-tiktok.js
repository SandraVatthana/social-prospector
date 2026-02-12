/**
 * SOS Prospection - TikTok Content Script
 * Assistant de saisie manuelle pour TikTok - 100% légal
 *
 * Version 2.0 - Formulaire manuel (pas de scraping automatique)
 * Depends on: content-common.js (loaded first via manifest)
 */

(function() {
  'use strict';

  var PLATFORM = 'tiktok';

  // ============================================
  // PAGE DETECTION
  // ============================================

  function detectPageType() {
    var path = window.location.pathname;

    // Profile page: /@username
    if (path.match(/^\/@[^\/]+\/?$/)) {
      return 'profile';
    }

    // Video page: /@username/video/xxx
    if (path.includes('/video/')) {
      return 'video';
    }

    // Discover/explore
    if (path.includes('/discover') || path.includes('/explore')) {
      return 'explore';
    }

    // Messages
    if (path.includes('/messages')) {
      return 'messages';
    }

    // For You page
    if (path === '/' || path === '/foryou' || path === '/for-you') {
      return 'feed';
    }

    return 'unknown';
  }

  function isProfilePage() {
    return detectPageType() === 'profile';
  }

  // ============================================
  // USERNAME EXTRACTION (from URL only - legal)
  // ============================================

  function getCurrentUsername() {
    var path = window.location.pathname;
    var match = path.match(/^\/@([^\/]+)/);
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
      posts: profileData.posts || profileData.videos || []
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

    // Method 1: If in messages
    if (pageType === 'messages') {
      var messageInput = document.querySelector('[data-e2e="message-input"]') ||
                         document.querySelector('textarea') ||
                         document.querySelector('[contenteditable="true"]');

      if (messageInput) {
        if (messageInput.tagName === 'TEXTAREA' || messageInput.tagName === 'INPUT') {
          messageInput.value = message;
          messageInput.focus();
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

    // Method 2: Try to find message button on profile
    if (pageType === 'profile') {
      var messageBtn = document.querySelector('[data-e2e="message-button"]') ||
                       document.querySelector('button[aria-label*="Message"]') ||
                       Array.from(document.querySelectorAll('button')).find(function(btn) {
                         return btn.innerText.toLowerCase().includes('message');
                       });

      if (messageBtn) {
        messageBtn.click();

        setTimeout(function() {
          var input = document.querySelector('[data-e2e="message-input"]') ||
                      document.querySelector('textarea');

          if (input) {
            input.value = message;
            input.focus();
            var evt = new Event('input', { bubbles: true });
            input.dispatchEvent(evt);
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
    var pageType = detectPageType();

    if (pageType !== 'profile') {
      sosShowToast('Va sur un profil TikTok pour ajouter un prospect', 'warning');
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
      sosShowToast('Va sur un profil TikTok pour préparer un DM', 'warning');
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
    sosLog('TikTok content script loaded (Manual Input Mode)');
    setupEventListeners();
    setTimeout(initUI, 2000);
    sosObserveUrlChanges(initUI);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
