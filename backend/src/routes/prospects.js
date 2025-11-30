import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { scrapeInstagramPosts, scrapeTikTokPosts } from '../services/apify.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * GET /api/prospects/:username/posts
 * Récupère les derniers posts d'un prospect
 */
router.get('/:username/posts', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const { platform = 'instagram', limit = 3 } = req.query;

    let posts;
    if (platform === 'tiktok') {
      posts = await scrapeTikTokPosts(username, parseInt(limit));
    } else {
      posts = await scrapeInstagramPosts(username, parseInt(limit));
    }

    res.json(formatResponse({ posts }));
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des posts', 'FETCH_POSTS_ERROR'));
  }
});

/**
 * POST /api/prospects/analyze-posts
 * Analyse les posts d'un prospect avec Claude pour préparer le message
 */
router.post('/analyze-posts', requireAuth, async (req, res) => {
  try {
    const { posts, prospect } = req.body;

    if (!posts || posts.length === 0) {
      return res.status(400).json(formatError('Aucun post à analyser', 'NO_POSTS'));
    }

    // Construire le prompt d'analyse
    const systemPrompt = `Tu es un expert en analyse de contenu social media.
Tu analyses les posts d'un prospect pour aider à créer un message de prospection ultra-personnalisé.

Tu dois identifier :
1. Le sujet principal du post le plus récent
2. Un élément SPÉCIFIQUE et UNIQUE à mentionner (pas de générique)
3. Le ton général utilisé par le prospect
4. Un hook personnalisé basé sur ce contenu

IMPORTANT : L'objectif est de créer une accroche qui montre qu'on a VRAIMENT regardé le contenu, pas un message générique.`;

    const postsFormatted = posts.map((post, i) => `
Post ${i + 1} (${getRelativeTime(post.publishedAt)}):
- Légende: ${post.caption || 'Pas de légende'}
- Likes: ${post.likes}, Commentaires: ${post.comments}
- Hashtags: ${post.hashtags?.join(', ') || 'Aucun'}
`).join('\n');

    const userPrompt = `Analyse ces ${posts.length} posts du prospect @${prospect.username} (${prospect.platform}):

Bio du prospect: ${prospect.bio || 'Non disponible'}

${postsFormatted}

Réponds en JSON avec ce format exact:
{
  "mainTopic": "Le sujet principal du post le plus récent",
  "specificElement": "Un élément TRÈS spécifique du contenu à mentionner",
  "prospectTone": "Le ton utilisé (ex: motivant, expert, décontracté, inspirant)",
  "suggestedHook": "Une phrase d'accroche personnalisée commençant par 'J'ai vu...' ou 'Ton post sur...'",
  "keyInsight": "Ce qui rend ce prospect unique/intéressant"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parser la réponse JSON
    const responseText = message.content[0].text;
    let analysis;

    try {
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      // Fallback avec analyse basique
      analysis = {
        mainTopic: 'Contenu varié',
        specificElement: posts[0]?.caption?.substring(0, 50) || 'Son activité',
        prospectTone: 'professionnel',
        suggestedHook: `J'ai vu ton dernier post sur ${prospect.platform}`,
        keyInsight: 'Créateur de contenu actif',
      };
    }

    res.json(formatResponse({ analysis }));
  } catch (error) {
    console.error('Error analyzing posts:', error);
    res.status(500).json(formatError('Erreur lors de l\'analyse', 'ANALYSIS_ERROR'));
  }
});

/**
 * POST /api/prospects/generate-message
 * Génère un message personnalisé basé sur l'analyse des posts
 */
