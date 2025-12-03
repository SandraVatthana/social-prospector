import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { searchSimilarProfiles, getProfileDetails } from '../services/apify.js';

const router = Router();

/**
 * GET /api/search/similar
 * Recherche des profils similaires via Apify
 */
router.get('/similar', requireAuth, async (req, res) => {
  try {
    const { query, platform = 'instagram', limit = 20, country = '' } = req.query;

    if (!query) {
      return res.status(400).json(formatError('Query requise', 'VALIDATION_ERROR'));
    }

    // Vérifier le quota de recherches
    const canSearch = await checkSearchQuota(req.user.id);
    if (!canSearch.allowed) {
      return res.status(429).json(formatError(
        `Limite de recherches atteinte (${canSearch.used}/${canSearch.limit})`,
        'QUOTA_EXCEEDED'
      ));
    }

    // STRATÉGIE HYBRIDE pour cibler les francophones :
    // 1. Si country=fr, on traduit certains termes anglais en français
    // 2. On filtre ensuite les résultats
    let searchQuery = query;

    if (country === 'fr') {
      // Traduire les termes anglais courants en français pour de meilleurs résultats
      const translations = {
        'coach': 'coach',  // même en français
        'fitness': 'fitness france',
        'entrepreneur': 'entrepreneur france',
        'business': 'business france',
        'marketing': 'marketing france',
        'lifestyle': 'lifestyle france',
        'beauty': 'beauté',
        'food': 'cuisine',
        'travel': 'voyage',
        'fashion': 'mode',
        'health': 'santé',
        'wellness': 'bien-être',
        'mindset': 'développement personnel',
        'motivation': 'motivation france',
      };

      // Vérifier si le terme de recherche est un mot-clé simple qu'on peut améliorer
      const queryLower = query.toLowerCase().trim();

      // Si c'est un terme simple (1-2 mots) sans localisation déjà présente
      const frenchLocations = ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'nantes', 'strasbourg', 'montpellier', 'nice'];
      const hasLocation = frenchLocations.some(loc => queryLower.includes(loc));

      if (!hasLocation) {
        // Essayer de traduire ou d'ajouter "france"
        if (translations[queryLower]) {
          searchQuery = translations[queryLower];
        } else {
          // Pour les termes composés, ajouter "france" ou "français"
          searchQuery = `${query} france`;
        }
      }
    }

    console.log(`[Search] Original: "${query}", Final query: "${searchQuery}", Country: "${country || 'all'}"`);

    // Sauvegarder la recherche
    await saveSearch(req.user.id, query, platform);

    // Rechercher via Apify (ou mock si pas configuré)
    let prospects;
    if (process.env.APIFY_API_TOKEN) {
      prospects = await searchSimilarProfiles(searchQuery, platform, limit);

      // Filtrer les résultats pour garder uniquement les profils francophones si country=fr
      if (country === 'fr' && prospects.length > 0) {
        prospects = filterFrenchProfiles(prospects);
      }
    } else {
      // Mode démo - données mockées
      prospects = generateMockProspects(query, platform, limit);
    }

    res.json(formatResponse({
      prospects,
      query,
      platform,
      count: prospects.length,
      quota: {
        used: canSearch.used + 1,
        limit: canSearch.limit,
      },
    }));

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json(formatError('Erreur lors de la recherche', 'SEARCH_ERROR'));
  }
});

/**
 * GET /api/search/profile/:username
 * Récupère les détails d'un profil
 */
router.get('/profile/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { platform = 'instagram' } = req.query;

    let profile;
    if (process.env.APIFY_API_TOKEN) {
      profile = await getProfileDetails(username, platform);
    } else {
      // Mode démo
      profile = generateMockProfile(username, platform);
    }

    res.json(formatResponse(profile));

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du profil', 'FETCH_ERROR'));
  }
});

