(function() {
  "use strict";
  var CONFIG = { APP_URL: "http://localhost:5178" };
  var extractedProfiles = [];
  
  function detectPageType() {
    var url = window.location.href;
    if (url.indexOf("/search/results/people") > -1) return "search";
    if (url.indexOf("/in/") > -1) return "profile";
    return "unknown";
  }
  
  function extractSearchResults() {
    var profiles = [];
    console.log('[Social Prospector] Extracting search results...');

    // Methode 1: Chercher tous les liens vers des profils LinkedIn
    var profileLinks = document.querySelectorAll('a[href*="/in/"]');
    console.log('[Social Prospector] Found profile links:', profileLinks.length);

    var seenUrls = {};
    profileLinks.forEach(function(link) {
      var href = link.href;
      if (!href || seenUrls[href]) return;
      if (href.indexOf('/in/') > -1 && href.indexOf('/overlay/') === -1) {
        seenUrls[href] = true;
        var parts = href.split('/in/');
        var username = parts[1] ? parts[1].split('/')[0].split('?')[0] : '';
        if (!username || username.length < 2) return;

        // Chercher le nom
        var nameEl = link.querySelector('span[aria-hidden]') || link.querySelector('span') || link;
        var name = nameEl ? nameEl.textContent.trim() : username;
        
        // Nettoyer le nom
        if (name.indexOf('LinkedIn') > -1 || name.length < 2) return;
        
        // Chercher le headline
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
          platform: 'linkedin',
          fullName: name.replace(/View.*profile/i, '').trim(),
          bio: headline,
          profileUrl: href.split('?')[0],
          source: 'search'
        });
      }
    });

    console.log('[Social Prospector] Extracted profiles:', profiles.length);
    return profiles;
  }
  
  function extractSearchResults_OLD() {
    var profiles = [];
    document.querySelectorAll(".reusable-search__result-container").forEach(function(item, i) {
      var nameEl = item.querySelector(".entity-result__title-text a span[aria-hidden]");
      var headlineEl = item.querySelector(".entity-result__primary-subtitle");
      var linkEl = item.querySelector(".entity-result__title-text a");
      if (nameEl) {
        var profileUrl = linkEl ? linkEl.href : "";
        var parts = profileUrl.split("/in/");
        var username = parts[1] ? parts[1].split("/")[0].split("?")[0] : "";
        profiles.push({
          id: "linkedin_" + (username || Date.now()) + "_" + i,
          username: username, platform: "linkedin",
          fullName: nameEl.textContent.trim(),
          bio: headlineEl ? headlineEl.textContent.trim() : "",
          profileUrl: profileUrl, source: "search"
        });
      }
    });
    return profiles;
  }
  
  function extractCurrentProfile() {
    var nameEl = document.querySelector("h1.text-heading-xlarge");
    var headlineEl = document.querySelector(".text-body-medium.break-words");
    var profileUrl = window.location.href.split("?")[0];
    var parts = profileUrl.split("/in/");
    var username = parts[1] ? parts[1].split("/")[0] : "";
    if (nameEl) {
      return {
        id: "linkedin_" + (username || Date.now()),
        username: username, platform: "linkedin",
        fullName: nameEl.textContent.trim(),
        bio: headlineEl ? headlineEl.textContent.trim() : "",
        profileUrl: profileUrl, source: "profile"
      };
    }
    return null;
  }
  
  function extractProfiles() {
    var pageType = detectPageType();
    if (pageType === "search") return extractSearchResults();
    if (pageType === "profile") { var p = extractCurrentProfile(); return p ? [p] : []; }
    return [];
  }
  
  function escapeHtml(t) { var d = document.createElement("div"); d.textContent = t || ""; return d.innerHTML; }
  
  function createFloatingButton() {
    var existing = document.getElementById("sp-linkedin-extractor");
    if (existing) existing.remove();
    var c = document.createElement("div"); c.id = "sp-linkedin-extractor";
    var btn = document.createElement("button"); btn.id = "sp-extract-btn"; btn.className = "sp-btn sp-btn-primary";
    btn.textContent = "Importer vers Social Prospector";
    var panel = document.createElement("div"); panel.id = "sp-extract-panel"; panel.className = "sp-panel sp-hidden";
    panel.innerHTML = "<div class=sp-panel-header><h3>Social Prospector</h3><button id=sp-close-panel class=sp-btn-icon>x</button></div><div class=sp-panel-content><div id=sp-status><span class=sp-status-text>Analyse...</span></div><div id=sp-profiles-list></div><div id=sp-actions class=sp-hidden><button id=sp-select-all class=sp-btn>Tout</button><button id=sp-import-selected class=sp-btn>Importer</button></div></div>";
    c.appendChild(btn); c.appendChild(panel); document.body.appendChild(c);
    document.getElementById("sp-extract-btn").onclick = togglePanel;
    document.getElementById("sp-close-panel").onclick = closePanel;
    document.getElementById("sp-select-all").onclick = selectAll;
    document.getElementById("sp-import-selected").onclick = importSelected;
  }
  
  function togglePanel() { 
    document.getElementById("sp-extract-panel").classList.toggle("sp-hidden"); 
    if (!document.getElementById("sp-extract-panel").classList.contains("sp-hidden")) { 
      extractedProfiles = extractProfiles(); 
      renderProfiles(); 
    } 
  }
  
  function closePanel() { document.getElementById("sp-extract-panel").classList.add("sp-hidden"); }
  
  function renderProfiles() {
    var list = document.getElementById("sp-profiles-list");
    var actions = document.getElementById("sp-actions");
    document.querySelector(".sp-status-text").textContent = extractedProfiles.length + " profil(s)";
    if (extractedProfiles.length === 0) { list.innerHTML = "<p>Aucun profil trouve</p>"; actions.classList.add("sp-hidden"); return; }
    var html = "";
    extractedProfiles.forEach(function(p, i) {
      html += "<div class=sp-profile-item><input type=checkbox class=sp-checkbox checked data-index=" + i + "><span>" + escapeHtml(p.fullName) + " - " + escapeHtml(p.bio) + "</span></div>";
    });
    list.innerHTML = html; actions.classList.remove("sp-hidden");
  }
  
  function selectAll() { 
    var cbs = document.querySelectorAll(".sp-checkbox");
    var allChecked = true;
    cbs.forEach(function(cb) { if (!cb.checked) allChecked = false; });
    cbs.forEach(function(cb) { cb.checked = !allChecked; });
  }
  
  function importSelected() {
    var selected = [];
    document.querySelectorAll(".sp-checkbox:checked").forEach(function(cb) { 
      selected.push(extractedProfiles[parseInt(cb.getAttribute("data-index"))]); 
    });
    if (selected.length === 0) return;
    chrome.runtime.sendMessage({ action: "importLinkedInProfiles", profiles: selected })
      .then(function(r) { 
        if (r && r.success) { 
          document.querySelector(".sp-status-text").textContent = "Importe!";
          window.open(CONFIG.APP_URL + "/prospects?source=linkedin", "_blank"); 
        } 
      });
  }
  
  function observePageChanges() {
    var lastUrl = location.href;
    new MutationObserver(function() {
      if (location.href !== lastUrl) { lastUrl = location.href; setTimeout(createFloatingButton, 1500); }
    }).observe(document.body, { childList: true, subtree: true });
  }
  
  function init() { 
    console.log("[Social Prospector] LinkedIn content script loaded"); 
    setTimeout(createFloatingButton, 1500);
    observePageChanges();
  }
  
  if (document.readyState === "loading") { 
    document.addEventListener("DOMContentLoaded", init); 
  } else { 
    init(); 
  }
})();