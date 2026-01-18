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
  const tutoiement = profile?.tutoiement === 'Toujours' ? 'Tu TUTOIES OBLIGATOIREMENT. Jamais de "vous", toujours "tu".' :
                     profile?.tutoiement === 'Jamais' ? 'Tu VOUVOIES OBLIGATOIREMENT. Jamais de "tu", toujours "vous".' :
                     'Tu tutoies par défaut (style Instagram/TikTok).';

  let prompt = `Tu es un expert en prospection personnalisée sur les réseaux sociaux.
Tu génères des messages qui MONTRENT que tu as vraiment regardé le contenu du prospect.

Style: ${tone}

FORME D'ADRESSE (OBLIGATOIRE): ${tutoiement}

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

/**
 * POST /api/prospects
 * Sauvegarde un ou plusieurs prospects dans le CRM
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { prospects } = req.body;
    const userId = req.user.id;

    console.log(`[Prospects] POST received - User: ${userId}, Body keys:`, Object.keys(req.body));
    console.log(`[Prospects] Prospects received:`, prospects?.length || 0);

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      console.log(`[Prospects] No prospects to save - prospects:`, prospects);
      return res.status(400).json(formatError('Aucun prospect à sauvegarder', 'NO_PROSPECTS'));
    }

    console.log(`[Prospects] Saving ${prospects.length} prospects for user ${userId}`);
    console.log(`[Prospects] First prospect sample:`, JSON.stringify(prospects[0], null, 2));

    // Récupérer les usernames déjà existants pour cet utilisateur
    const usernames = prospects.map(p => p.username);
    const { data: existingProspects } = await supabaseAdmin
      .from('prospects')
      .select('username, platform')
      .eq('user_id', userId)
      .in('username', usernames);

    const existingKeys = new Set(
      (existingProspects || []).map(p => `${p.platform}:${p.username}`)
    );

    // Filtrer les prospects déjà existants
    const newProspects = prospects.filter(p => {
      const key = `${p.platform || 'instagram'}:${p.username}`;
      return !existingKeys.has(key);
    });

    console.log(`[Prospects] ${newProspects.length} new prospects (${prospects.length - newProspects.length} already exist)`);

    if (newProspects.length === 0) {
      return res.json(formatResponse({
        saved: 0,
        message: 'Tous ces prospects sont déjà dans votre CRM'
      }));
    }

    // Préparer les données pour insertion (colonnes existantes seulement)
    const prospectsToInsert = newProspects.map(p => ({
      user_id: userId,
      username: p.username,
      platform: p.platform || 'instagram',
      full_name: p.fullName || p.full_name || null,
      bio: p.bio || null,
      avatar_url: p.avatar || p.avatarUrl || p.profilePicUrl || null,
      followers: p.followers || p.followersCount || 0,
      following: p.following || p.followingCount || 0,
      posts_count: p.posts || p.postsCount || 0,
      status: 'new',
      created_at: new Date().toISOString(),
    }));

    // Insérer les nouveaux prospects
    console.log(`[Prospects] Inserting ${prospectsToInsert.length} prospects...`);
    console.log(`[Prospects] Insert data sample:`, JSON.stringify(prospectsToInsert[0], null, 2));

    const { data, error } = await supabaseAdmin
      .from('prospects')
      .insert(prospectsToInsert)
      .select();

    if (error) {
      console.error('[Prospects] Error saving:', error);
      console.error('[Prospects] Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json(formatError('Erreur lors de la sauvegarde', 'SAVE_ERROR'));
    }

    console.log(`[Prospects] SUCCESS - Saved ${data?.length || 0} prospects`);

    res.json(formatResponse({
      saved: data?.length || newProspects.length,
      message: `${data?.length || newProspects.length} prospect(s) ajouté(s) au CRM`
    }));

  } catch (error) {
    console.error('[Prospects] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * GET /api/prospects
 * Liste les prospects de l'utilisateur
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Prospects] Error fetching:', error);
      return res.status(500).json(formatError('Erreur lors de la récupération', 'FETCH_ERROR'));
    }

    res.json(formatResponse({ prospects: data || [] }));

  } catch (error) {
    console.error('[Prospects] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});


/**
 * POST /api/prospects/linkedin/import
 * Import de profils LinkedIn depuis l'extension Chrome
 */
router.post('/linkedin/import', async (req, res) => {
  try {
    const { profiles, importedAt } = req.body;

    console.log(`[LinkedIn Import] Received ${profiles?.length || 0} profiles at ${importedAt}`);

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json(formatError('Aucun profil LinkedIn fourni', 'NO_PROFILES'));
    }

    // Extraire les URLs de profil pour deduplication
    const profileUrls = profiles.map(p => p.profileUrl).filter(Boolean);

    // Verifier les doublons existants
    const { data: existingProfiles } = await supabaseAdmin
      .from('prospects')
      .select('username')
      .eq('platform', 'linkedin')
      .in('username', profileUrls);

    const existingUrls = new Set((existingProfiles || []).map(p => p.username));

    // Filtrer les nouveaux profils
    const newProfiles = profiles.filter(p => p.profileUrl && !existingUrls.has(p.profileUrl));

    console.log(`[LinkedIn Import] ${newProfiles.length} new profiles (${profiles.length - newProfiles.length} duplicates)`);

    if (newProfiles.length === 0) {
      return res.json(formatResponse({
        imported: 0,
        duplicates: profiles.length,
        message: 'Tous les profils sont deja importes'
      }));
    }

    // Preparer les donnees pour insertion
    const prospectsToInsert = newProfiles.map(p => ({
      username: p.profileUrl,
      platform: 'linkedin',
      full_name: p.name || null,
      bio: p.headline || null,
      avatar_url: p.avatar || null,
      followers: 0,
      following: 0,
      posts_count: 0,
      status: 'new',
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabaseAdmin
      .from('prospects')
      .insert(prospectsToInsert)
      .select();

    if (error) {
      console.error('[LinkedIn Import] Insert error:', error);
      return res.status(500).json(formatError("Erreur lors de l'import", 'IMPORT_ERROR'));
    }

    console.log(`[LinkedIn Import] SUCCESS - Imported ${data?.length || 0} profiles`);

    res.json(formatResponse({
      imported: data?.length || newProfiles.length,
      duplicates: profiles.length - newProfiles.length,
      message: `${data?.length || newProfiles.length} profil(s) LinkedIn importe(s)`
    }));

  } catch (error) {
    console.error('[LinkedIn Import] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * PUT /api/prospects/:id/notes
 * Met à jour les notes d'un prospect
 */
router.put('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userId = req.user.id;

    // Vérifier que le prospect appartient à l'utilisateur
    const { data: existing } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    // Mettre à jour les notes
    const { data, error } = await supabaseAdmin
      .from('prospects')
      .update({
        notes: notes || null,
        notes_updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select('id, notes, notes_updated_at')
      .single();

    if (error) {
      console.error('[Prospects] Notes update error:', error);
      return res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
    }

    res.json(formatResponse({
      success: true,
      prospect: data
    }));

  } catch (error) {
    console.error('[Prospects] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * DELETE /api/prospects/:id
 * Supprime un prospect
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que le prospect appartient à l'utilisateur
    const { data: existing } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    // Supprimer le prospect
    const { error } = await supabaseAdmin
      .from('prospects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('[Prospects] Delete error:', error);
      return res.status(500).json(formatError('Erreur lors de la suppression', 'DELETE_ERROR'));
    }

    res.json(formatResponse({ deleted: true }));

  } catch (error) {
    console.error('[Prospects] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

export default router;