/**
 * GET /api/search/history
 * Historique des recherches
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const { data, error } = await supabaseAdmin
      .from('searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(formatResponse(data));

  } catch (error) {
    console.error('History error:', error);
    res.status(500).json(formatError('Erreur', 'FETCH_ERROR'));
  }
});

/**
 * GET /api/search/source
 * Nouvelle recherche par source (compte, hashtag, lieu)
 * Note: requireAuth temporairement optionnel pour les tests
 */
router.get('/source', async (req, res) => {
  try {
    const { sourceType, query, subtype = 'followers', limit = 50, offset = 0 } = req.query;

    if (!sourceType || !query) {
      return res.status(400).json(formatError('sourceType et query requis', 'VALIDATION_ERROR'));
    }

    const parsedOffset = parseInt(offset) || 0;

    // Vérifier le quota seulement si authentifié
    let canSearch = { allowed: true, used: 0, limit: 100 };
    if (req.user?.id) {
      canSearch = await checkSearchQuota(req.user.id);
      if (!canSearch.allowed) {
        return res.status(429).json(formatError(
          `Limite de recherches atteinte (${canSearch.used}/${canSearch.limit})`,
          'QUOTA_EXCEEDED'
        ));
      }
    }

    console.log(`[Search/Source] Type: ${sourceType}, Query: "${query}", Subtype: ${subtype}, Offset: ${parsedOffset}`);

    // Sauvegarder la recherche seulement si authentifié (et pas un "load more")
    if (req.user?.id && parsedOffset === 0) {
      await saveSearch(req.user.id, `${sourceType}:${query}`, 'instagram');
    }

    let prospects = [];

    if (process.env.APIFY_API_TOKEN) {
      // Appeler Apify selon le type de source
      // Note: l'offset est utilisé pour demander plus de résultats à Apify
      const adjustedLimit = parseInt(limit) + parsedOffset;
      prospects = await searchBySource(sourceType, query, subtype, adjustedLimit);

      // Appliquer l'offset pour renvoyer seulement les nouveaux résultats
      if (parsedOffset > 0 && prospects.length > parsedOffset) {
        prospects = prospects.slice(parsedOffset);
      } else if (parsedOffset > 0) {
        // Pas assez de résultats pour l'offset
        prospects = [];
      }

      // Enrichir les profils avec les bios (max 15 profils pour limiter les coûts)
      if (prospects.length > 0) {
        prospects = await enrichProspectsWithBios(prospects.slice(0, 15));
      }
    } else {
      // Mode démo
      console.log('[Search/Source] Mode démo - données mockées');
      prospects = generateMockProspectsForSource(query, sourceType, parseInt(limit));
    }

    res.json(formatResponse({
      prospects,
      sourceType,
      query,
      subtype,
      count: prospects.length,
      quota: {
        used: canSearch.used + 1,
        limit: canSearch.limit,
      },
    }));

  } catch (error) {
    console.error('Source search error:', error);
    res.status(500).json(formatError('Erreur lors de la recherche', 'SEARCH_ERROR'));
  }
});

// ============ Helper Functions ============

/**
 * Enrichit les prospects avec leurs bios via instagram-profile-scraper
 */
