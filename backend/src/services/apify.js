/**
 * Service Apify pour scraper les posts Instagram/TikTok
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

// Actors Apify pour chaque plateforme (mis à jour Dec 2025)
// Note: utiliser ~ au lieu de / dans les URLs API
// Actors officiels vérifiés sur https://apify.com/store
const APIFY_ACTORS = {
  instagram: 'apify~instagram-scraper',           // Recherche générale
  instagramProfile: 'apify~instagram-profile-scraper',  // Détails profil
  instagramPosts: 'apify~instagram-post-scraper',       // Posts d'un compte
  instagramHashtag: 'apify~instagram-hashtag-scraper',  // Posts par hashtag
  instagramComments: 'apify~instagram-comment-scraper', // Commentaires
  tiktok: 'clockworks~free-tiktok-scraper',
  tiktokProfile: 'clockworks~free-tiktok-scraper',
};

/**
 * Scrape les derniers posts d'un profil Instagram
 * @param {string} username - Nom d'utilisateur Instagram
 * @param {number} limit - Nombre de posts à récupérer (défaut: 3)
 * @returns {Promise<Array>} - Liste des posts formatés
 */
export async function scrapeInstagramPosts(username, limit = 3) {
  if (!APIFY_API_TOKEN) {
    console.log('APIFY_API_TOKEN non configuré, utilisation des données mock');
    return getMockPosts(username, 'instagram', limit);
  }

  try {
    // Lancer l'actor Apify - apify/instagram-scraper
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTORS.instagram}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsLimit: limit,
          resultsType: 'posts',
          addParentData: false,
        }),
      }
    );

    if (!runResponse.ok) {
      throw new Error(`Apify run failed: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    // Attendre que le run soit terminé (polling)
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30; // 30 secondes max

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Apify run failed with status: ${status}`);
    }

    // Récupérer les résultats
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const results = await resultsResponse.json();

    // Formater les résultats
    return formatInstagramPosts(results.slice(0, limit));
  } catch (error) {
    console.error('Erreur scraping Instagram:', error);
    return getMockPosts(username, 'instagram', limit);
  }
}

/**
 * Scrape les derniers posts d'un profil TikTok
 * @param {string} username - Nom d'utilisateur TikTok
 * @param {number} limit - Nombre de posts à récupérer (défaut: 3)
 * @returns {Promise<Array>} - Liste des posts formatés
 */
export async function scrapeTikTokPosts(username, limit = 3) {
  if (!APIFY_API_TOKEN) {
    console.log('APIFY_API_TOKEN non configuré, utilisation des données mock');
    return getMockPosts(username, 'tiktok', limit);
  }

  try {
    // Lancer l'actor Apify
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTORS.tiktok}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profiles: [username],
          resultsPerPage: limit,
          shouldDownloadVideos: false,
        }),
      }
    );

    if (!runResponse.ok) {
      throw new Error(`Apify run failed: ${runResponse.status}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;

    // Attendre que le run soit terminé
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 30;

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Apify run failed with status: ${status}`);
    }

    // Récupérer les résultats
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const results = await resultsResponse.json();

    return formatTikTokPosts(results.slice(0, limit));
  } catch (error) {
    console.error('Erreur scraping TikTok:', error);
    return getMockPosts(username, 'tiktok', limit);
  }
}

/**
 * Formate les posts Instagram depuis Apify
 */
function formatInstagramPosts(posts) {
  return posts.map(post => ({
    id: post.id || post.shortCode,
    thumbnail: post.displayUrl || post.thumbnailUrl,
    caption: post.caption || '',
    publishedAt: post.timestamp || post.takenAtTimestamp,
    likes: post.likesCount || 0,
    comments: post.commentsCount || 0,
    hashtags: extractHashtags(post.caption || ''),
    type: post.type || 'image',
    url: `https://instagram.com/p/${post.shortCode || post.id}`,
  }));
}

/**
 * Formate les posts TikTok depuis Apify
 */
