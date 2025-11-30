/**
 * Service Apify pour scraper les posts Instagram/TikTok
 */

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

// Actors Apify pour chaque plateforme
const APIFY_ACTORS = {
  instagram: 'apify/instagram-post-scraper',
  tiktok: 'clockworks/tiktok-scraper',
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
    // Lancer l'actor Apify
    const runResponse = await fetch(
      `https://api.apify.com/v2/acts/${APIFY_ACTORS.instagram}/runs?token=${APIFY_API_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${username}/`],
          resultsLimit: limit,
          resultsType: 'posts',
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

export default {
  scrapeInstagramPosts,
  scrapeTikTokPosts,
};