async function enrichProspectsWithBios(prospects) {
  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
  if (!APIFY_API_TOKEN || prospects.length === 0) return prospects;

  // Filtrer les profils qui n'ont pas de bio
  const profilesToEnrich = prospects.filter(p => !p.bio || p.bio.length < 5);

  if (profilesToEnrich.length === 0) {
    console.log('[Enrich] All profiles already have bios');
    return prospects;
  }

  console.log(`[Enrich] Enriching ${profilesToEnrich.length} profiles with bios...`);

  try {
    // Construire les URLs des profils à enrichir
    const directUrls = profilesToEnrich.map(p => `https://www.instagram.com/${p.username}/`);

    const inputConfig = {
      directUrls,
      resultsLimit: profilesToEnrich.length,
    };

    console.log(`[Enrich] Input config:`, JSON.stringify(inputConfig));

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputConfig),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(`[Enrich] Failed to start run: ${runResponse.status}`, errorText);
      return prospects;
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`[Enrich] Run started: ${runId}`);

    // Polling
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`[Enrich] Status: ${status} (attempt ${attempts})`);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[Enrich] Run failed: ${status}`);
      return prospects;
    }

    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const enrichedData = await resultsResponse.json();

    console.log(`[Enrich] Got ${enrichedData.length} enriched profiles`);

    // Créer un map username -> données enrichies
    const bioMap = {};
    for (const data of enrichedData) {
      if (data.username) {
        bioMap[data.username.toLowerCase()] = {
          bio: data.biography || '',
          fullName: data.fullName || data.full_name || '',
          followers: data.followersCount || data.edge_followed_by?.count || 0,
          following: data.followsCount || data.edge_follow?.count || 0,
          posts: data.postsCount || data.edge_owner_to_timeline_media?.count || 0,
          isPrivate: data.isPrivate || data.is_private || false,
          isVerified: data.verified || data.is_verified || false,
          avatar: data.profilePicUrl || data.profilePicUrlHD || '',
        };
      }
    }

    // Fusionner les données
    return prospects.map(prospect => {
      const enrichment = bioMap[prospect.username.toLowerCase()];
      if (enrichment) {
        return {
          ...prospect,
          bio: enrichment.bio || prospect.bio,
          fullName: enrichment.fullName || prospect.fullName,
          followers: enrichment.followers || prospect.followers,
          following: enrichment.following || prospect.following,
          posts: enrichment.posts || prospect.posts,
          isPrivate: enrichment.isPrivate ?? prospect.isPrivate,
          isVerified: enrichment.isVerified ?? prospect.isVerified,
          avatar: enrichment.avatar || prospect.avatar,
        };
      }
      return prospect;
    });

  } catch (error) {
    console.error('[Enrich] Error:', error);
    return prospects;
  }
}

async function checkSearchQuota(userId) {
  // Récupérer le plan de l'utilisateur
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan = user?.plan || 'free';
  const limits = {
    free: 10,      // 10 recherches/jour
    solo: 50,      // 50 recherches/jour
    agence: 200,   // 200 recherches/jour
    agency_plus: 1000,
  };

  const limit = limits[plan] || limits.free;

  // Compter les recherches du jour
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabaseAdmin
    .from('searches')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today);

  return {
    allowed: count < limit,
    used: count,
    limit,
  };
}

async function saveSearch(userId, query, platform) {
  await supabaseAdmin.from('searches').insert({
    user_id: userId,
    query,
    platform,
  });
}

function generateMockProspects(query, platform, count = 20) {
  const categories = {
    coach: [
      { suffix: 'coaching', bio: 'Coach certifié | Accompagnement personnalisé', tags: ['coaching', 'développement'] },
      { suffix: 'mindset', bio: 'Mindset coach | Transformation de vie', tags: ['mindset', 'motivation'] },
    ],
    fitness: [
      { suffix: 'fit', bio: 'Personal trainer | Programmes sur-mesure', tags: ['fitness', 'workout'] },
      { suffix: 'training', bio: 'Coach sportif | Transformation physique', tags: ['training', 'health'] },
    ],
    entrepreneur: [
      { suffix: 'business', bio: 'Entrepreneur | Partage mon parcours', tags: ['entrepreneur', 'startup'] },
      { suffix: 'ecom', bio: 'E-commerce expert | Dropshipping & Print', tags: ['ecommerce', 'business'] },
    ],
  };

  let category = 'coach';
  const queryLower = query.toLowerCase();
  if (queryLower.includes('fit') || queryLower.includes('sport')) category = 'fitness';
  else if (queryLower.includes('entrepreneur') || queryLower.includes('business')) category = 'entrepreneur';

  const templates = categories[category];
  const names = ['Emma', 'Léa', 'Marie', 'Julie', 'Sarah', 'Lucas', 'Thomas', 'Alex', 'Hugo', 'Nathan'];

  const prospects = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const firstName = names[i % names.length];
    const followers = Math.floor(Math.random() * 45000) + 5000;

    prospects.push({
      id: `mock_${i}`,
      username: `${firstName.toLowerCase()}_${template.suffix}${i}`,
      platform,
      fullName: firstName,
      bio: template.bio,
      followers,
      engagement: (Math.random() * 6 + 2).toFixed(1),
      avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      score: Math.floor(Math.random() * 25) + 75,
      recentPosts: generateMockPosts(template.tags, platform),
    });
  }

  return prospects;
}

function generateMockPosts(tags, platform) {
  return [
    {
      id: 'post_1',
      thumbnail: `https://picsum.photos/seed/${tags[0]}1/400/400`,
      caption: `Nouvelle session aujourd'hui ! #${tags[0]}`,
      likes: Math.floor(Math.random() * 2000) + 200,
      comments: Math.floor(Math.random() * 100) + 10,
      publishedAt: Date.now() - 86400000,
    },
    {
      id: 'post_2',
      thumbnail: `https://picsum.photos/seed/${tags[0]}2/400/400`,
      caption: `3 erreurs à éviter #${tags[1] || tags[0]}`,
      likes: Math.floor(Math.random() * 2000) + 200,
      comments: Math.floor(Math.random() * 100) + 10,
      publishedAt: Date.now() - 172800000,
    },
    {
      id: 'post_3',
      thumbnail: `https://picsum.photos/seed/${tags[0]}3/400/400`,
      caption: `Behind the scenes #${tags[0]}`,
      likes: Math.floor(Math.random() * 2000) + 200,
      comments: Math.floor(Math.random() * 100) + 10,
      publishedAt: Date.now() - 259200000,
    },
  ];
}

