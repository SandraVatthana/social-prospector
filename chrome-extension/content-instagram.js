/**
 * SOS Prospection - Instagram Content Script
 * Scrapes Instagram profiles and posts, sends to app, prefills DMs
 *
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

  function getCurrentUsername() {
    var path = window.location.pathname;
    var match = path.match(/^\/([^\/]+)/);
    return match ? match[1] : null;
  }

  // ============================================
  // PROFILE SCRAPING
  // ============================================

  function scrapeProfileInfo() {
    sosLog('Scraping Instagram profile...');

    var username = getCurrentUsername();
    if (!username) {
      sosLog('Could not extract username from URL');
      return null;
    }

    // Full name - usually in header section
    var fullName = '';
    var nameEl = document.querySelector('header section span[class*="x1lliihq"]') ||
                 document.querySelector('header h2') ||
                 document.querySelector('[data-testid="user-name"]');

    // Try multiple selectors for name
    if (!nameEl) {
      var headerSection = document.querySelector('header section');
      if (headerSection) {
        var spans = headerSection.querySelectorAll('span');
        for (var i = 0; i < spans.length; i++) {
          var text = spans[i].innerText.trim();
          if (text && text.length > 1 && text.length < 50 && !text.match(/^\d/)) {
            fullName = text;
            break;
          }
        }
      }
    } else {
      fullName = nameEl.innerText.trim();
    }

    // Bio
    var bio = '';
    var bioEl = document.querySelector('header section > div > span') ||
                document.querySelector('header section h1 + span') ||
                document.querySelector('[data-testid="user-bio"]');

    // Try to find bio in header section divs
    if (!bioEl) {
      var headerDivs = document.querySelectorAll('header section div');
      for (var j = 0; j < headerDivs.length; j++) {
        var div = headerDivs[j];
        var divText = div.innerText.trim();
        // Bio is usually longer text that's not a number
        if (divText && divText.length > 20 && !divText.match(/^\d/) && !divText.includes('followers')) {
          bio = divText.substring(0, 500);
          break;
        }
      }
    } else {
      bio = bioEl.innerText.trim().substring(0, 500);
    }

    // Stats: followers, following, posts
    var stats = scrapeProfileStats();

    // Profile URL
    var profileUrl = 'https://www.instagram.com/' + username + '/';

    return {
      platform: PLATFORM,
      username: username,
      fullName: fullName || username,
      firstName: fullName ? fullName.split(' ')[0] : username,
      bio: bio,
      followers_count: stats.followers,
      following_count: stats.following,
      posts_count: stats.posts,
      profileUrl: profileUrl,
      source: 'profile'
    };
  }

  function scrapeProfileStats() {
    var stats = {
      posts: null,
      followers: null,
      following: null
    };

    // Instagram shows stats in header with text like "123 posts", "1,234 followers"
    var statElements = document.querySelectorAll('header section ul li');

    if (statElements.length === 0) {
      // Try alternative selectors
      statElements = document.querySelectorAll('header section > ul > li');
    }

    statElements.forEach(function(el) {
      var text = el.innerText.toLowerCase();
      var numberMatch = text.match(/[\d,\.]+/);
      var number = numberMatch ? parseNumber(numberMatch[0]) : null;

      if (text.includes('post')) {
        stats.posts = number;
      } else if (text.includes('follower') && !text.includes('following')) {
        stats.followers = number;
      } else if (text.includes('following')) {
        stats.following = number;
      }
    });

    return stats;
  }

  function parseNumber(str) {
    // Handle numbers like "1,234" or "1.2M" or "12K"
    str = str.replace(/,/g, '');

    if (str.includes('M') || str.includes('m')) {
      return parseFloat(str) * 1000000;
    }
    if (str.includes('K') || str.includes('k')) {
      return parseFloat(str) * 1000;
    }

    return parseInt(str, 10);
  }

  // ============================================
  // POST SCRAPING
  // ============================================

  function scrapeRecentPosts() {
    var posts = [];
    sosLog('Scraping Instagram posts...');

    // On profile page, posts are displayed in a grid
    // Each post is usually an article or link element
    var postLinks = document.querySelectorAll('article a[href*="/p/"]');

    if (postLinks.length === 0) {
      // Try alternative selectors
      postLinks = document.querySelectorAll('main article a[href*="/p/"]') ||
                  document.querySelectorAll('a[href*="/p/"]');
    }

    sosLog('Found post links:', postLinks.length);

    // We can't easily get caption from the grid view
    // We'll get the post URLs and the app can fetch more details if needed
    var seenUrls = {};
    postLinks.forEach(function(link, index) {
      if (index >= 9) return; // Limit to 9 recent posts

      var href = link.href;
      if (!href || seenUrls[href]) return;
      seenUrls[href] = true;

      // Try to get image
      var img = link.querySelector('img');
      var imageUrl = img ? img.src : null;

      posts.push({
        url: href,
        imageUrl: imageUrl,
        type: href.includes('/reel/') ? 'reel' : 'post'
      });
    });

    sosLog('Scraped posts:', posts.length);
    return posts;
  }

  function scrapeCurrentPost() {
    // If we're on a post page, scrape the caption
    var caption = '';

    var captionEl = document.querySelector('article span[class*="x193iq5w"]') ||
                    document.querySelector('article h1 + span') ||
                    document.querySelector('[data-testid="post-comment-root"] span');

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

    var posts = scrapeRecentPosts();

    // If on a post page, try to get current post caption
    if (detectPageType() === 'post') {
      var currentCaption = scrapeCurrentPost();
      if (currentCaption) {
        profileInfo.recentPost = currentCaption;
      }
    }

    return {
      platform: PLATFORM,
      profile: profileInfo,
      posts: posts,
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
  // UI HANDLERS
  // ============================================

  function handleImport() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil pour importer', 'warning');
      return;
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

  function handlePrepareDM() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil pour préparer un DM', 'warning');
      return;
    }

    var profileData = scrapeProfileInfo();
    var posts = scrapeRecentPosts();

    if (!profileData) {
      sosShowToast('Impossible de lire le profil', 'error');
      return;
    }

    profileData.posts = posts;

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
    sosLog('Instagram content script loaded');
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
