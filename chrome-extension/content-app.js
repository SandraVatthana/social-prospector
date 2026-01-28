/**
 * SOS Prospection - App Content Script
 * Runs on sosprospection.com to sync auth token with extension
 */

(function() {
  'use strict';

  console.log('[SOS Extension] Content script loaded on app');

  // Listen for auth token messages from the app
  window.addEventListener('message', function(event) {
    // Only accept messages from the same origin (the app)
    if (event.source !== window) {
      return;
    }

    var data = event.data;
    if (!data || data.type !== 'SOS_PROSPECTION_AUTH') {
      return;
    }

    console.log('[SOS Extension] Received auth message:', data.action);

    if (data.action === 'setAuthToken' && data.token) {
      chrome.runtime.sendMessage({
        action: 'saveAuthToken',
        token: data.token
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('[SOS Extension] Error saving token:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          console.log('[SOS Extension] Auth token synced with extension');
          // Notify the app that sync was successful
          window.postMessage({
            type: 'SOS_PROSPECTION_AUTH_RESPONSE',
            success: true
          }, '*');
        }
      });
    } else if (data.action === 'clearAuthToken') {
      chrome.runtime.sendMessage({
        action: 'saveAuthToken',
        token: null
      }, function(response) {
        console.log('[SOS Extension] Auth token cleared');
        window.postMessage({
          type: 'SOS_PROSPECTION_AUTH_RESPONSE',
          success: true,
          action: 'cleared'
        }, '*');
      });
    }
  });

  // Notify the app that the extension is installed
  window.postMessage({
    type: 'SOS_PROSPECTION_EXTENSION',
    installed: true,
    version: '3.1.0'
  }, '*');

})();