function generateMockProfile(username, platform) {
  return {
    username,
    platform,
    fullName: username.split('_')[0],
    bio: 'Profile loaded via API',
    followers: Math.floor(Math.random() * 50000) + 1000,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: Math.floor(Math.random() * 500) + 50,
    engagement: (Math.random() * 5 + 2).toFixed(1),
    avatar: `https://i.pravatar.cc/150?u=${username}`,
  };
}

/**
 * Filtre les profils pour ne garder que les francophones
 * Basé sur la bio, le nom, et les indices de localisation
 * STRATÉGIE : On garde les profils qui semblent francophones ET on exclut ceux clairement non-francophones
 */
function filterFrenchProfiles(prospects) {
  // Mots-clés FORTS indiquant un profil francophone (très fiables)
  const strongFrenchIndicators = [
    // Villes françaises
    'paris', 'lyon', 'marseille', 'toulouse', 'bordeaux', 'lille', 'nantes',
    'strasbourg', 'montpellier', 'nice', 'rennes', 'grenoble', 'rouen',
    'cannes', 'antibes', 'aix', 'nancy', 'metz', 'dijon', 'reims', 'tours',
    // Pays/régions francophones
    'france', 'français', 'française', 'francophone', 'belgique', 'bruxelles',
    'suisse', 'genève', 'lausanne', 'québec', 'montréal', 'montreal',
    // Emojis drapeaux francophones
    '🇫🇷', '🇧🇪', '🇨🇭', '🇨🇦',
  ];

  // Mots français courants dans les bios (moins fiables car peuvent être internationaux)
  const softFrenchIndicators = [
    // Mots français typiques
    'accompagnement', 'développement personnel', 'bien-être', 'bienêtre',
    'fondateur', 'fondatrice', 'créateur', 'créatrice', 'formatrice', 'formateur',
    'thérapeute', 'naturopathe', 'sophrologue', 'hypnothérapeute',
    'maman', 'papa', 'famille', 'enfants',
    'rêve', 'objectif', 'parcours', 'aventure',
    // Expressions françaises
    'dispo en dm', 'lien en bio', 'rdv', 'contactez-moi', 'rejoins-moi',
    'découvre', 'clique', 'abonne-toi', 'suis-moi',
    'à bientôt', 'merci', 'bisous',
    // Domaines typiquement français
    'auto-entrepreneur', 'micro-entreprise', 'freelance',
  ];

  // Mots qui indiquent clairement un profil NON francophone
  const nonFrenchIndicators = [
    // Anglais typique
    'based in', 'living in', 'dm for', 'link in bio', 'swipe up',
    'founder of', 'ceo of', 'helping you', 'i help',
    // Villes/pays anglophones
    'usa', 'uk', 'london', 'new york', 'nyc', 'los angeles', 'la',
    'california', 'texas', 'florida', 'chicago', 'miami', 'seattle',
    'australia', 'sydney', 'melbourne', 'canada',
    // Autres pays
    'germany', 'deutschland', 'berlin', 'münchen',
    'españa', 'madrid', 'barcelona',
    'italia', 'milano', 'roma',
    'brasil', 'brazil', 'são paulo',
    'mexico', 'méxico',
    'india', 'mumbai', 'delhi',
    // Drapeaux non-francophones
    '🇺🇸', '🇬🇧', '🇦🇺', '🇩🇪', '🇪🇸', '🇮🇹', '🇧🇷', '🇲🇽', '🇮🇳', '🇯🇵', '🇰🇷', '🇨🇳',
  ];

  const filtered = prospects.filter(prospect => {
    const bioLower = (prospect.bio || '').toLowerCase();
    const fullNameLower = (prospect.fullName || '').toLowerCase();
    const usernameLower = (prospect.username || '').toLowerCase();
    const combined = `${bioLower} ${fullNameLower} ${usernameLower}`;

    // Si pas de bio du tout, on vérifie quand même le nom/username
    const hasBio = bioLower.length > 10;

    // 1. Exclure si indicateurs clairement non-francophones
    const hasNonFrench = nonFrenchIndicators.some(indicator =>
      combined.includes(indicator.toLowerCase())
    );
    if (hasNonFrench) {
      return false;
    }

    // 2. Inclure si indicateurs forts francophones
    const hasStrongFrench = strongFrenchIndicators.some(indicator =>
      combined.includes(indicator.toLowerCase())
    );
    if (hasStrongFrench) {
      return true;
    }

    // 3. Détecter les caractères accentués français (é, è, ê, à, ù, ç, œ, æ)
    const frenchAccents = /[éèêëàâäùûüçœæîïôö]/i;
    if (frenchAccents.test(bioLower) || frenchAccents.test(fullNameLower)) {
      return true;
    }

    // 4. Inclure si indicateurs soft francophones
    const hasSoftFrench = softFrenchIndicators.some(indicator =>
      combined.includes(indicator.toLowerCase())
    );
    if (hasSoftFrench) {
      return true;
    }

    // 5. Prénoms français typiques dans le nom
    const frenchFirstNames = [
      'marie', 'léa', 'emma', 'chloé', 'camille', 'manon', 'sarah', 'julie',
      'lucas', 'hugo', 'thomas', 'maxime', 'antoine', 'nicolas', 'julien',
      'pierre', 'jean', 'louis', 'françois', 'mathieu', 'guillaume',
      'sophie', 'céline', 'nathalie', 'laure', 'pauline', 'elodie', 'aurélie',
    ];
    const hasFrencFirstName = frenchFirstNames.some(name =>
      fullNameLower.includes(name.toLowerCase())
    );
    if (hasFrencFirstName) {
      return true;
    }

    // 6. Si pas de bio, on est plus permissif pour ne pas tout filtrer
    // mais on garde quand même ceux qui n'ont pas d'indicateurs négatifs
    if (!hasBio) {
      // Garder si le username ou nom a un accent français
      if (frenchAccents.test(usernameLower) || frenchAccents.test(fullNameLower)) {
        return true;
      }
      // Exclure si username typiquement anglophone
      const englishPatterns = /_official$|_uk$|_us$|\.us$|\.uk$/i;
      if (englishPatterns.test(usernameLower)) {
        return false;
      }
      // Sans info, on garde par défaut (sera affiné plus tard)
      return true;
    }

    // 7. MODE STRICT avec bio : on EXCLUT par défaut sauf si indicateurs francophones
    return false;
  });

  console.log(`[Filter] French filter: ${prospects.length} -> ${filtered.length} profiles (${prospects.length - filtered.length} excluded)`);

  return filtered;
}