function formatTikTokPosts(posts) {
  return posts.map(post => ({
    id: post.id,
    thumbnail: post.videoMeta?.coverUrl || post.covers?.[0],
    caption: post.text || '',
    publishedAt: post.createTime || post.createdAt,
    likes: post.diggCount || post.stats?.diggCount || 0,
    comments: post.commentCount || post.stats?.commentCount || 0,
    hashtags: post.hashtags?.map(h => h.name) || extractHashtags(post.text || ''),
    type: 'video',
    url: post.webVideoUrl || `https://tiktok.com/@${post.authorMeta?.name}/video/${post.id}`,
  }));
}

/**
 * Extrait les hashtags d'un texte
 */
function extractHashtags(text) {
  const regex = /#(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(h => h.substring(1)) : [];
}

/**
 * Génère des posts mock pour la démo
 */
function getMockPosts(username, platform, limit) {
  const mockPostsInstagram = [
    {
      id: 'mock_1',
      thumbnail: 'https://picsum.photos/seed/post1/400/400',
      caption: '🌟 Nouveau coaching disponible ! J\'accompagne les entrepreneurs à développer leur activité avec des méthodes qui ont fait leurs preuves. DM pour en savoir plus ! #coaching #entrepreneur #business #success',
      publishedAt: Date.now() - 86400000, // Il y a 1 jour
      likes: 234,
      comments: 45,
      hashtags: ['coaching', 'entrepreneur', 'business', 'success'],
      type: 'image',
      url: 'https://instagram.com/p/mock_1',
    },
    {
      id: 'mock_2',
      thumbnail: 'https://picsum.photos/seed/post2/400/400',
      caption: 'Les 3 erreurs que font 90% des débutants en business en ligne 👇\n\n1. Ne pas définir sa cible\n2. Vouloir plaire à tout le monde\n3. Négliger le personal branding\n\nTu te reconnais ? #businessonline #mindset',
      publishedAt: Date.now() - 172800000, // Il y a 2 jours
      likes: 567,
      comments: 89,
      hashtags: ['businessonline', 'mindset'],
      type: 'carousel',
      url: 'https://instagram.com/p/mock_2',
    },
    {
      id: 'mock_3',
      thumbnail: 'https://picsum.photos/seed/post3/400/400',
      caption: 'Behind the scenes de ma dernière formation en ligne ! 🎬 Tellement fière du résultat. Merci à tous ceux qui m\'ont fait confiance 🙏 #formation #elearning #grateful',
      publishedAt: Date.now() - 345600000, // Il y a 4 jours
      likes: 892,
      comments: 156,
      hashtags: ['formation', 'elearning', 'grateful'],
      type: 'video',
      url: 'https://instagram.com/p/mock_3',
    },
  ];

  const mockPostsTikTok = [
    {
      id: 'tiktok_1',
      thumbnail: 'https://picsum.photos/seed/tiktok1/400/700',
      caption: 'POV: tu comprends enfin pourquoi ton business stagne 💡 #entrepreneur #businesstips #growthmindset',
      publishedAt: Date.now() - 43200000, // Il y a 12h
      likes: 12400,
      comments: 234,
      hashtags: ['entrepreneur', 'businesstips', 'growthmindset'],
      type: 'video',
      url: 'https://tiktok.com/@user/video/tiktok_1',
    },
    {
      id: 'tiktok_2',
      thumbnail: 'https://picsum.photos/seed/tiktok2/400/700',
      caption: 'Réponse à @user comment je gère mon temps en tant qu\'entrepreneur solo 🕐 #productivite #solopreneur',
      publishedAt: Date.now() - 129600000, // Il y a 1.5 jours
      likes: 8700,
      comments: 156,
      hashtags: ['productivite', 'solopreneur'],
      type: 'video',
      url: 'https://tiktok.com/@user/video/tiktok_2',
    },
    {
      id: 'tiktok_3',
      thumbnail: 'https://picsum.photos/seed/tiktok3/400/700',
      caption: 'Story time: comment j\'ai lancé mon premier produit digital avec 0€ de budget 🚀 #digitalproduct #sidehustle',
      publishedAt: Date.now() - 259200000, // Il y a 3 jours
      likes: 23500,
      comments: 478,
      hashtags: ['digitalproduct', 'sidehustle'],
      type: 'video',
      url: 'https://tiktok.com/@user/video/tiktok_3',
    },
  ];

  const posts = platform === 'tiktok' ? mockPostsTikTok : mockPostsInstagram;
  return posts.slice(0, limit);
}

