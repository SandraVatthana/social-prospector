/**
 * SOS Prospection - TikTok Content Script
 * Scrapes TikTok profiles and videos, sends to app, prefills DMs
 *
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

  function getCurrentUsername() {
    var path = window.location.pathname;
    var match = path.match(/^\/@([^\/]+)/);
    return match ? match[1] : null;
  }

  // ============================================
  // PROFILE SCRAPING
  // ============================================

  function scrapeProfileInfo() {
    sosLog('Scraping TikTok profile...');

    var username = getCurrentUsername();
    if (!username) {
      sosLog('Could not extract username from URL');
      return null;
    }

    // Full name / display name
    var fullName = '';
    var nameEl = document.querySelector('[data-e2e="user-subtitle"]') ||
                 document.querySelector('[data-e2e="user-title"]') ||
                 document.querySelector('h1[data-e2e="user-title"]') ||
                 document.querySelector('.tiktok-1d3qdok-H1ShareTitle');

    if (nameEl) {
      fullName = nameEl.innerText.trim();
    }

    // If display name is same as username, try to find a different one
    if (!fullName || fullName === '@' + username || fullName === username) {
      var subtitleEl = document.querySelector('[data-e2e="user-subtitle"]') ||
                       document.querySelector('h2[data-e2e="user-subtitle"]');
      if (subtitleEl) {
        fullName = subtitleEl.innerText.trim();
      }
    }

    // Bio
    var bio = '';
    var bioEl = document.querySelector('[data-e2e="user-bio"]') ||
                document.querySelector('.tiktok-vz92q9-SpanBio');

    if (bioEl) {
      bio = bioEl.innerText.trim().substring(0, 500);
    }

    // Stats
    var stats = scrapeProfileStats();

    // Profile URL
    var profileUrl = 'https://www.tiktok.com/@' + username;

    return {
      platform: PLATFORM,
      username: username,
      fullName: fullName || username,
      firstName: fullName ? fullName.split(' ')[0] : username,
      bio: bio,
      followers_count: stats.followers,
      following_count: stats.following,
      likes_count: stats.likes,
      profileUrl: profileUrl,
      source: 'profile'
    };
  }

  function scrapeProfileStats() {
    var stats = {
      following: null,
      followers: null,
      likes: null
    };

    // TikTok shows stats in different elements
    var countElements = document.querySelectorAll('[data-e2e="following-count"], [data-e2e="followers-count"], [data-e2e="likes-count"]');

    countElements.forEach(function(el) {
      var attr = el.getAttribute('data-e2e');
      var title = el.getAttribute('title') || el.innerText;
      var number = parseNumber(title);

      if (attr === 'following-count') {
        stats.following = number;
      } else if (attr === 'followers-count') {
        stats.followers = number;
      } else if (attr === 'likes-count') {
        stats.likes = number;
      }
    });

    // Alternative: parse from stat container
    if (!stats.followers) {
      var statContainer = document.querySelector('[data-e2e="user-stats"]');
      if (statContainer) {
        var text = statContainer.innerText.toLowerCase();
        var numbers = text.match(/[\d\.]+[km]?\s*(followers|following|likes)/gi);
        if (numbers) {
          numbers.forEach(function(match) {
            var num = parseNumber(match);
            if (match.includes('follower') && !match.includes('following')) {
              stats.followers = num;
            } else if (match.includes('following')) {
              stats.following = num;
            } else if (match.includes('like')) {
              stats.likes = num;
            }
          });
        }
      }
    }

    return stats;
  }

  function parseNumber(str) {
    if (!str) return null;
    str = String(str).replace(/,/g, '').trim();

    if (str.toLowerCase().includes('m')) {
      return parseFloat(str) * 1000000;
    }
    if (str.toLowerCase().includes('k')) {
      return parseFloat(str) * 1000;
    }

    var match = str.match(/[\d\.]+/);
    return match ? parseInt(match[0], 10) : null;
  }

  // ============================================
  // VIDEO SCRAPING
  // ============================================

  function scrapeRecentVideos() {
    var videos = [];
    sosLog('Scraping TikTok videos...');

    // On profile, videos are in a grid
    var videoLinks = document.querySelectorAll('[data-e2e="user-post-item"] a') ||
                     document.querySelectorAll('[data-e2e="user-post-item-list"] a') ||
                     document.querySelectorAll('a[href*="/video/"]');

    sosLog('Found video links:', videoLinks.length);

    var seenUrls = {};
    videoLinks.forEach(function(link, index) {
      if (index >= 9) return;

      var href = link.href;
      if (!href || seenUrls[href] || !href.includes('/video/')) return;
      seenUrls[href] = true;

      // Try to get description from aria-label or title
      var desc = link.getAttribute('aria-label') ||
                 link.getAttribute('title') ||
                 '';

      // Try to get thumbnail
      var img = link.querySelector('img');
      var thumbnail = img ? img.src : null;

      videos.push({
        url: href,
        description: desc.substring(0, 500),
        thumbnail: thumbnail,
        type: 'video'
      });
    });

    sosLog('Scraped videos:', videos.length);
    return videos;
  }

  function scrapeCurrentVideo() {
    // If on a video page, get the caption/description
    var caption = '';

    var captionEl = document.querySelector('[data-e2e="video-desc"]') ||
                    document.querySelector('[data-e2e="browse-video-desc"]') ||
                    document.querySelector('.tiktok-j2a19r-SpanText');

    if (captionEl) {
      caption = captionEl.innerText.trim().substring(0, 1500);
    }

    return caption;
  }

  // ============================================
  // FULL PROFILE DATA COLLECTION
  // ============================================

  function collectFullProfileData() {
    var profileInfo = scrapeProfileInfo();

    if (!profileInfo) {
      return null;
    }

    var videos = scrapeRecentVideos();

    // If on video page, get current video caption
    if (detectPageType() === 'video') {
      var currentCaption = scrapeCurrentVideo();
      if (currentCaption) {
        profileInfo.recentPost = currentCaption;
      }
    }

    return {
      platform: PLATFORM,
      profile: profileInfo,
      posts: videos, // For consistency with other platforms
      videos: videos,
      scrapedAt: new Date().toISOString()
    };
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
  // UI HANDLERS
  // ============================================

  function handleImport() {
    var pageType = detectPageType();

    if (pageType !== 'profile' && pageType !== 'video') {
      sosShowToast('Allez sur un profil pour importer', 'warning');
      return;
    }

    // If on video page, try to go to profile first
    if (pageType === 'video') {
      var username = getCurrentUsernameFromVideo();
      if (username) {
        window.open('https://www.tiktok.com/@' + username, '_blank');
        sosShowToast('Ouvrez le profil pour importer', 'info');
        return;
      }
    }

    var data = collectFullProfileData();

    if (!data || !data.profile) {
      sosShowToast('Impossible de lire le profil. Rechargez la page et réessayez.', 'error');
      return;
    }

    sosShowImportModal(
      Object.assign({}, data.profile, { posts: data.posts }),
      function(profileData) {
        return sendToApp({
          profile: profileData,
          posts: data.posts
        });
      }
    );
  }

  function getCurrentUsernameFromVideo() {
    // On video page, try to extract username
    var path = window.location.pathname;
    var match = path.match(/^\/@([^\/]+)/);
    if (match) return match[1];

    // Try from DOM
    var usernameEl = document.querySelector('[data-e2e="video-author-uniqueid"]') ||
                     document.querySelector('[data-e2e="browse-username"]');
    if (usernameEl) {
      return usernameEl.innerText.replace('@', '').trim();
    }

    return null;
  }

  function handlePrepareDM() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil pour préparer un DM', 'warning');
      return;
    }

    var profileData = scrapeProfileInfo();
    var videos = scrapeRecentVideos();

    if (!profileData) {
      sosShowToast('Impossible de lire le profil', 'error');
      return;
    }

    profileData.posts = videos;

    sosShowPrepareDMModal(profileData, function(prospect) {
      return generateDMViaApp(prospect);
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
    sosLog('TikTok content script loaded');
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