/**
 * Recherche par source via Apify
 *
 * Actors disponibles (officiels Apify) :
 * - apify/instagram-scraper : recherche générale
 * - apify/instagram-profile-scraper : détails profil
 * - apify/instagram-post-scraper : posts d'un compte
 * - apify/instagram-hashtag-scraper : posts par hashtag
 * - apify/instagram-comment-scraper : commentaires
 */
async function searchBySource(sourceType, query, subtype, limit) {
  const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

  try {
    let actorId;
    let inputConfig;

    switch (sourceType) {
      case 'account':
        // Pour les comptes, on récupère les posts et extrait les profils engagés
        // Note: Apify n'a pas d'actor pour lister les followers directement
        if (subtype === 'commenters') {
          // Récupérer les commentateurs des posts du compte
          actorId = 'apify~instagram-comment-scraper';
          inputConfig = {
            directUrls: [`https://www.instagram.com/${query}/`],
            resultsLimit: limit * 3, // Plus de commentaires pour dédupliquer
          };
        } else {
          // Pour followers/following, on utilise le post scraper et analyse l'engagement
          // Stratégie: récupérer les posts du compte et les profils qui interagissent
          actorId = 'apify~instagram-post-scraper';
          inputConfig = {
            directUrls: [`https://www.instagram.com/${query}/`],
            resultsLimit: 10, // Récupérer 10 posts récents
          };
        }
        break;

      case 'hashtag':
        // Scraping des posts par hashtag
        // On demande 3x plus de posts pour avoir plusieurs posts par utilisateur
        actorId = 'apify~instagram-hashtag-scraper';
        inputConfig = {
          hashtags: [query.replace('#', '')],
          resultsLimit: Math.min(limit * 3, 150),
        };
        break;

      case 'location':
        // Scraping des posts par lieu
        actorId = 'apify~instagram-scraper';
        inputConfig = {
          search: query,
          searchType: 'place',
          resultsLimit: limit,
        };
        break;

      default:
        throw new Error(`Source type inconnu: ${sourceType}`);
    }

    console.log(`[Apify/Source] Actor: ${actorId}, Config:`, JSON.stringify(inputConfig));

    // Lancer l'actor
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputConfig),
      }
    );

    if (!runResponse.ok) {
      const errorText = await runResponse.text();
      console.error(`[Apify/Source] Error: ${runResponse.status}`, errorText);
      throw new Error(`Apify error: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`[Apify/Source] Run started: ${runId}`);

    // Polling
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 90; // 90 secondes max

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`[Apify/Source] Status: ${status} (attempt ${attempts})`);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[Apify/Source] Run failed with status: ${status}`);
      throw new Error(`Apify run failed: ${status}`);
    }

    // Récupérer les résultats
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const results = await resultsResponse.json();

    console.log(`[Apify/Source] Got ${results.length} raw results`);

    // Formater les résultats selon le type
    return formatSourceResults(results, sourceType, subtype, limit);

  } catch (error) {
    console.error('[Apify/Source] Error:', error);
    // Fallback vers mock data
    return generateMockProspectsForSource(query, sourceType, limit);
  }
}

