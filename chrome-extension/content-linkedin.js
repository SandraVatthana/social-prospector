(function() {
  "use strict";
  var CONFIG = { APP_URL: "http://localhost:5178" };
  var extractedProfiles = [];

  // ============================================
  // DETECTION DES PAGES
  // ============================================

  function detectPageType() {
    var url = window.location.href;
    if (url.indexOf("/search/results/people") > -1) return "search";
    if (url.indexOf("/in/") > -1) return "profile";
    return "unknown";
  }

  function isLinkedInProfile() {
    return window.location.hostname.includes('linkedin.com') &&
           window.location.pathname.includes('/in/');
  }

  // ============================================
  // EXTRACTION DES PROFILS (existant)
  // ============================================

  function extractSearchResults() {
    var profiles = [];
    console.log('[Social Prospector] Extracting search results...');

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

  // ============================================
  // SCRAPING DES POSTS LINKEDIN
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

    // Scraper le parcours (expériences)
    var experiences = scrapeExperiences();

    return {
      name: name || 'Inconnu',
      headline: headline,
      about: about.substring(0, 500),
      experiences: experiences
    };
  }

  function scrapeExperiences() {
    var experiences = [];
    console.log('[Social Prospector] Scraping experiences...');

    // Chercher la section Experience
    var expSection = document.querySelector('#experience');
    if (!expSection) {
      console.log('[Social Prospector] Experience section not found');
      return experiences;
    }

    var expParent = expSection.closest('section');
    if (!expParent) return experiences;

    // Chercher les items d'expérience
    var expItems = expParent.querySelectorAll('.artdeco-list__item') ||
                   expParent.querySelectorAll('[data-view-name="profile-component-entity"]') ||
                   expParent.querySelectorAll('.pvs-list__paged-list-item');

    console.log('[Social Prospector] Found experience items:', expItems.length);

    expItems.forEach(function(item, index) {
      if (index >= 5) return; // Limiter aux 5 dernières expériences

      var exp = {};

      // Titre du poste
      var titleEl = item.querySelector('.t-bold span[aria-hidden="true"]') ||
                    item.querySelector('.mr1.hoverable-link-text span[aria-hidden="true"]') ||
                    item.querySelector('.t-bold');
      if (titleEl) exp.title = titleEl.innerText.trim();

      // Entreprise
      var companyEl = item.querySelector('.t-normal span[aria-hidden="true"]') ||
                      item.querySelector('.t-14.t-normal span[aria-hidden="true"]');
      if (companyEl) exp.company = companyEl.innerText.trim();

      // Durée
      var durationEl = item.querySelector('.t-black--light span[aria-hidden="true"]') ||
                       item.querySelector('.pvs-entity__caption-wrapper');
      if (durationEl) exp.duration = durationEl.innerText.trim();

      // Description (si visible)
      var descEl = item.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') ||
                   item.querySelector('.inline-show-more-text span[aria-hidden="true"]');
      if (descEl) exp.description = descEl.innerText.trim().substring(0, 300);

      if (exp.title || exp.company) {
        experiences.push(exp);
      }
    });

    console.log('[Social Prospector] Scraped experiences:', experiences.length);
    return experiences;
  }

  function detectPostType(postElement) {
    if (postElement.querySelector('video')) return 'video';
    if (postElement.querySelector('.feed-shared-document')) return 'document';
    if (postElement.querySelector('.feed-shared-carousel')) return 'carousel';
    if (postElement.querySelector('img.feed-shared-image')) return 'image';
    return 'text';
  }

  async function scrapeLinkedInPosts() {
    var posts = [];
    console.log('[Social Prospector] Scraping LinkedIn posts...');

    // Methode 1: Chercher la section Activite sur le profil
    var activitySection = document.querySelector('[data-section="activity"]') ||
                          document.querySelector('.pv-recent-activity-section') ||
                          document.querySelector('#content_collections');

    // Methode 2: Chercher les posts dans la section "Activite"
    var postElements = document.querySelectorAll('.feed-shared-update-v2');

    if (postElements.length === 0) {
      // Essayer d'autres selecteurs
      postElements = document.querySelectorAll('[data-urn*="activity"]');
    }

    if (postElements.length === 0) {
      // Chercher dans le main content
      var mainContent = document.querySelector('main');
      if (mainContent) {
        postElements = mainContent.querySelectorAll('.feed-shared-update-v2, .occludable-update');
      }
    }

    console.log('[Social Prospector] Found post elements:', postElements.length);

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

    // Si pas assez de posts, chercher le lien "Voir toute l'activite"
    if (posts.length < 2) {
      var seeAllLink = document.querySelector('a[href*="/recent-activity/"]') ||
                       document.querySelector('a[href*="/detail/recent-activity/"]');
      if (seeAllLink) {
        console.log('[Social Prospector] Need to scroll to activity section for more posts');
      }
    }

    console.log('[Social Prospector] Scraped posts:', posts.length);
    return posts;
  }

  // ============================================
  // ANALYSE IA
  // ============================================

  function buildAnalysisPrompt(profileInfo, posts) {
    var postsText = posts.map(function(p, i) {
      return '\nPOST ' + (i + 1) + ' (' + p.type + ', ' + p.date + '):\n' + p.text;
    }).join('\n---\n');

    // Formatter le parcours
    var experiencesText = '';
    if (profileInfo.experiences && profileInfo.experiences.length > 0) {
      experiencesText = '\n\nPARCOURS PROFESSIONNEL :';
      profileInfo.experiences.forEach(function(exp, i) {
        experiencesText += '\n' + (i + 1) + '. ' + (exp.title || 'Poste') + ' @ ' + (exp.company || 'Entreprise');
        if (exp.duration) experiencesText += ' (' + exp.duration + ')';
        if (exp.description) experiencesText += '\n   ' + exp.description.substring(0, 150) + '...';
      });
    }

    return 'Tu es un expert en prospection LinkedIn. Analyse ce profil, son parcours et ses derniers posts.\n\nPROFIL :\nNom : ' + profileInfo.name + '\nTitre : ' + profileInfo.headline + '\nA propos : ' + (profileInfo.about || 'Non renseigne') + experiencesText + '\n\nDERNIERS POSTS :' + postsText + '\n\nANALYSE DEMANDEE (reponds en JSON) :\n\n{\n  "synthese": {\n    "sujets_principaux": ["sujet1", "sujet2", "sujet3"],\n    "ton": "description du ton utilise (ex: expert, accessible, provocateur, inspirant...)",\n    "valeurs": ["valeur1", "valeur2"],\n    "problemes_evoques": ["probleme qu\'il/elle mentionne ou que son audience a"],\n    "parcours_insight": "Ce qui ressort de son parcours (ex: ex-cadre reconvertie, serial entrepreneur, expert du secteur X...)"\n  },\n  "angles_commentaire": [\n    {\n      "post_ref": 1,\n      "post_debut": "Les 8-10 premiers mots du post pour l\'identifier...",\n      "post_resume": "Resume en 1 phrase de ce que dit le post",\n      "angle": "Description de l\'angle de commentaire",\n      "exemple": "Un exemple de commentaire de 2-3 lignes"\n    },\n    {\n      "post_ref": 2,\n      "post_debut": "Les 8-10 premiers mots du post...",\n      "post_resume": "Resume en 1 phrase",\n      "angle": "Description de l\'angle",\n      "exemple": "Un exemple de commentaire"\n    }\n  ],\n  "angles_dm": [\n    {\n      "contexte": "Pourquoi ce DM ferait sens (peut inclure un element du parcours)",\n      "accroche": "Message COURT (max 150 car), minuscule au debut, ton decontracte, une question a la fin",\n      "angle": "L\'angle a developper"\n    }\n  ],\n  "a_eviter": ["Ce qu\'il ne faut PAS dire a cette personne"]\n}\n\nIMPORTANT : \n- Pour chaque angle_commentaire, inclus TOUJOURS post_debut (les premiers mots du post) et post_resume (un resume en 1 phrase) pour que l\'utilisateur puisse identifier facilement de quel post il s\'agit.\n- Pour les angles_dm, l\'accroche doit etre un MESSAGE COMPLET pret a envoyer : court (max 150 caracteres), commence par une minuscule, ton naturel/decontracte, tutoiement, parfois oublie une virgule, termine par une question simple. Exemples de style : "salut j\'ai vu ton post sur X, ca m\'a parle. t\'as deja teste Y ?" ou "hey ton truc sur X etait cool, tu bosses sur quoi en ce moment"\n- Utilise le PARCOURS pour personnaliser les angles (ex: "j\'ai vu que t\'etais passe par X, ca a du etre intense")\n\nReponds UNIQUEMENT avec le JSON, sans markdown ni explication.';
  }

  async function callClaudeAPI(prompt) {
    // Recuperer la cle API depuis le storage via background script
    return new Promise(function(resolve, reject) {
      chrome.runtime.sendMessage({ action: 'callClaudeAPI', prompt: prompt }, function(response) {
        if (response && response.error) {
          reject(new Error(response.error));
        } else if (response && response.result) {
          resolve(response.result);
        } else {
          reject(new Error('Reponse invalide de l\'API'));
        }
      });
    });
  }

  async function analyzeProfile() {
    var btn = document.getElementById('sp-analyze-btn');
    if (!btn) return;

    btn.innerHTML = '<span class="sp-spinner"></span> Analyse...';
    btn.disabled = true;

    try {
      // 1. Scraper les donnees
      var profileInfo = scrapeProfileInfo();
      var posts = await scrapeLinkedInPosts();

      console.log('[Social Prospector] Profile info:', profileInfo);
      console.log('[Social Prospector] Posts found:', posts.length);

      if (posts.length === 0) {
        showAnalysisPanel({
          error: "Aucun post trouve sur ce profil.",
          instructions: [
            "1. Scrolle vers le bas jusqu'a la section 'Activite'",
            "2. Attends que les posts se chargent (2-3 secondes)",
            "3. Clique a nouveau sur 'Analyser'",
            "",
            "Note : Les Reels/videos ne sont pas analyses, seulement les posts texte."
          ]
        });
        return;
      }

      // 2. Preparer le prompt
      var analysisPrompt = buildAnalysisPrompt(profileInfo, posts);

      // 3. Appeler l'API Claude
      var analysis = await callClaudeAPI(analysisPrompt);

      // 4. Afficher les resultats
      showAnalysisPanel(analysis, profileInfo);

    } catch (error) {
      console.error('[Social Prospector] Erreur analyse:', error);
      showAnalysisPanel({ error: error.message });
    } finally {
      if (btn) {
        btn.innerHTML = '🔍 Analyser';
        btn.disabled = false;
      }
    }
  }

  // ============================================
  // AFFICHAGE DU PANEL D'ANALYSE
  // ============================================

  function showAnalysisPanel(analysis, profileInfo) {
    profileInfo = profileInfo || {};

    // Supprimer l'ancien panel s'il existe
    var oldPanel = document.getElementById('sp-analysis-panel');
    if (oldPanel) oldPanel.remove();

    // Creer le panel
    var panel = document.createElement('div');
    panel.id = 'sp-analysis-panel';

    if (analysis.error) {
      var instructionsHtml = '';
      if (analysis.instructions && analysis.instructions.length > 0) {
        instructionsHtml = '<div class="sp-instructions">' +
          '<h4>📋 Comment faire :</h4>' +
          '<ul>' + analysis.instructions.map(function(i) {
            return i ? '<li>' + escapeHtml(i) + '</li>' : '<li class="sp-spacer"></li>';
          }).join('') + '</ul>' +
          '</div>';
      } else {
        instructionsHtml = '<p class="sp-error-help">Verifiez que :<br>- Votre cle API Claude est configuree<br>- Vous avez scrolle sur le profil pour charger les posts</p>';
      }
      panel.innerHTML = '<div class="sp-analysis-header">' +
        '<span>❌ Erreur</span>' +
        '<button class="sp-close-btn" id="sp-close-analysis">×</button>' +
        '</div>' +
        '<div class="sp-analysis-body">' +
        '<p class="sp-error-msg">' + escapeHtml(analysis.error) + '</p>' +
        instructionsHtml +
        '</div>';
    } else {
      var synthese = analysis.synthese || {};
      var sujets = (synthese.sujets_principaux || []).map(function(s) {
        return '<span class="sp-tag">' + escapeHtml(s) + '</span>';
      }).join('');

      var parcoursInsight = synthese.parcours_insight ?
        '<p><strong>💼 Parcours :</strong> ' + escapeHtml(synthese.parcours_insight) + '</p>' : '';

      var commentaires = (analysis.angles_commentaire || []).map(function(a) {
        var postDebut = a.post_debut ? escapeHtml(a.post_debut) : 'Post ' + a.post_ref;
        var postResume = a.post_resume ? '<div class="sp-post-resume">📄 ' + escapeHtml(a.post_resume) + '</div>' : '';
        return '<div class="sp-suggestion">' +
          '<div class="sp-suggestion-header">' +
          '<span class="sp-badge">💬</span>' +
          '<span class="sp-post-start">"' + postDebut + '"</span>' +
          '</div>' +
          postResume +
          '<div class="sp-suggestion-angle"><strong>Angle :</strong> ' + escapeHtml(a.angle) + '</div>' +
          '<div class="sp-suggestion-example">"' + escapeHtml(a.exemple) + '"</div>' +
          '<button class="sp-copy-btn" data-text="' + escapeHtml(a.exemple).replace(/"/g, '&quot;') + '">📋 Copier</button>' +
          '</div>';
      }).join('');

      var dms = (analysis.angles_dm || []).map(function(a, i) {
        return '<div class="sp-suggestion">' +
          '<div class="sp-suggestion-context">' + escapeHtml(a.contexte) + '</div>' +
          '<div class="sp-suggestion-example"><strong>Accroche :</strong> "' + escapeHtml(a.accroche) + '"</div>' +
          '<div class="sp-suggestion-angle"><strong>Angle :</strong> ' + escapeHtml(a.angle) + '</div>' +
          '<div class="sp-btn-group">' +
          '<button class="sp-copy-btn" data-text="' + escapeHtml(a.accroche).replace(/"/g, '&quot;') + '">📋 Copier</button>' +
          '<button class="sp-generate-btn" data-angle=\'' + encodeURIComponent(JSON.stringify(a)) + '\' data-profile=\'' + encodeURIComponent(JSON.stringify(profileInfo)) + '\'>✍️ Generer DM</button>' +
          '</div>' +
          '</div>';
      }).join('');

      var aEviter = (analysis.a_eviter || []).map(function(a) {
        return '<li>' + escapeHtml(a) + '</li>';
      }).join('');

      panel.innerHTML = '<div class="sp-analysis-header">' +
        '<span>🔍 Analyse de ' + escapeHtml(profileInfo.name || 'ce profil') + '</span>' +
        '<button class="sp-close-btn" id="sp-close-analysis">×</button>' +
        '</div>' +
        '<div class="sp-analysis-body">' +
        '<div class="sp-section">' +
        '<h4>📝 Synthese</h4>' +
        '<div class="sp-tags">' + sujets + '</div>' +
        '<p><strong>Ton :</strong> ' + escapeHtml(synthese.ton || '') + '</p>' +
        '<p><strong>Valeurs :</strong> ' + escapeHtml((synthese.valeurs || []).join(', ')) + '</p>' +
        parcoursInsight +
        '</div>' +
        '<div class="sp-section">' +
        '<h4>💬 Idees de commentaires</h4>' +
        commentaires +
        '</div>' +
        '<div class="sp-section">' +
        '<h4>✉️ Idees de DM</h4>' +
        dms +
        '</div>' +
        '<div class="sp-section sp-warning">' +
        '<h4>⚠️ A eviter</h4>' +
        '<ul>' + aEviter + '</ul>' +
        '</div>' +
        '<div class="sp-section sp-tip">' +
        '<p>💡 <strong>Tip :</strong> Les Reels/videos ne sont pas analyses. Pour plus de posts, scrolle vers "Activite" et relance l\'analyse.</p>' +
        '</div>' +
        '</div>';
    }

    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('sp-close-analysis').addEventListener('click', function() {
      panel.remove();
    });

    panel.querySelectorAll('.sp-copy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        navigator.clipboard.writeText(btn.dataset.text);
        btn.innerHTML = '✅ Copie !';
        setTimeout(function() { btn.innerHTML = '📋 Copier'; }, 2000);
      });
    });

    panel.querySelectorAll('.sp-generate-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var angleData = JSON.parse(decodeURIComponent(btn.dataset.angle));
        var profileData = JSON.parse(decodeURIComponent(btn.dataset.profile));
        generateFullDM(angleData, profileData, btn);
      });
    });
  }

  // ============================================
  // GENERATION DE DM COMPLET
  // ============================================

  async function generateFullDM(angleData, profileInfo, btn) {
    console.log('[Social Prospector] Generating DM with:', { angleData, profileInfo });

    var prompt = 'Tu es un expert en prospection LinkedIn qui ecrit des DM ultra naturels.\n\nCONTEXTE :\n- Destinataire : ' + (profileInfo.name || 'cette personne') + '\n- Titre : ' + (profileInfo.headline || 'non renseigne') + '\n- Contexte : ' + (angleData.contexte || '') + '\n- Angle : ' + (angleData.angle || '') + '\n- Accroche suggeree : ' + (angleData.accroche || '') + '\n\nREGLES STRICTES :\n- MAX 200 caracteres (court = mieux)\n- Commence par une minuscule (ex: "salut" pas "Salut", "hey" pas "Hey")\n- Oublie parfois une virgule ou un point volontairement\n- PAS de pave de texte - 2-3 lignes MAX\n- Ton decontracte, comme un vrai humain qui ecrit vite\n- UNE seule question courte a la fin\n- JAMAIS de "J\'espere que tu vas bien" ou formules bateau\n- JAMAIS de pitch ou de demande directe\n- Utilise "tu" pas "vous"\n\nEXEMPLES DE BON FORMAT :\n"salut [prenom], j\'ai vu ton post sur [sujet] et ca m\'a parle. t\'as deja teste [chose] ?"\n"hey j\'ai lu ton truc sur [sujet], interessant. tu bosses sur quoi en ce moment"\n\nGenere UN SEUL message court et naturel (texte brut uniquement, sans guillemets) :';

    btn.innerHTML = '⏳ Generation...';
    btn.disabled = true;

    try {
      var dmText = await callClaudeAPI(prompt);
      console.log('[Social Prospector] DM generated:', dmText);

      // Si la reponse est du JSON, extraire le texte
      if (typeof dmText === 'object') {
        dmText = dmText.message || dmText.text || JSON.stringify(dmText);
      }

      // Nettoyer le texte
      dmText = String(dmText).trim();

      // Retirer les guillemets au debut et a la fin si presents
      if ((dmText.startsWith('"') && dmText.endsWith('"')) || (dmText.startsWith("'") && dmText.endsWith("'"))) {
        dmText = dmText.slice(1, -1);
      }

      showGeneratedDM(dmText, angleData, profileInfo);

    } catch (error) {
      console.error('[Social Prospector] DM generation error:', error);
      alert('Erreur : ' + error.message);
    } finally {
      btn.innerHTML = '✍️ Generer DM';
      btn.disabled = false;
    }
  }

  var lastDMContext = null;

  function showGeneratedDM(dmText, angleData, profileInfo) {
    // Sauvegarder le contexte pour pouvoir regenerer
    if (angleData && profileInfo) {
      lastDMContext = { angleData: angleData, profileInfo: profileInfo };
    }

    var oldModal = document.getElementById('sp-dm-modal');
    if (oldModal) oldModal.remove();

    var charClass = dmText.length > 300 ? 'sp-char-warning' : '';

    var modal = document.createElement('div');
    modal.id = 'sp-dm-modal';
    modal.innerHTML = '<div class="sp-dm-modal-content">' +
      '<div class="sp-dm-modal-header">' +
      '<h3>✉️ DM genere</h3>' +
      '<button id="sp-close-dm-modal">×</button>' +
      '</div>' +
      '<div class="sp-dm-modal-body">' +
      '<textarea id="sp-dm-text" rows="4">' + escapeHtml(dmText) + '</textarea>' +
      '<div class="sp-dm-meta ' + charClass + '">' + dmText.length + '/300 caracteres</div>' +
      '</div>' +
      '<div class="sp-dm-modal-footer">' +
      '<button class="sp-btn sp-btn-secondary" id="sp-regenerate-dm">🔄 Regenerer</button>' +
      '<button class="sp-btn sp-btn-primary" id="sp-copy-dm">📋 Copier</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    document.getElementById('sp-close-dm-modal').addEventListener('click', function() {
      modal.remove();
    });

    document.getElementById('sp-copy-dm').addEventListener('click', function() {
      var text = document.getElementById('sp-dm-text').value;
      navigator.clipboard.writeText(text);
      document.getElementById('sp-copy-dm').innerHTML = '✅ Copie !';
      setTimeout(function() {
        var copyBtn = document.getElementById('sp-copy-dm');
        if (copyBtn) copyBtn.innerHTML = '📋 Copier';
      }, 2000);
    });

    // Bouton Regenerer
    document.getElementById('sp-regenerate-dm').addEventListener('click', async function() {
      if (!lastDMContext) {
        alert('Impossible de regenerer. Relance l\'analyse du profil.');
        return;
      }
      var regenBtn = document.getElementById('sp-regenerate-dm');
      regenBtn.innerHTML = '⏳ ...';
      regenBtn.disabled = true;

      try {
        var prompt = 'Tu es un expert en prospection LinkedIn qui ecrit des DM ultra naturels.\n\nCONTEXTE :\n- Destinataire : ' + (lastDMContext.profileInfo.name || 'cette personne') + '\n- Titre : ' + (lastDMContext.profileInfo.headline || 'non renseigne') + '\n- Contexte : ' + (lastDMContext.angleData.contexte || '') + '\n- Angle : ' + (lastDMContext.angleData.angle || '') + '\n\nREGLES STRICTES :\n- MAX 200 caracteres (court = mieux)\n- Commence par une minuscule (ex: "salut" pas "Salut")\n- Oublie parfois une virgule ou un point volontairement\n- PAS de pave de texte - 2-3 lignes MAX\n- Ton decontracte, comme un vrai humain qui ecrit vite\n- UNE seule question courte a la fin\n- JAMAIS de formules bateau\n- Utilise "tu" pas "vous"\n- ECRIS UN MESSAGE DIFFERENT du precedent\n\nGenere UN SEUL message court et naturel (texte brut uniquement, sans guillemets) :';

        var dmText = await callClaudeAPI(prompt);
        if (typeof dmText === 'object') {
          dmText = dmText.message || dmText.text || JSON.stringify(dmText);
        }
        dmText = String(dmText).trim();
        if ((dmText.startsWith('"') && dmText.endsWith('"')) || (dmText.startsWith("'") && dmText.endsWith("'"))) {
          dmText = dmText.slice(1, -1);
        }

        document.getElementById('sp-dm-text').value = dmText;
        var meta = document.querySelector('.sp-dm-meta');
        if (meta) {
          meta.textContent = dmText.length + '/300 caracteres';
          meta.className = 'sp-dm-meta' + (dmText.length > 300 ? ' sp-char-warning' : '');
        }
      } catch (error) {
        alert('Erreur : ' + error.message);
      } finally {
        regenBtn.innerHTML = '🔄 Regenerer';
        regenBtn.disabled = false;
      }
    });

    // Mettre a jour le compteur de caracteres
    document.getElementById('sp-dm-text').addEventListener('input', function(e) {
      var meta = document.querySelector('.sp-dm-meta');
      if (meta) {
        var len = e.target.value.length;
        meta.textContent = len + '/300 caracteres';
        meta.className = 'sp-dm-meta' + (len > 300 ? ' sp-char-warning' : '');
      }
    });

    // Fermer en cliquant en dehors
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // ============================================
  // INTERFACE UTILISATEUR
  // ============================================

  function createFloatingButton() {
    var existing = document.getElementById("sp-linkedin-extractor");
    if (existing) existing.remove();

    var c = document.createElement("div");
    c.id = "sp-linkedin-extractor";

    var pageType = detectPageType();

    // Bouton Import (pour tous les types de page)
    var btn = document.createElement("button");
    btn.id = "sp-extract-btn";
    btn.className = "sp-btn sp-btn-primary";
    btn.textContent = "Importer vers Social Prospector";

    // Bouton Analyser (seulement sur les profils)
    var analyzeBtn = null;
    if (pageType === "profile") {
      analyzeBtn = document.createElement("button");
      analyzeBtn.id = "sp-analyze-btn";
      analyzeBtn.className = "sp-btn sp-btn-analyze";
      analyzeBtn.innerHTML = "🔍 Analyser";
      analyzeBtn.title = "Analyser ce profil avec l'IA";
    }

    var panel = document.createElement("div");
    panel.id = "sp-extract-panel";
    panel.className = "sp-panel sp-hidden";
    panel.innerHTML = "<div class=sp-panel-header><h3>Social Prospector</h3><button id=sp-close-panel class=sp-btn-icon>x</button></div><div class=sp-panel-content><div id=sp-status><span class=sp-status-text>Analyse...</span></div><div id=sp-profiles-list></div><div id=sp-actions class=sp-hidden><button id=sp-select-all class=sp-btn>Tout</button><button id=sp-import-selected class=sp-btn>Importer</button></div></div>";

    // Container pour les boutons
    var btnContainer = document.createElement("div");
    btnContainer.className = "sp-btn-container";

    if (analyzeBtn) {
      btnContainer.appendChild(analyzeBtn);
    }
    btnContainer.appendChild(btn);

    c.appendChild(btnContainer);
    c.appendChild(panel);
    document.body.appendChild(c);

    document.getElementById("sp-extract-btn").onclick = togglePanel;
    document.getElementById("sp-close-panel").onclick = closePanel;
    document.getElementById("sp-select-all").onclick = selectAll;
    document.getElementById("sp-import-selected").onclick = importSelected;

    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', analyzeProfile);
    }
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

    // Show consent modal before importing
    showConsentModal(selected);
  }

  function showConsentModal(profiles) {
    // Remove old modal if exists
    var oldModal = document.getElementById('sp-consent-modal');
    if (oldModal) oldModal.remove();

    var modal = document.createElement('div');
    modal.id = 'sp-consent-modal';
    modal.innerHTML = '<div class="sp-consent-modal-content">' +
      '<div class="sp-consent-modal-header">' +
      '<h3>📥 Confirmer l\'import</h3>' +
      '<button id="sp-close-consent-modal" class="sp-close-btn">×</button>' +
      '</div>' +
      '<div class="sp-consent-modal-body">' +
      '<p class="sp-consent-count"><strong>' + profiles.length + ' profil(s)</strong> selectionne(s)</p>' +
      '<div class="sp-consent-info">' +
      '<h4>🔒 Donnees importees :</h4>' +
      '<ul>' +
      '<li>Nom et prenom</li>' +
      '<li>Titre professionnel</li>' +
      '<li>URL du profil LinkedIn</li>' +
      '</ul>' +
      '<h4>📍 Ou seront-elles stockees ?</h4>' +
      '<p>Dans votre CRM Social Prospector personnel, accessible uniquement par vous.</p>' +
      '</div>' +
      '<label class="sp-consent-checkbox">' +
      '<input type="checkbox" id="sp-consent-check">' +
      '<span>J\'accepte d\'importer ces donnees dans mon CRM personnel</span>' +
      '</label>' +
      '</div>' +
      '<div class="sp-consent-modal-footer">' +
      '<button class="sp-btn sp-btn-secondary" id="sp-cancel-import">Annuler</button>' +
      '<button class="sp-btn sp-btn-primary" id="sp-confirm-import" disabled>Importer</button>' +
      '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('sp-close-consent-modal').addEventListener('click', function() {
      modal.remove();
    });

    document.getElementById('sp-cancel-import').addEventListener('click', function() {
      modal.remove();
    });

    var checkbox = document.getElementById('sp-consent-check');
    var confirmBtn = document.getElementById('sp-confirm-import');

    checkbox.addEventListener('change', function() {
      confirmBtn.disabled = !checkbox.checked;
    });

    confirmBtn.addEventListener('click', function() {
      if (!checkbox.checked) return;

      confirmBtn.innerHTML = '⏳ Import...';
      confirmBtn.disabled = true;

      chrome.runtime.sendMessage({ action: "importLinkedInProfiles", profiles: profiles })
        .then(function(r) {
          if (r && r.success) {
            document.querySelector(".sp-status-text").textContent = "Importe!";
            modal.remove();
            window.open(CONFIG.APP_URL + "/prospects?source=linkedin", "_blank");
          } else {
            confirmBtn.innerHTML = 'Importer';
            confirmBtn.disabled = false;
            alert('Erreur lors de l\'import');
          }
        })
        .catch(function(err) {
          confirmBtn.innerHTML = 'Importer';
          confirmBtn.disabled = false;
          alert('Erreur : ' + err.message);
        });
    });

    // Close on click outside
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // ============================================
  // OBSERVATION DES CHANGEMENTS DE PAGE
  // ============================================

  function observePageChanges() {
    var lastUrl = location.href;
    new MutationObserver(function() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(createFloatingButton, 1500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ============================================
  // INITIALISATION
  // ============================================

  function init() {
    console.log("[Social Prospector] LinkedIn content script loaded with AI analysis");
    setTimeout(createFloatingButton, 1500);
    observePageChanges();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