/**
 * Enrichit les profils avec leurs bios en utilisant instagram-profile-scraper
 * Fait un batch de requêtes pour économiser les crédits
 */
async function enrichProfilesWithBios(profiles) {
  if (!APIFY_API_TOKEN || profiles.length === 0) return profiles;

  // Filtrer les profils qui n'ont pas de bio
  const profilesWithoutBio = profiles.filter(p => !p.bio || p.bio.length < 5);

  if (profilesWithoutBio.length === 0) {
    console.log('[Apify] All profiles already have bios');
    return profiles;
  }

  console.log(`[Apify] Enriching ${profilesWithoutBio.length} profiles with bios...`);

  try {
    // Construire les URLs des profils à enrichir (max 20 pour limiter les coûts)
    const profilesToEnrich = profilesWithoutBio.slice(0, 20);
    const directUrls = profilesToEnrich.map(p => `https://www.instagram.com/${p.username}/`);

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTORS.instagramProfile}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls,
          resultsLimit: profilesToEnrich.length,
        }),
      }
    );

    if (!runResponse.ok) {
      console.error('[Apify/Enrich] Failed to start run');
      return profiles;
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`[Apify/Enrich] Run started: ${runId}`);

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
        console.log(`[Apify/Enrich] Status: ${status} (attempt ${attempts})`);
      }
    }

    if (status !== 'SUCCEEDED') {
      console.error(`[Apify/Enrich] Run failed with status: ${status}`);
      return profiles;
    }

    // Récupérer les résultats
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const enrichedData = await resultsResponse.json();

    console.log(`[Apify/Enrich] Got ${enrichedData.length} enriched profiles`);

    // Créer un map username -> bio pour fusionner
    const bioMap = {};
    for (const data of enrichedData) {
      if (data.username && data.biography) {
        bioMap[data.username.toLowerCase()] = {
          bio: data.biography,
          fullName: data.fullName || data.full_name,
          followers: data.followersCount || data.edge_followed_by?.count,
          following: data.followsCount || data.edge_follow?.count,
          posts: data.postsCount || data.edge_owner_to_timeline_media?.count,
          isPrivate: data.isPrivate || data.is_private,
          isVerified: data.verified || data.is_verified,
        };
      }
    }

    // Fusionner les données
    return profiles.map(profile => {
      const enrichment = bioMap[profile.username.toLowerCase()];
      if (enrichment) {
        return {
          ...profile,
          bio: enrichment.bio || profile.bio,
          fullName: enrichment.fullName || profile.fullName,
          followers: enrichment.followers || profile.followers,
          following: enrichment.following || profile.following,
          posts: enrichment.posts || profile.posts,
          isPrivate: enrichment.isPrivate ?? profile.isPrivate,
          isVerified: enrichment.isVerified ?? profile.isVerified,
        };
      }
      return profile;
    });

  } catch (error) {
    console.error('[Apify/Enrich] Error:', error);
    return profiles;
  }
}

/**
 * Recherche des profils similaires sur Instagram
 * @param {string} query - Nom d'utilisateur ou hashtag
 * @param {string} platform - Plateforme (instagram/tiktok)
 * @param {number} limit - Nombre de résultats
 */