/**
 * Formate les résultats selon le type de source
 */
function formatSourceResults(results, sourceType, subtype, limit) {
  const prospects = [];

  console.log(`[Source] Formatting ${results.length} results for ${sourceType}/${subtype}`);

  for (const item of results) {
    // Ignorer les erreurs
    if (item.error) continue;

    let prospect;

    if (sourceType === 'account' && subtype === 'commenters') {
      // Format commenters - extraire l'auteur du commentaire
      prospect = {
        id: item.ownerUsername || item.id || `ig_${Date.now()}_${Math.random()}`,
        username: item.ownerUsername || '',
        fullName: item.ownerFullName || '',
        bio: '',
        avatar: item.ownerProfilePicUrl || item.profilePicUrl || '',
        followers: 0,
        commentText: item.text || '',
        platform: 'instagram',
      };
    } else if (sourceType === 'account') {
      // Pour followers/following, on extrait les infos des posts
      // L'actor instagram-post-scraper retourne les posts avec des données owner
      // On ne peut pas extraire les followers directement mais on peut voir les likes/comments

      // Si c'est un post, on l'utilise pour enrichir les données
      // On crée un prospect à partir du owner du post (le compte source)
      if (item.ownerUsername) {
        prospect = {
          id: item.ownerId || item.ownerUsername || `ig_${Date.now()}_${Math.random()}`,
          username: item.ownerUsername,
          fullName: item.ownerFullName || '',
          bio: '',
          avatar: item.ownerProfilePicUrl || '',
          followers: item.ownerFollowersCount || 0,
          platform: 'instagram',
          recentPosts: [{
            id: item.id || item.shortCode,
            caption: item.caption || '',
            likes: item.likesCount || 0,
            comments: item.commentsCount || 0,
            publishedAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
            url: item.url || `https://instagram.com/p/${item.shortCode}`,
          }],
        };
      }
    } else if (sourceType === 'hashtag') {
      // Format hashtag posts - extraire l'auteur du post
      prospect = {
        id: item.ownerId || item.ownerUsername || `ig_${Date.now()}_${Math.random()}`,
        username: item.ownerUsername || '',
        fullName: item.ownerFullName || '',
        bio: '',
        avatar: item.ownerProfilePicUrl || '',
        followers: item.ownerFollowersCount || 0,
        platform: 'instagram',
        isPrivate: item.ownerIsPrivate || false,
        recentPosts: [{
          id: item.id || item.shortCode,
          caption: item.caption || '',
          likes: item.likesCount || 0,
          comments: item.commentsCount || 0,
          publishedAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
          url: item.url || `https://instagram.com/p/${item.shortCode}`,
          thumbnail: item.displayUrl || '',
        }],
      };
    } else if (sourceType === 'location') {
      // Format location posts - similaire aux hashtags
      prospect = {
        id: item.ownerId || item.ownerUsername || `ig_${Date.now()}_${Math.random()}`,
        username: item.ownerUsername || '',
        fullName: item.ownerFullName || '',
        bio: '',
        avatar: item.ownerProfilePicUrl || '',
        followers: item.ownerFollowersCount || 0,
        platform: 'instagram',
        location: item.locationName || '',
        isPrivate: item.ownerIsPrivate || false,
        recentPosts: [{
          id: item.id || item.shortCode,
          caption: item.caption || '',
          likes: item.likesCount || 0,
          comments: item.commentsCount || 0,
          publishedAt: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
          url: item.url || `https://instagram.com/p/${item.shortCode}`,
          thumbnail: item.displayUrl || '',
        }],
      };
    }

    if (prospect && prospect.username) {
      // Calculer un score
      prospect.score = calculateProspectScore(prospect);
      prospects.push(prospect);
    }
  }

  // Dédupliquer par username et fusionner les posts
  const uniqueProspects = [];
  const prospectsByUsername = new Map();

  for (const p of prospects) {
    const key = p.username.toLowerCase();
    if (prospectsByUsername.has(key)) {
      // Fusionner les posts récents
      const existing = prospectsByUsername.get(key);
      if (p.recentPosts && existing.recentPosts) {
        existing.recentPosts.push(...p.recentPosts);
        // Garder seulement les 3 derniers posts
        existing.recentPosts = existing.recentPosts.slice(0, 3);
      }
      // Mettre à jour les infos si plus complètes
      if (!existing.avatar && p.avatar) existing.avatar = p.avatar;
      if (!existing.fullName && p.fullName) existing.fullName = p.fullName;
      if (!existing.followers && p.followers) existing.followers = p.followers;
    } else {
      prospectsByUsername.set(key, p);
      uniqueProspects.push(p);
    }
  }

  // Limiter au nombre demandé
  const finalProspects = uniqueProspects.slice(0, limit);
  console.log(`[Source] Formatted ${finalProspects.length} unique prospects (from ${prospects.length} total)`);
  return finalProspects;
}

