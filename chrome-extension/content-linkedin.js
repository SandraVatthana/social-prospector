/**
 * SOS Prospection - LinkedIn Content Script
 * Scrapes LinkedIn profiles and posts, sends to app, prefills DMs
 *
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
  // PROFILE SCRAPING
  // ============================================

  function scrapeProfileInfo() {
    var name = '';
    var nameEl = document.querySelector('.text-heading-xlarge') ||
                 document.querySelector('h1.text-heading-xlarge');
    if (nameEl) name = nameEl.innerText.trim();

    var headline = '';
    var headlineEl = document.querySelector('.text-body-medium.break-words');
    if (headlineEl) headline = headlineEl.innerText.trim();

    var about = '';
    var aboutSection = document.querySelector('#about');
    if (aboutSection) {
      var aboutParent = aboutSection.closest('section');
      if (aboutParent) {
        var aboutText = aboutParent.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
                        aboutParent.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                        aboutParent.querySelector('.pv-about__summary-text');
        if (aboutText) about = aboutText.innerText.trim();
      }
    }

    var experiences = scrapeExperiences();
    var profileUrl = window.location.href.split('?')[0];
    var parts = profileUrl.split('/in/');
    var username = parts[1] ? parts[1].split('/')[0] : '';

    // Try to get first name
    var firstName = name.split(' ')[0] || '';

    return {
      platform: PLATFORM,
      username: username,
      fullName: name || 'Inconnu',
      firstName: firstName,
      headline: headline,
      bio: about.substring(0, 500),
      about: about,
      experiences: experiences,
      profileUrl: profileUrl,
      source: 'profile'
    };
  }

  function scrapeExperiences() {
    var experiences = [];
    sosLog('Scraping experiences...');

    var expSection = document.querySelector('#experience');
    if (!expSection) {
      sosLog('Experience section not found');
      return experiences;
    }

    var expParent = expSection.closest('section');
    if (!expParent) return experiences;

    var expItems = expParent.querySelectorAll('.artdeco-list__item') ||
                   expParent.querySelectorAll('[data-view-name="profile-component-entity"]') ||
                   expParent.querySelectorAll('.pvs-list__paged-list-item');

    sosLog('Found experience items:', expItems.length);

    expItems.forEach(function(item, index) {
      if (index >= 5) return;

      var exp = {};

      var titleEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                    item.querySelector('.mr1.hoverable-link-text span[aria-hidden="true"]') ||
                    item.querySelector('.t-bold');
      if (titleEl) exp.title = titleEl.innerText.trim();

      var companyEl = item.querySelector('.t-normal span[aria-hidden="true"]') ||
                      item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      if (companyEl) exp.company = companyEl.innerText.trim();

      var durationEl = item.querySelector('.t-black--light span[aria-hidden="true"]') ||
                       item.querySelector('.pvs-entity__caption-wrapper');
      if (durationEl) exp.duration = durationEl.innerText.trim();

      var descEl = item.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
                   item.querySelector('.inline-show-more-text span[aria-hidden="true"]');
      if (descEl) exp.description = descEl.innerText.trim().substring(0, 300);

      if (exp.title || exp.company) {
        experiences.push(exp);
      }
    });

    sosLog('Scraped experiences:', experiences.length);
    return experiences;
  }

  // ============================================
  // POST SCRAPING
  // ============================================

  function detectPostType(postElement) {
    if (postElement.querySelector('video')) return 'video';
    if (postElement.querySelector('.feed-shared-document')) return 'document';
    if (postElement.querySelector('.feed-shared-carousel')) return 'carousel';
    if (postElement.querySelector('img.feed-shared-image')) return 'image';
    return 'text';
  }

  function scrapeLinkedInPosts() {
    var posts = [];
    sosLog('Scraping LinkedIn posts...');

    var postElements = document.querySelectorAll('.feed-shared-update-v2');

    if (postElements.length === 0) {
      postElements = document.querySelectorAll('[data-urn*="activity"]');
    }

    if (postElements.length === 0) {
      var mainContent = document.querySelector('main');
      if (mainContent) {
        postElements = mainContent.querySelectorAll('.feed-shared-update-v2, .occludable-update');
      }
    }

    sosLog('Found post elements:', postElements.length);

    postElements.forEach(function(post, index) {
      if (index < 3) {
        var textElement = post.querySelector('.feed-shared-text span[dir="ltr"]') ||
                          post.querySelector('.feed-shared-text') ||
                          post.querySelector('.break-words span[dir="ltr"]') ||
                          post.querySelector('.break-words');

        var dateElement = post.querySelector('.feed-shared-actor__sub-description') ||
                          post.querySelector('time') ||
                          post.querySelector('.update-components-actor__sub-description');

        if (textElement) {
          var text = textElement.innerText.trim();
          if (text.length > 50) {
            posts.push({
              text: text.substring(0, 1500),
              date: dateElement ? dateElement.innerText.trim() : 'Date inconnue',
              type: detectPostType(post)
            });
          }
        }
      }
    });

    sosLog('Scraped posts:', posts.length);
    return posts;
  }

  // ============================================
  // SEARCH RESULTS EXTRACTION
  // ============================================

  function extractSearchResults() {
    var profiles = [];
    sosLog('Extracting search results...');

    var profileLinks = document.querySelectorAll('a[href*="/in/"]');
    sosLog('Found profile links:', profileLinks.length);

    var seenUrls = {};
    profileLinks.forEach(function(link) {
      var href = link.href;
      if (!href || seenUrls[href]) return;
      if (href.indexOf('/in/') > -1 && href.indexOf('/overlay/') === -1) {
        seenUrls[href] = true;
        var parts = href.split('/in/');
        var username = parts[1] ? parts[1].split('/')[0].split('?')[0] : '';
        if (!username || username.length < 2) return;

        var nameEl = link.querySelector('span[aria-hidden]') || link.querySelector('span') || link;
        var name = nameEl ? nameEl.textContent.trim() : username;

        if (name.indexOf('LinkedIn') > -1 || name.length < 2) return;

        var parent = link.closest('li') || link.closest('div');
        var headline = '';
        if (parent) {
          var headlineEl = parent.querySelector('.entity-result__primary-subtitle') ||
                           parent.querySelector('.t-14.t-normal') ||
                           parent.querySelector('.t-black--light');
          if (headlineEl) headline = headlineEl.textContent.trim();
        }

        profiles.push({
          id: 'linkedin_' + username + '_' + profiles.length,
          username: username,
          platform: PLATFORM,
          fullName: name.replace(/View.*profile/i, '').trim(),
          firstName: name.split(' ')[0] || '',
          headline: headline,
          bio: headline,
          profileUrl: href.split('?')[0],
          source: 'search'
        });
      }
    });

    sosLog('Extracted profiles:', profiles.length);
    return profiles;
  }

  // ============================================
  // FULL PROFILE DATA COLLECTION
  // ============================================

  function collectFullProfileData() {
    var profileInfo = scrapeProfileInfo();
    var posts = scrapeLinkedInPosts();

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

    // Method 1: If we're on messaging page
    if (detectPageType() === 'messaging') {
      var messageInput = document.querySelector('.msg-form__contenteditable') ||
                         document.querySelector('[contenteditable="true"]') ||
                         document.querySelector('.msg-form__message-texteditor');

      if (messageInput) {
        messageInput.focus();
        messageInput.innerHTML = '<p>' + message + '</p>';

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
          messageInput.innerHTML = '<p>' + message + '</p>';

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
  // UI HANDLERS
  // ============================================

  function handleImport() {
    var pageType = detectPageType();

    if (pageType === 'search') {
      handleSearchImport();
    } else if (pageType === 'profile') {
      handleProfileImport();
    } else {
      sosShowToast('Cette page ne permet pas l\'import', 'warning');
    }
  }

  function handleProfileImport() {
    var data = collectFullProfileData();

    if (!data.profile.fullName || data.profile.fullName === 'Inconnu') {
      sosShowToast('Impossible de lire le profil. Scrollez un peu et réessayez.', 'error');
      return;
    }

    // Show import modal
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

  function handleSearchImport() {
    var profiles = extractSearchResults();

    if (profiles.length === 0) {
      sosShowToast('Aucun profil trouvé sur cette page', 'warning');
      return;
    }

    // Show selection modal for bulk import
    showBulkImportModal(profiles);
  }

  function showBulkImportModal(profiles) {
    var existing = document.getElementById('sos-bulk-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'sos-bulk-modal';
    modal.className = 'sos-modal';

    var profilesHtml = profiles.map(function(p, i) {
      return '<label class="sos-bulk-item">' +
        '<input type="checkbox" checked data-index="' + i + '">' +
        '<span class="sos-bulk-name">' + sosEscapeHtml(p.fullName) + '</span>' +
        '<span class="sos-bulk-headline">' + sosEscapeHtml(p.headline || '') + '</span>' +
        '</label>';
    }).join('');

    modal.innerHTML = '<div class="sos-modal-overlay"></div>' +
      '<div class="sos-modal-content">' +
      '<div class="sos-modal-header">' +
      '<h3>📥 Importer ' + profiles.length + ' profil(s)</h3>' +
      '<button class="sos-modal-close" id="sos-close-bulk">×</button>' +
      '</div>' +
      '<div class="sos-modal-body">' +
      '<div class="sos-bulk-list">' + profilesHtml + '</div>' +
      '<div class="sos-bulk-actions">' +
      '<button class="sos-btn sos-btn-secondary" id="sos-select-all">Tout sélectionner</button>' +
      '</div>' +
      '<label class="sos-checkbox-label">' +
      '<input type="checkbox" id="sos-bulk-consent">' +
      '<span>J\'accepte d\'importer ces données dans mon CRM</span>' +
      '</label>' +
      '</div>' +
      '<div class="sos-modal-footer">' +
      '<button class="sos-btn sos-btn-cancel" id="sos-cancel-bulk">Annuler</button>' +
      '<button class="sos-btn sos-btn-primary" id="sos-confirm-bulk" disabled>Importer</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    setTimeout(function() {
      modal.classList.add('sos-modal-visible');
    }, 10);

    var closeModal = function() {
      modal.classList.remove('sos-modal-visible');
      setTimeout(function() { modal.remove(); }, 300);
    };

    document.getElementById('sos-close-bulk').addEventListener('click', closeModal);
    document.getElementById('sos-cancel-bulk').addEventListener('click', closeModal);
    document.querySelector('.sos-modal-overlay').addEventListener('click', closeModal);

    document.getElementById('sos-select-all').addEventListener('click', function() {
      var checkboxes = modal.querySelectorAll('.sos-bulk-item input');
      var allChecked = Array.from(checkboxes).every(function(cb) { return cb.checked; });
      checkboxes.forEach(function(cb) { cb.checked = !allChecked; });
    });

    var consentCheckbox = document.getElementById('sos-bulk-consent');
    var confirmBtn = document.getElementById('sos-confirm-bulk');

    consentCheckbox.addEventListener('change', function() {
      confirmBtn.disabled = !consentCheckbox.checked;
    });

    confirmBtn.addEventListener('click', function() {
      var selected = [];
      modal.querySelectorAll('.sos-bulk-item input:checked').forEach(function(cb) {
        selected.push(profiles[parseInt(cb.dataset.index)]);
      });

      if (selected.length === 0) {
        sosShowToast('Sélectionnez au moins un profil', 'warning');
        return;
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="sos-spinner"></span> Import...';

      sosSendMessage('importProspects', {
        platform: PLATFORM,
        profiles: selected
      })
        .then(function(result) {
          sosShowToast(selected.length + ' profil(s) importé(s) !', 'success');
          closeModal();
          window.open(window.SOS_CONFIG.APP_URL + '/prospects?source=linkedin', '_blank');
        })
        .catch(function(err) {
          sosError('Bulk import failed', err);
          sosShowToast('Erreur: ' + err.message, 'error');
          confirmBtn.disabled = false;
          confirmBtn.innerHTML = 'Importer';
        });
    });
  }

  function handlePrepareDM() {
    if (!isProfilePage()) {
      sosShowToast('Allez sur un profil pour préparer un DM', 'warning');
      return;
    }

    var profileData = scrapeProfileInfo();
    var posts = scrapeLinkedInPosts();

    if (!profileData.fullName || profileData.fullName === 'Inconnu') {
      sosShowToast('Impossible de lire le profil', 'error');
      return;
    }

    // Merge posts into profile data
    profileData.posts = posts;
    profileData.recentPost = posts.length > 0 ? posts[0].text : '';

    sosShowPrepareDMModal(profileData, function(prospect) {
      return generateDMViaApp(prospect);
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

    if (pageType === 'profile' || pageType === 'search') {
      sosCreateFloatingButton({
        platform: PLATFORM,
        onImport: handleImport,
        onPrepare: handlePrepareDM,
        showPrepare: pageType === 'profile'
      });
    }
  }

  function init() {
    sosLog('LinkedIn content script loaded');
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
