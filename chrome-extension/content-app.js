/**
 * SOS Prospection - App Content Script
 * Runs on sosprospection.com (and localhost in dev) to sync auth token with extension
 */

(function() {
  'use strict';

  console.log('[SOS Extension] Content script loaded on app:', window.location.href);

  // Track if we've successfully synced
  var tokenSynced = false;

  // Listen for auth token messages from the app
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    var data = event.data;

    // Log all SOS messages for debugging
    if (data && data.type && data.type.indexOf('SOS_') === 0) {
      console.log('[SOS Extension] Message received:', data.type, data.action || '', 'token length:', data.token ? data.token.length : 0);
    }

    if (!data || data.type !== 'SOS_PROSPECTION_AUTH') return;

    console.log('[SOS Extension] Auth message:', data.action);

    if (data.action === 'setAuthToken' && data.token) {
      console.log('[SOS Extension] Saving token to extension storage, length:', data.token.length);
      chrome.runtime.sendMessage({
        action: 'saveAuthToken',
        token: data.token
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('[SOS Extension] Error saving token:', chrome.runtime.lastError.message);
          return;
        }
        console.log('[SOS Extension] Token save response:', response);
        if (response && response.success) {
          tokenSynced = true;
          console.log('[SOS Extension] ✅ Auth token synced successfully!');
          // Notify the app that sync was successful
          window.postMessage({
            type: 'SOS_PROSPECTION_AUTH_RESPONSE',
            success: true
          }, window.location.origin);
        }
      });
    } else if (data.action === 'clearAuthToken') {
      console.log('[SOS Extension] Clearing auth token...');
      chrome.runtime.sendMessage({
        action: 'saveAuthToken',
        token: null
      }, function(response) {
        tokenSynced = false;
        console.log('[SOS Extension] Auth token cleared');
      });
    }
  });

  // Function to request token from app
  function requestToken() {
    console.log('[SOS Extension] Requesting token from app...');
    window.postMessage({
      type: 'SOS_PROSPECTION_EXTENSION',
      installed: true,
      version: '3.1.0',
      requestToken: true
    }, window.location.origin);
  }

  // Function to check current auth status
  function checkAuthStatus() {
    chrome.runtime.sendMessage({ action: 'getAuthStatus' }, function(response) {
      console.log('[SOS Extension] Current auth status:', response);
      // If not authenticated, request token from app
      if (!response || !response.isAuthenticated) {
        console.log('[SOS Extension] Not authenticated, requesting token...');
        requestToken();
      } else {
        console.log('[SOS Extension] Already authenticated!');
        tokenSynced = true;
      }
    });
  }

  // Notify the app that the extension is installed and request token
  requestToken();

  // Request token multiple times with delays to handle React mounting timing
  setTimeout(requestToken, 500);
  setTimeout(requestToken, 1500);
  setTimeout(requestToken, 3000);
  setTimeout(requestToken, 6000);

  // Check current auth status
  checkAuthStatus();

  // Periodically check if we lost the token and need to re-sync
  setInterval(function() {
    if (!tokenSynced) {
      console.log('[SOS Extension] Token not synced, re-requesting...');
      requestToken();
    }
  }, 10000); // Every 10 seconds

  // Also check when the page becomes visible again (tab focus)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      console.log('[SOS Extension] Page became visible, checking auth...');
      checkAuthStatus();
    }
  });

})();
