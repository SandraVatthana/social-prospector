/**
 * SOS Prospection - App Content Script
 * Runs on sosprospection.com to sync auth token with extension
 */

(function() {
  'use strict';

  console.log('[SOS Extension] Content script loaded on app');

  // Listen for auth token messages from the app
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    var data = event.data;
    if (!data || data.type !== 'SOS_PROSPECTION_AUTH') return;

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
          window.postMessage({
            type: 'SOS_PROSPECTION_AUTH_RESPONSE',
            success: true
          }, window.location.origin);
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
        }, window.location.origin);
      });
    }
  });

  // Notify the app that the extension is installed and request the token
  console.log('[SOS Extension] Notifying app of extension presence');
  window.postMessage({
    type: 'SOS_PROSPECTION_EXTENSION',
    installed: true,
    version: '3.1.0',
    requestToken: true
  }, window.location.origin);

  // Request token again after delay (in case React hasn't mounted yet)
  setTimeout(function() {
    console.log('[SOS Extension] Requesting token (delayed)');
    window.postMessage({
      type: 'SOS_PROSPECTION_EXTENSION',
      installed: true,
      version: '3.1.0',
      requestToken: true
    }, window.location.origin);
  }, 1500);

  // Request again after longer delay
  setTimeout(function() {
    window.postMessage({
      type: 'SOS_PROSPECTION_EXTENSION',
      installed: true,
      version: '3.1.0',
      requestToken: true
    }, window.location.origin);
  }, 3000);

})();
