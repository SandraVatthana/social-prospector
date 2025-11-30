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
    const { query, platform = 'instagram', limit = 20 } = req.query;

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

    // Sauvegarder la recherche
    await saveSearch(req.user.id, query, platform);

    // Rechercher via Apify (ou mock si pas configuré)
    let prospects;
    if (process.env.APIFY_API_KEY) {
      prospects = await searchSimilarProfiles(query, platform, limit);
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
    if (process.env.APIFY_API_KEY) {
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

// ============ Helper Functions ============

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

export default router;