router.post('/generate-message', requireAuth, async (req, res) => {
  try {
    const { prospect, posts, analysis, voiceProfile } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Récupérer le profil vocal actif si non fourni
    let profile = voiceProfile;
    if (!profile) {
      const { data: voiceData } = await supabaseAdmin
        .from('voice_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single();

      profile = voiceData?.profil_json || voiceData;
    }

    // Construire le prompt système avec le profil vocal
    const systemPrompt = buildEnhancedSystemPrompt(profile);

    // Construire le prompt utilisateur avec l'analyse des posts
    const userPrompt = buildEnhancedMessagePrompt(prospect, posts, analysis, profile);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const generatedMessage = message.content[0].text;

    res.json(formatResponse({
      message: generatedMessage,
      analysis: analysis,
      basedOnPosts: posts?.length || 0,
    }));
  } catch (error) {
    console.error('Error generating message:', error);
    res.status(500).json(formatError('Erreur lors de la génération', 'GENERATION_ERROR'));
  }
});

/**
 * Construit le prompt système enrichi
 */
function buildEnhancedSystemPrompt(profile) {
  const toneMap = {
    decontracte: 'décontracté et amical',
    professionnel: 'professionnel mais chaleureux',
    direct: 'direct et efficace',
    enthousiaste: 'enthousiaste et énergique',
  };

  const tone = profile ? (toneMap[profile.tone?.toLowerCase()] || profile.tone || 'décontracté') : 'décontracté';
  const tutoiement = profile?.tutoiement === 'Toujours' ? 'tu tutoies toujours' :
                     profile?.tutoiement === 'Jamais' ? 'tu vouvoies toujours' :
                     'tu tutoies par défaut mais peux adapter';

  let prompt = `Tu es un expert en prospection personnalisée sur les réseaux sociaux.
Tu génères des messages qui MONTRENT que tu as vraiment regardé le contenu du prospect.

Style: ${tone}
Forme: ${tutoiement}

RÈGLES ABSOLUES:
1. Le message DOIT mentionner quelque chose de SPÉCIFIQUE du contenu du prospect
2. INTERDIT: "j'adore ton contenu", "ton profil est super", "j'aime ce que tu fais" (trop générique)
3. OBLIGATOIRE: référencer un post précis, une phrase, un sujet abordé
4. Le message doit être court (3-4 phrases max)
5. Call-to-action léger et naturel
6. Ne jamais commencer par "J'espère que tu vas bien"
7. Pas de formules commerciales ou vendeur`;

  if (profile?.emojis && profile.emojis.length > 0 && profile.emojis[0] !== 'default') {
    prompt += `\n\nEmojis à utiliser avec parcimonie: ${profile.emojis.join(' ')}`;
  } else if (profile?.use_emojis === false) {
    prompt += '\n\nN\'utilise pas d\'emojis.';
  }

  if (profile?.expressions && profile.expressions.length > 0) {
    prompt += `\n\nExpressions personnelles à intégrer naturellement: ${profile.expressions.join(', ')}`;
  }

  if (profile?.business_context) {
    prompt += `\n\nContexte business:
- Activité: ${profile.business_context.activity || 'Non spécifié'}
- Cible: ${profile.business_context.target || 'Non spécifié'}
- Offre/Cadeau: ${profile.business_context.gift || 'Non spécifié'}`;
  }

  return prompt;
}

/**
 * Construit le prompt utilisateur enrichi avec l'analyse des posts
 */
function buildEnhancedMessagePrompt(prospect, posts, analysis, profile) {
  let prompt = `Génère un message de prospection pour:

PROSPECT:
- Username: @${prospect.username}
- Plateforme: ${prospect.platform || 'Instagram'}
- Bio: ${prospect.bio || 'Non disponible'}
- Followers: ${prospect.followers || 'N/A'}`;

  if (posts && posts.length > 0) {
    prompt += `\n\nDERNIERS POSTS ANALYSÉS:`;
    posts.forEach((post, i) => {
      prompt += `\n\nPost ${i + 1} (${getRelativeTime(post.publishedAt)}):
"${post.caption?.substring(0, 200)}${post.caption?.length > 200 ? '...' : ''}"
Engagement: ${post.likes} likes, ${post.comments} commentaires`;
    });
  }

  if (analysis) {
    prompt += `\n\nANALYSE DU CONTENU:
- Sujet principal: ${analysis.mainTopic}
- Élément spécifique à mentionner: ${analysis.specificElement}
- Ton du prospect: ${analysis.prospectTone}
- Hook suggéré: ${analysis.suggestedHook}
- Ce qui le rend unique: ${analysis.keyInsight}`;
  }

  prompt += `\n\nGénère le message en utilisant OBLIGATOIREMENT l'élément spécifique identifié.
Le message doit montrer que tu as vraiment lu/vu le contenu.

Écris uniquement le message, sans guillemets ni explications.`;

  return prompt;
}

/**
 * Convertit un timestamp en temps relatif
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'date inconnue';

  const now = Date.now();
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `il y a ${minutes}min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days}j`;
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

export default router;
