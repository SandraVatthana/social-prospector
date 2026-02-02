/**
 * SOS Prospection - LinkedIn Content Script
 * Assistant de saisie manuelle pour LinkedIn - 100% légal
 *
 * Version 2.0 - Formulaire manuel (pas de scraping automatique)
 * Depends on: content-common.js (loaded first via manifest)
 */

(function() {
  'use strict';

  var PLATFORM = 'linkedin';

  // ============================================
  // PAGE DETECTION
  // ============================================

  function detectPageType() {
    var url = window.location.href;
    if (url.indexOf('/search/results/people') > -1) return 'search';
    if (url.indexOf('/in/') > -1) return 'profile';
    if (url.indexOf('/messaging/') > -1) return 'messaging';
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
    var pageType = detectPageType();

    if (pageType === 'profile' || pageType === 'search') {
      // Ouvrir le formulaire de saisie manuelle
      var username = pageType === 'profile' ? getUsernameFromUrl() : '';

      sosShowManualInputModal({
        platform: PLATFORM,
        username: username,
        onConfirm: function(profileData) {
          return sendToApp({ profile: profileData, posts: [] });
        }
      });
    } else {
      sosShowToast('Allez sur un profil LinkedIn pour ajouter un prospect', 'warning');
    }
  }

  function handlePrepareDM() {
    // Pour préparer un DM, on demande d'abord les infos manuellement
    // puis on génère le message
    var username = getUsernameFromUrl();

    if (!username) {
      sosShowToast('Allez sur un profil LinkedIn pour préparer un DM', 'warning');
      return;
    }

    // On utilise le formulaire manuel pour collecter les infos
    sosShowManualInputModal({
      platform: PLATFORM,
      username: username,
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
    // Listen for prefill-dm event from common modal
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

    // Afficher le bouton sur les profils (pour saisie manuelle)
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
    sosLog('LinkedIn content script loaded (Manual Input Mode)');
    setupEventListeners();
    setTimeout(initUI, 1500);
    sosObserveUrlChanges(initUI);
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
