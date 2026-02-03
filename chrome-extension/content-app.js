/**
 * SOS Prospection - App Content Script
 * Runs on sosprospection.com to sync auth token with extension
 */

(function() {
  'use strict';

  var DEBUG = true; // Enable for troubleshooting
  function sosLog() { if (DEBUG) console.log.apply(console, ['[SOS Extension]'].concat(Array.from(arguments))); }
  function sosError() { if (DEBUG) console.error.apply(console, ['[SOS Extension]'].concat(Array.from(arguments))); }

  sosLog('Content script loaded on app');

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

    sosLog('Received auth message:', data.action);

    if (data.action === 'setAuthToken' && data.token) {
      chrome.runtime.sendMessage({
        action: 'saveAuthToken',
        token: data.token
      }, function(response) {
        if (chrome.runtime.lastError) {
          sosError('Error saving token:', chrome.runtime.lastError.message);
          return;
        }
        if (response && response.success) {
          sosLog('Auth token synced with extension');
          // Notify the app that sync was successful
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
        sosLog('Auth token cleared');
        window.postMessage({
          type: 'SOS_PROSPECTION_AUTH_RESPONSE',
          success: true,
          action: 'cleared'
        }, window.location.origin);
      });
    }
  });

  // Notify the app that the extension is installed and request the auth token
  sosLog('Sending extension presence notification to app');
  window.postMessage({
    type: 'SOS_PROSPECTION_EXTENSION',
    installed: true,
    version: '3.1.0',
    requestToken: true // Tell the app we need the token
  }, window.location.origin);

  // Also request token after a short delay (in case app React hasn't mounted yet)
  setTimeout(function() {
    sosLog('Requesting auth token from app (delayed)');
    window.postMessage({
      type: 'SOS_PROSPECTION_EXTENSION',
      installed: true,
      version: '3.1.0',
      requestToken: true
    }, window.location.origin);
  }, 1000);

  // Inject a small script to read the token from localStorage and send it
  // This works around the isolated world limitation
  var injectedScript = document.createElement('script');
  injectedScript.textContent = '(' + function() {
    // This runs in the page's context, not the extension's context
    function sendTokenToExtension() {
      try {
        var token = null;
        var keys = Object.keys(localStorage);

        console.log('[SOS Injected] Searching for auth token in', keys.length, 'localStorage keys');

        // Search all keys for Supabase auth patterns
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];

          // Supabase v2 pattern: sb-<ref>-auth-token
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            console.log('[SOS Injected] Found Supabase key:', key);
            try {
              var data = JSON.parse(localStorage.getItem(key));
              if (data && data.access_token) {
                token = data.access_token;
                console.log('[SOS Injected] Got access_token from', key);
                break;
              }
            } catch (e) {
              console.log('[SOS Injected] Could not parse', key);
            }
          }

          // Alternative patterns
          if (!token && (key.includes('supabase') || key.includes('auth'))) {
            try {
              var value = localStorage.getItem(key);
              if (value && value.startsWith('{')) {
                var parsed = JSON.parse(value);
                if (parsed.access_token) {
                  token = parsed.access_token;
                  console.log('[SOS Injected] Got token from', key);
                  break;
                }
              }
            } catch (e) {}
          }
        }

        if (token) {
          console.log('[SOS Injected] Sending token to extension (length:', token.length + ')');
          window.postMessage({
            type: 'SOS_PROSPECTION_AUTH',
            action: 'setAuthToken',
            token: token
          }, window.location.origin);
        } else {
          console.log('[SOS Injected] No auth token found. Keys searched:', keys.filter(function(k) { return k.includes('sb') || k.includes('auth') || k.includes('supa'); }));
        }
      } catch (e) {
        console.error('[SOS Injected] Error:', e);
      }
    }

    // Run after a short delay to let React/Supabase initialize
    setTimeout(sendTokenToExtension, 500);
    setTimeout(sendTokenToExtension, 2000);

    // Listen for extension presence messages to re-send token
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'SOS_PROSPECTION_EXTENSION' && event.data.requestToken) {
        console.log('[SOS Injected] Extension requested token');
        sendTokenToExtension();
      }
    });
  } + ')();';

  // Inject after DOM is ready
  if (document.body) {
    document.body.appendChild(injectedScript);
    sosLog('Injected token sync script');
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.body.appendChild(injectedScript);
      sosLog('Injected token sync script (after DOMContentLoaded)');
    });
  }

})();