export async function searchSimilarProfiles(query, platform = 'instagram', limit = 20) {
  if (!APIFY_API_TOKEN) {
    console.log('APIFY_API_TOKEN non configuré, utilisation des données mock');
    return getMockProfiles(query, platform, limit);
  }

  try {
    // Utiliser les bons actors selon la plateforme
    // Note: instagram-scraper supporte la recherche de profils via 'search' + 'searchType'
    const actorId = platform === 'tiktok'
      ? APIFY_ACTORS.tiktokProfile
      : APIFY_ACTORS.instagram;

    console.log(`[Apify] Recherche "${query}" sur ${platform} avec actor: ${actorId}`);

    // Configuration selon la plateforme
    // Doc: https://apify.com/apify/instagram-scraper
    // Demander plus de résultats pour compenser le filtrage français
    const searchLimit = Math.min(limit * 3, 100); // 3x pour filtrage, max 100

    const inputConfig = platform === 'tiktok'
      ? {
          profiles: [query],
          resultsPerPage: searchLimit,
          shouldDownloadVideos: false,
        }
      : {
          // Instagram Scraper - recherche de profils
          search: query,
          resultsLimit: searchLimit,
          searchType: 'user',  // 'user', 'hashtag', ou 'place'
        };

    console.log('[Apify] Config:', JSON.stringify(inputConfig));

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
      console.error('[Apify] Error response:', errorText);
      throw new Error(`Apify run failed: ${runResponse.status} - ${errorText}`);
    }

    const runData = await runResponse.json();
    const runId = runData.data.id;
    console.log(`[Apify] Run started: ${runId}`);

    // Polling pour le résultat
    let status = 'RUNNING';
    let attempts = 0;
    const maxAttempts = 60;

    while (status === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`[Apify] Status: ${status} (attempt ${attempts})`);
      }
    }

    if (status !== 'SUCCEEDED') {
      throw new Error(`Apify run failed with status: ${status}`);
    }

    console.log('[Apify] Run completed, fetching results...');

    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const results = await resultsResponse.json();

    console.log(`[Apify] Got ${results.length} results`);

    let formatted = formatProfiles(results, platform);

    // Enrichir les profils avec les bios si on est sur Instagram
    // L'actor de recherche ne retourne pas toujours les bios
    if (platform === 'instagram' && formatted.length > 0) {
      formatted = await enrichProfilesWithBios(formatted);
    }

    // Limiter au nombre demandé après filtrage
    formatted = formatted.slice(0, limit);

    // Log les données de followers pour debug
    if (formatted.length > 0) {
      console.log('[Apify] Profiles followers:', formatted.map(p => `@${p.username}: ${p.followers}`).join(', '));
    }

    return formatted;
  } catch (error) {
    console.error('Erreur recherche profils:', error);
    return getMockProfiles(query, platform, limit);
  }
}

/**
 * Récupère les détails d'un profil
 */
export async function getProfileDetails(username, platform = 'instagram') {
  if (!APIFY_API_TOKEN) {
    return getMockProfileDetails(username, platform);
  }

  try {
    const actorId = platform === 'tiktok'
      ? APIFY_ACTORS.tiktokProfile
      : APIFY_ACTORS.instagramProfile;

    // Configuration selon la plateforme
    const inputConfig = platform === 'tiktok'
      ? {
          profiles: [username],
          resultsPerPage: 1,
          shouldDownloadVideos: false,
        }
      : {
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsLimit: 1,
          resultsType: 'details',
        };

    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputConfig),
      }
    );

    const runData = await runResponse.json();
    const runId = runData.data.id;

    // Wait for completion
    let status = 'RUNNING';
    let attempts = 0;
    while (status === 'RUNNING' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data.status;
      attempts++;
    }

    const resultsResponse = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}`
    );
    const results = await resultsResponse.json();

    if (results.length > 0) {
      return formatProfile(results[0], platform);
    }

    throw new Error('Profile not found');
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    return getMockProfileDetails(username, platform);
  }
}

function formatProfiles(profiles, platform) {
  // Filtrer les erreurs et profils invalides
  const validProfiles = profiles.filter(p => p && !p.error && p.username);
  return validProfiles.map(p => formatProfile(p, platform));
}

function formatProfile(profile, platform) {
  if (platform === 'tiktok') {
    return {
      id: profile.id || profile.uniqueId || `tiktok_${Date.now()}`,
      username: profile.uniqueId || profile.username,
      platform: 'tiktok',
      fullName: profile.nickname || profile.name || profile.username,
      bio: profile.signature || profile.bio || '',
      avatar: profile.avatarThumb || profile.avatar || 'https://i.pravatar.cc/150',
      followers: profile.followerCount || profile.fans || 0,
      following: profile.followingCount || profile.following || 0,
      posts: profile.videoCount || profile.posts || 0,
      engagement: calculateEngagement(profile),
      score: calculateScore(profile),
      isVerified: profile.verified || false,
      isPrivate: profile.privateAccount || profile.isPrivate || false,
      recentPosts: formatRecentPosts(profile.latestPosts || [], 'tiktok'),
    };
  }

  // Instagram - format depuis instagram-search-scraper
  return {
    id: profile.id || profile.pk || `ig_${Date.now()}`,
    username: profile.username || '',
    platform: 'instagram',
    fullName: profile.fullName || profile.full_name || profile.username || '',
    bio: profile.biography || profile.bio || '',
    avatar: profile.profilePicUrl || profile.profilePicUrlHD || profile.profile_pic_url || 'https://i.pravatar.cc/150',
    followers: profile.followersCount || profile.follower_count || 0,
    following: profile.followsCount || profile.followingCount || profile.following_count || 0,
    posts: profile.postsCount || profile.media_count || 0,
    engagement: calculateEngagement(profile),
    score: calculateScore(profile),
    isVerified: profile.verified || false,
    isPrivate: profile.isPrivate || profile.is_private || false,
    lastActive: '1j',
    recentPosts: formatRecentPosts(profile.latestPosts || [], 'instagram'),
  };
}

function formatRecentPosts(posts, platform) {
  if (!posts || !Array.isArray(posts)) return [];

  return posts.slice(0, 3).map((post, idx) => ({
    id: post.id || post.shortCode || `post_${idx}`,
    thumbnail: post.displayUrl || post.thumbnail || `https://picsum.photos/seed/${idx}/400/400`,
    caption: post.caption || '',
    publishedAt: post.timestamp ? new Date(post.timestamp).getTime() : Date.now() - (idx + 1) * 86400000,
    likes: post.likesCount || post.likes || 0,
    comments: post.commentsCount || post.comments || 0,
    hashtags: post.hashtags || [],
    type: post.type === 'Video' ? 'video' : 'image',
    url: post.url || `https://${platform}.com/p/${post.shortCode || post.id}`,
  }));
}