/**
 * Calcule un score de pertinence
 */
function calculateProspectScore(prospect) {
  let score = 50;

  // Bonus pour nombre de followers raisonnable (pas trop petit, pas trop gros)
  const followers = prospect.followers || 0;
  if (followers >= 500 && followers < 5000) score += 20;
  else if (followers >= 5000 && followers < 50000) score += 15;
  else if (followers >= 50000 && followers < 100000) score += 10;

  // Bonus si compte vérifié
  if (prospect.isVerified) score += 10;

  // Bonus si compte public (pas privé)
  if (!prospect.isPrivate) score += 5;

  // Bonus si a une bio
  if (prospect.bio && prospect.bio.length > 10) score += 10;

  return Math.min(99, Math.max(50, score));
}

/**
 * Génère des prospects mock pour le mode démo
 */
function generateMockProspectsForSource(query, sourceType, count = 20) {
  const names = ['Emma', 'Léa', 'Marie', 'Julie', 'Sarah', 'Lucas', 'Thomas', 'Alex', 'Hugo', 'Nathan'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon'];
  const locations = ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Nantes', 'Lille', 'Nice'];
  const bios = [
    '✨ Passionnée de bien-être | Bordeaux 🇫🇷',
    'Entrepreneur | Fondateur @monentreprise | Lyon',
    'Coach sportif certifié | Transformations 💪 Paris',
    'Maman de 2 | Créatrice de contenu | Toulouse',
    '📍 Marseille | Food lover | Bons plans locaux',
    'Artisan local | Fait main 🌿 | Livraison France',
    'Photographe lifestyle | Disponible pour collabs',
    'Naturopathe certifiée | Consultations en ligne',
  ];

  const prospects = [];

  for (let i = 0; i < count; i++) {
    const firstName = names[i % names.length];
    const lastName = lastNames[i % lastNames.length];
    const location = locations[i % locations.length];
    const followers = Math.floor(Math.random() * 40000) + 500;

    prospects.push({
      id: `mock_${i}_${Date.now()}`,
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}${Math.floor(Math.random() * 99)}`,
      fullName: `${firstName} ${lastName}`,
      bio: bios[i % bios.length],
      avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      followers,
      following: Math.floor(followers * (0.1 + Math.random() * 0.4)),
      posts: Math.floor(Math.random() * 300) + 20,
      isVerified: Math.random() > 0.92,
      location,
      score: Math.floor(Math.random() * 30) + 70,
      recentPosts: [
        {
          id: `post_${i}_1`,
          caption: `Belle journée à ${location} ! 🌞 #${location.toLowerCase()}`,
          likes: Math.floor(Math.random() * 400) + 30,
          comments: Math.floor(Math.random() * 40) + 3,
          publishedAt: Date.now() - 86400000,
          url: `https://instagram.com/p/mock_${i}_1`,
        },
        {
          id: `post_${i}_2`,
          caption: 'Nouvelle semaine, nouveaux projets 💪',
          likes: Math.floor(Math.random() * 400) + 30,
          comments: Math.floor(Math.random() * 40) + 3,
          publishedAt: Date.now() - 172800000,
          url: `https://instagram.com/p/mock_${i}_2`,
        },
      ],
    });
  }

  return prospects;
}

export default router;