function calculateEngagement(profile) {
  const followers = profile.followersCount || profile.followerCount || profile.fans || 1;
  const avgLikes = profile.avgLikes || (profile.postsCount ? profile.totalLikes / profile.postsCount : 0) || followers * 0.03;
  return ((avgLikes / followers) * 100).toFixed(1);
}

function calculateScore(profile) {
  // Score basé sur engagement, activité, et taille de communauté
  const followers = profile.followersCount || profile.followerCount || 1000;
  const engagement = parseFloat(calculateEngagement(profile));

  let score = 50;
  if (followers > 1000 && followers < 100000) score += 20; // Sweet spot
  if (engagement > 3) score += 15;
  if (engagement > 5) score += 10;
  if (profile.isVerified) score += 5;

  return Math.min(99, Math.max(50, score));
}

function getMockProfiles(query, platform, limit) {
  const names = ['Emma', 'Léa', 'Marie', 'Julie', 'Sarah', 'Lucas', 'Thomas', 'Alex'];
  const suffixes = ['coaching', 'fit', 'business', 'mindset', 'lifestyle'];

  return Array.from({ length: limit }, (_, i) => ({
    id: `mock_${i}`,
    username: `${names[i % names.length].toLowerCase()}_${suffixes[i % suffixes.length]}`,
    platform,
    fullName: names[i % names.length],
    bio: 'Coach | Entrepreneur | Helping you grow',
    avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
    followers: Math.floor(Math.random() * 50000) + 5000,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: Math.floor(Math.random() * 500) + 50,
    engagement: (Math.random() * 5 + 2).toFixed(1),
    score: Math.floor(Math.random() * 30) + 70,
    isPrivate: Math.random() > 0.7, // ~30% de comptes privés
    recentPosts: getMockPosts(`${names[i % names.length]}`, platform, 3),
  }));
}

function getMockProfileDetails(username, platform) {
  return {
    username,
    platform,
    fullName: username.split('_')[0],
    bio: 'Profile loaded in demo mode',
    avatar: `https://i.pravatar.cc/150?u=${username}`,
    followers: Math.floor(Math.random() * 50000) + 1000,
    following: Math.floor(Math.random() * 1000) + 100,
    posts: Math.floor(Math.random() * 500) + 50,
    engagement: (Math.random() * 5 + 2).toFixed(1),
    score: Math.floor(Math.random() * 30) + 70,
  };
}

export default {
  scrapeInstagramPosts,
  scrapeTikTokPosts,
  searchSimilarProfiles,
  getProfileDetails,
};
// force reload
