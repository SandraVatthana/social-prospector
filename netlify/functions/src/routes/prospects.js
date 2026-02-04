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
 * Supporte le filtrage par campaign_id
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, campaign_id, limit = 50, offset = 0 } = req.query;

    // Si filtrage par campagne, utiliser une requête avec jointure
    if (campaign_id) {
      // Récupérer les prospect_ids de la campagne
      const { data: campaignProspects, error: cpError } = await supabaseAdmin
        .from('campaign_prospects')
        .select('prospect_id')
        .eq('campaign_id', campaign_id);

      if (cpError) {
        console.error('[Prospects] Error fetching campaign prospects:', cpError);
        return res.status(500).json(formatError('Erreur lors de la récupération', 'FETCH_ERROR'));
      }

      const prospectIds = campaignProspects.map(cp => cp.prospect_id);

      if (prospectIds.length === 0) {
        return res.json(formatResponse({ prospects: [] }));
      }

      let query = supabaseAdmin
        .from('prospects')
        .select('*')
        .eq('user_id', userId)
        .in('id', prospectIds)
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

      return res.json(formatResponse({ prospects: data || [] }));
    }

    // Requête standard sans filtrage par campagne
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
 * POST /api/prospects/extension/import
 * Import universel de profils depuis l'extension Chrome (LinkedIn, Instagram, TikTok)
 */
router.post('/extension/import', requireAuth, async (req, res) => {
  try {
    const { platform, profile, posts } = req.body;
    const userId = req.user.id;

    console.log(`[Extension Import] Platform: ${platform}, User: ${userId}`);
    console.log(`[Extension Import] Profile:`, profile?.username || profile?.fullName);

    if (!profile || (!profile.username && !profile.fullName)) {
      return res.status(400).json(formatError('Profil invalide', 'INVALID_PROFILE'));
    }

    // Normaliser le username/identifiant
    const username = profile.username || profile.profileUrl || profile.fullName;
    const platformNormalized = (platform || 'instagram').toLowerCase();

    // Vérifier si le prospect existe déjà
    const { data: existingProspect } = await supabaseAdmin
      .from('prospects')
      .select('id, username')
      .eq('user_id', userId)
      .eq('platform', platformNormalized)
      .eq('username', username)
      .single();

    if (existingProspect) {
      // Mettre à jour le prospect existant avec les nouvelles données
      const updateData = {
        full_name: profile.fullName || profile.full_name || existingProspect.full_name,
        bio: profile.bio || profile.about || existingProspect.bio,
        avatar_url: profile.avatar || profile.avatarUrl || existingProspect.avatar_url,
        updated_at: new Date().toISOString()
      };

      // Stocker les données spécifiques à la plateforme dans profile_data (JSONB)
      const profileData = {
        ...profile,
        platform: platformNormalized,
        importedAt: new Date().toISOString()
      };
      updateData.profile_data = profileData;

      // Stocker les posts récents dans un champ JSON si disponibles
      if (posts && posts.length > 0) {
        updateData.recent_posts = JSON.stringify(posts.slice(0, 5));
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('prospects')
        .update(updateData)
        .eq('id', existingProspect.id)
        .select()
        .single();

      if (updateError) {
        console.error('[Extension Import] Update error:', updateError);
      }

      return res.json(formatResponse({
        prospectId: existingProspect.id,
        action: 'updated',
        message: 'Prospect mis à jour'
      }));
    }

    // Créer un nouveau prospect
    const prospectData = {
      user_id: userId,
      username: username,
      platform: platformNormalized,
      full_name: profile.fullName || profile.full_name || null,
      bio: profile.bio || profile.about || null,
      avatar_url: profile.avatar || profile.avatarUrl || null,
      followers: profile.followers_count || profile.followers || 0,
      following: profile.following_count || profile.following || 0,
      posts_count: profile.posts_count || profile.posts || 0,
      status: 'new',
      source: 'extension',
      created_at: new Date().toISOString()
    };

    // Stocker toutes les données spécifiques dans profile_data (JSONB)
    // Inclut headline, experiences, profileUrl pour LinkedIn
    prospectData.profile_data = {
      ...profile,
      platform: platformNormalized,
      importedAt: new Date().toISOString()
    };

    // Stocker les posts récents
    if (posts && posts.length > 0) {
      prospectData.recent_posts = JSON.stringify(posts.slice(0, 5));
    }

    const { data: newProspect, error: insertError } = await supabaseAdmin
      .from('prospects')
      .insert(prospectData)
      .select()
      .single();

    if (insertError) {
      console.error('[Extension Import] Insert error:', insertError);
      return res.status(500).json(formatError('Erreur lors de l\'import', 'IMPORT_ERROR'));
    }

    console.log(`[Extension Import] SUCCESS - Created prospect ${newProspect.id}`);

    res.json(formatResponse({
      prospectId: newProspect.id,
      action: 'created',
      message: 'Prospect importé avec succès'
    }));

  } catch (error) {
    console.error('[Extension Import] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/prospects/linkedin/import
 * Import de profils LinkedIn depuis l'extension Chrome (legacy)
 */
router.post('/linkedin/import', requireAuth, async (req, res) => {
  try {
    const { profiles, importedAt } = req.body;
    const userId = req.user.id;

    console.log(`[LinkedIn Import] User ${userId} - Received ${profiles?.length || 0} profiles at ${importedAt}`);

    if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
      return res.status(400).json(formatError('Aucun profil LinkedIn fourni', 'NO_PROFILES'));
    }

    // Extraire les URLs de profil pour deduplication
    const profileUrls = profiles.map(p => p.profileUrl).filter(Boolean);

    // Verifier les doublons existants pour cet utilisateur
    const { data: existingProfiles } = await supabaseAdmin
      .from('prospects')
      .select('username')
      .eq('user_id', userId)
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
      user_id: userId,
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

// ============================================
// CAMPAGNES - Pipeline Status & CSV Import
// ============================================

/**
 * Calcul automatique de next_action_date selon le statut
 */
function getNextActionDate(status) {
  const daysMap = {
    demande_envoyee: 3,
    connecte: 0,
    message_1: 3,
    relance_1: 4,
    relance_2: 7,
  };
  const days = daysMap[status];
  if (days === undefined) return null;

  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

const VALID_PIPELINE_STATUSES = [
  'demande_envoyee', 'connecte', 'message_1', 'relance_1', 'relance_2',
  'repondu_chaud', 'repondu_froid', 'rdv_pris', 'converti', 'ignore'
];

/**
 * PUT /api/prospects/:id/pipeline-status
 * Met à jour le statut pipeline d'un prospect
 */
router.put('/:id/pipeline-status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { pipeline_status, next_action_date } = req.body;
    const userId = req.user.id;

    // Valider le statut
    if (!pipeline_status || !VALID_PIPELINE_STATUSES.includes(pipeline_status)) {
      return res.status(400).json(formatError('Statut pipeline invalide', 'INVALID_STATUS'));
    }

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

    // Calculer la prochaine action si non fournie
    const calculatedNextAction = next_action_date || getNextActionDate(pipeline_status);

    // Mettre à jour le prospect
    const { data, error } = await supabaseAdmin
      .from('prospects')
      .update({
        pipeline_status,
        next_action_date: calculatedNextAction,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[Prospects] Pipeline status update error:', error);
      return res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
    }

    // Mettre à jour la date d'action dans campaign_prospects
    await supabaseAdmin
      .from('campaign_prospects')
      .update({ last_action_at: new Date().toISOString() })
      .eq('prospect_id', id);

    res.json(formatResponse(data, 'Statut mis à jour'));

  } catch (error) {
    console.error('[Prospects] Error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/prospects/import-csv
 * Import de prospects depuis un fichier CSV
 */
router.post('/import-csv', requireAuth, async (req, res) => {
  try {
    const { prospects, campaign_id } = req.body;
    const userId = req.user.id;

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json(formatError('Aucun prospect à importer', 'NO_PROSPECTS'));
    }

    // Limiter le nombre d'imports par requête
    if (prospects.length > 500) {
      return res.status(400).json(formatError('Maximum 500 prospects par import', 'TOO_MANY'));
    }

    // Vérifier que la campagne existe si fournie
    if (campaign_id) {
      const { data: campaign } = await supabaseAdmin
        .from('campaigns')
        .select('id')
        .eq('id', campaign_id)
        .eq('user_id', userId)
        .single();

      if (!campaign) {
        return res.status(404).json(formatError('Campagne non trouvée', 'CAMPAIGN_NOT_FOUND'));
      }
    }

    // Préparer les données pour l'insertion
    const initialStatus = 'demande_envoyee';
    const toInsert = prospects
      .filter(p => p.username && p.username.trim())
      .map(p => ({
        user_id: userId,
        username: p.username.trim(),
        platform: p.platform || 'linkedin',
        full_name: p.full_name?.trim() || null,
        bio: p.bio?.trim() || null,
        avatar_url: null,
        followers: 0,
        following: 0,
        posts_count: 0,
        status: 'new',
        pipeline_status: initialStatus,
        next_action_date: getNextActionDate(initialStatus),
        source: 'csv_import',
        created_at: new Date().toISOString(),
      }));

    if (toInsert.length === 0) {
      return res.status(400).json(formatError('Aucun prospect valide (username manquant)', 'INVALID_DATA'));
    }

    // Récupérer les usernames déjà existants
    const usernames = toInsert.map(p => p.username);
    const { data: existingProspects } = await supabaseAdmin
      .from('prospects')
      .select('id, username, platform')
      .eq('user_id', userId)
      .in('username', usernames);

    const existingMap = new Map(
      (existingProspects || []).map(p => [`${p.platform}:${p.username}`, p.id])
    );

    // Séparer nouveaux et existants
    const newProspects = [];
    const existingIds = [];

    toInsert.forEach(p => {
      const key = `${p.platform}:${p.username}`;
      if (existingMap.has(key)) {
        existingIds.push(existingMap.get(key));
      } else {
        newProspects.push(p);
      }
    });

    let importedCount = existingIds.length; // Les existants comptent comme "importés" pour l'assignation

    // Insérer les nouveaux prospects
    if (newProspects.length > 0) {
      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('prospects')
        .insert(newProspects)
        .select('id');

      if (insertError) {
        console.error('[Prospects] CSV import insert error:', insertError);
        return res.status(500).json(formatError('Erreur lors de l\'import', 'IMPORT_ERROR'));
      }

      importedCount += insertedData?.length || 0;

      // Ajouter les IDs des nouveaux prospects
      if (insertedData) {
        insertedData.forEach(p => existingIds.push(p.id));
      }
    }

    // Si campaign_id fourni, assigner les prospects à la campagne
    if (campaign_id && existingIds.length > 0) {
      const assignments = existingIds.map(prospect_id => ({
        campaign_id,
        prospect_id,
        stage: 'assigned',
      }));

      await supabaseAdmin
        .from('campaign_prospects')
        .upsert(assignments, { onConflict: 'campaign_id,prospect_id' });
    }

    console.log(`[Prospects] CSV import SUCCESS - ${newProspects.length} new, ${existingIds.length - newProspects.length} existing`);

    res.json(formatResponse({
      imported: newProspects.length,
      existing: existingIds.length - newProspects.length,
      total: existingIds.length,
      campaign_id: campaign_id || null,
    }, `${newProspects.length} nouveau(x) prospect(s) importé(s)`));

  } catch (error) {
    console.error('[Prospects] CSV import error:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/prospects/analyze-paste
 * Analyse du texte collé (profil + posts) avec IA pour extraire données et signaux
 * Utilisé par l'extension Chrome - Smart Paste
 */
router.post('/analyze-paste', async (req, res) => {
  try {
    const { platform, content, username } = req.body;

    if (!content || content.trim().length < 10) {
      return res.status(400).json(formatError('Contenu insuffisant à analyser', 'NO_CONTENT'));
    }

    console.log(`[Analyze Paste] Platform: ${platform}, Username: ${username}, Content length: ${content.length}`);

    // Construire le prompt d'analyse - VERSION ULTRA-CONCRÈTE
    const systemPrompt = `Tu es un analyste de profils LinkedIn. Ta spécialité: extraire des FAITS VÉRIFIABLES et formuler des questions ULTRA-CIBLÉES.

RÈGLE N°1: ZÉRO GÉNÉRIQUE. Chaque signal et chaque question doit contenir un élément qu'on ne pourrait PAS appliquer à un autre profil.

RÈGLE ABSOLUE: Retourne UNIQUEMENT du JSON valide, sans texte avant/après.`;

    const userPrompt = `Analyse ce contenu ${platform === 'linkedin' ? 'LinkedIn' : platform || 'de profil'}:

"""
${content.substring(0, 6000)}
"""

${username ? `Username connu: ${username}` : ''}

Retourne ce JSON:
{
  "profile": {
    "fullName": "UNIQUEMENT Prénom Nom (ex: 'Marie Dupont'), JAMAIS de texte parasite",
    "headline": "Titre/fonction tel que affiché",
    "company": "Nom de l'entreprise actuelle ou null",
    "bio": "Résumé en 1-2 phrases",
    "location": "Ville/Pays ou null"
  },
  "posts": [
    {
      "summary": "Résumé factuel en 1 phrase",
      "topic": "Sujet principal",
      "keyPhrase": "Une citation EXACTE du post (5-15 mots)",
      "engagement": "fort/moyen/faible"
    }
  ],
  "signals": [
    {
      "type": "fort|faible",
      "category": "lancement|croissance|recrutement|changement|problème|projet|expertise",
      "quote": "CITATION EXACTE du profil/post (copier-coller, 5-20 mots)",
      "fact": "LE FAIT CONCRET: [qui] [fait quoi] [où/quand si dispo]",
      "opportunity": "Pourquoi c'est un bon moment pour le contacter"
    }
  ],
  "angles": [
    {
      "question": "Question contenant au moins 1 élément SPÉCIFIQUE du profil",
      "specificElement": "L'élément précis utilisé (nom de boîte, projet, lieu, chiffre, etc.)",
      "basedOn": "post|headline|experience|about"
    }
  ]
}

=== EXTRACTION DU NOM ===
- fullName = "Prénom Nom" uniquement
- INTERDIT: "Lien vers...", "Photo de...", "Voir le profil..."
- Si introuvable → null

=== POSTS (si présents) ===
- Extrais les 3 derniers posts visibles
- keyPhrase = copier-coller d'une phrase clé (pas de reformulation)
- Si aucun post → tableau vide []

=== SIGNAUX: EXIGENCE DE PREUVE ===
Chaque signal DOIT contenir:
1. "quote": une citation EXACTE copiée du contenu (entre guillemets)
2. "fact": le fait reformulé clairement: QUI fait QUOI (et où/quand si disponible)
3. "opportunity": pourquoi c'est intéressant MAINTENANT

❌ INTERDIT - Signal générique:
{"quote": "Marketing", "fact": "S'intéresse au marketing", "opportunity": "Peut avoir besoin de conseils"}

✅ OBLIGATOIRE - Signal spécifique:
{"quote": "On recrute 3 commerciaux B2B sur Lyon", "fact": "Scale-up en phase de croissance commerciale à Lyon", "opportunity": "Budget recrutement = budget formation potentiel"}

❌ INTERDIT:
- "Actif sur les réseaux" (= tout le monde)
- "Intérêt pour le marketing" (= vague)
- "Profil entrepreneurial" (= bateau)

✅ OBLIGATOIRE:
- "Vient de lancer [nom du produit/projet]"
- "Recrute [X profils] pour [raison]"
- "Mentionne un problème de [sujet précis]"
- "A publié [X] posts sur [thème] en [période]"

=== QUESTIONS: TEST DU COPIER-COLLER ===
Avant de valider une question, fais ce test mental:
"Est-ce que cette question marcherait si je l'envoie à 10 autres personnes au hasard?"
→ Si OUI, la question est trop générique. REFORMULE.

Chaque question DOIT contenir au moins UN de ces éléments tirés du profil:
- Le nom de son entreprise/projet
- Son rôle exact
- Une ville/région
- Un chiffre mentionné
- Le nom d'un outil/méthode
- Une citation d'un de ses posts
- Un événement/changement récent

✅ BONNES QUESTIONS (spécifiques):
- "J'ai vu que tu accompagnes les artisans via [Nom de sa boîte]. C'est quoi le plus gros frein que tu vois chez eux ?"
- "Tu recrutes des devs Python pour [Nom projet] - c'est pour scaler la tech ou un nouveau produit ?"
- "Ton post sur [sujet précis] m'a interpellé. Tu utilises quoi comme méthode pour [action mentionnée] ?"
- "Je vois que tu es passé de [ancien poste] à [nouveau poste]. C'est quoi qui a déclenché ce changement ?"

❌ QUESTIONS INTERDITES (génériques):
- "Comment tu gères ta prospection ?" (= applicable à tous)
- "C'est quoi ton plus gros défi ?" (= trop vague)
- "Ton profil m'a interpellé" (= pas une question)
- "J'aimerais en savoir plus sur ton activité" (= vide)
- Toute question commençant par "Ton parcours..." ou "Ton profil..."

=== OUTPUT REQUIS ===
- 2-4 signaux avec citations EXACTES
- 2-3 questions contenant chacune un élément NOMMÉ du profil`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    // Parser la réponse JSON
    const responseText = message.content[0].text;
    console.log(`[Analyze Paste] Claude raw response (first 500 chars):`, responseText.substring(0, 500));

    let analysis;

    try {
      // Nettoyer la réponse - plusieurs tentatives
      let cleanedResponse = responseText.trim();

      // Supprimer les blocs de code markdown
      cleanedResponse = cleanedResponse
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      // Trouver le JSON dans la réponse (entre { et })
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      analysis = JSON.parse(cleanedResponse);
      console.log(`[Analyze Paste] Parsed successfully - signals: ${analysis.signals?.length}, angles: ${analysis.angles?.length}`);
    } catch (parseError) {
      console.error('[Analyze Paste] JSON parse error:', parseError.message);
      console.error('[Analyze Paste] Raw response:', responseText);

      // Tentative d'extraction manuelle
      analysis = extractAnalysisManually(responseText, content);
    }

    // S'assurer qu'on a toujours des signaux (fallback intelligent)
    if (!analysis.signals || analysis.signals.length === 0) {
      analysis.signals = generateFallbackSignals(content, platform);
    }

    if (!analysis.angles || analysis.angles.length === 0) {
      analysis.angles = generateFallbackAngles(content, platform, analysis.profile);
    }

    // Nettoyer les valeurs null/undefined dans profile
    if (analysis.profile) {
      Object.keys(analysis.profile).forEach(key => {
        if (analysis.profile[key] === '' || analysis.profile[key] === 'null' || analysis.profile[key] === 'undefined') {
          analysis.profile[key] = null;
        }
      });
    }

    console.log(`[Analyze Paste] SUCCESS - Found ${analysis.signals?.length || 0} signals, ${analysis.angles?.length || 0} angles`);

    res.json(formatResponse({
      profile: analysis.profile || {},
      signals: analysis.signals || [],
      angles: analysis.angles || []
    }));

  } catch (error) {
    console.error('[Analyze Paste] Error:', error);

    // En cas d'erreur, retourner un fallback avec des signaux générés
    const { content, platform } = req.body;
    const profile = basicExtractProfile(content || '');

    res.json(formatResponse({
      profile: profile,
      signals: generateFallbackSignals(content || '', platform),
      angles: generateFallbackAngles(content || '', platform, profile),
      fallback: true
    }));
  }
});

/**
 * Extraction manuelle si le JSON est mal formé
 */
function extractAnalysisManually(responseText, originalContent) {
  const analysis = {
    profile: basicExtractProfile(originalContent),
    signals: [],
    angles: []
  };

  // Essayer d'extraire les signaux du texte
  const signalMatches = responseText.match(/"text"\s*:\s*"([^"]+)"/g);
  if (signalMatches) {
    signalMatches.forEach((match, i) => {
      const text = match.match(/"text"\s*:\s*"([^"]+)"/)?.[1];
      if (text && i < 5) {
        analysis.signals.push({
          type: i < 2 ? 'fort' : 'faible',
          text: text,
          source: 'analyse',
          reason: 'Identifié dans le contenu'
        });
      }
    });
  }

  // Essayer d'extraire les angles
  const hookMatches = responseText.match(/"hook"\s*:\s*"([^"]+)"/g);
  if (hookMatches) {
    hookMatches.forEach((match, i) => {
      const hook = match.match(/"hook"\s*:\s*"([^"]+)"/)?.[1];
      if (hook && i < 3) {
        analysis.angles.push({
          hook: hook,
          reason: 'Angle suggéré'
        });
      }
    });
  }

  return analysis;
}

/**
 * Génère des signaux de fallback basés sur le contenu
 * EXTRAIT le texte exact qui matche pour être ULTRA-SPÉCIFIQUE
 */
function generateFallbackSignals(content, platform) {
  const signals = [];

  // Helper pour extraire la phrase complète autour d'un match
  function extractSentence(text, pattern, maxLength = 100) {
    const match = text.match(pattern);
    if (!match) return null;

    const index = match.index;
    const matchText = match[0];

    // Trouver les limites de la phrase
    let start = index;
    let end = index + matchText.length;

    // Reculer jusqu'au début de la phrase
    while (start > 0 && start > index - 60 && !['.', '!', '?', '\n'].includes(text[start - 1])) {
      start--;
    }

    // Avancer jusqu'à la fin de la phrase
    while (end < text.length && end < index + matchText.length + 60 && !['.', '!', '?', '\n'].includes(text[end])) {
      end++;
    }

    let extracted = text.substring(start, end).trim();
    // Nettoyer le début si ça commence par un séparateur
    extracted = extracted.replace(/^[.!?\s]+/, '');
    if (extracted.length > maxLength) {
      extracted = extracted.substring(0, maxLength) + '...';
    }
    return extracted;
  }

  // Helper pour extraire un fait structuré
  function buildFact(match, category) {
    const facts = {
      'recherche': `Cherche activement: ${match}`,
      'problème': `Mentionne un défi: ${match}`,
      'lancement': `Nouveau projet/offre: ${match}`,
      'recrutement': `En recrutement: ${match}`,
      'changement': `Changement récent: ${match}`,
      'statut': `Statut: ${match}`,
      'expertise': `Expertise: ${match}`,
      'audience': `Audience: ${match}`,
    };
    return facts[category] || match;
  }

  // Signaux FORTS avec contexte complet
  const strongPatterns = [
    {
      pattern: /(je |on |nous )?(recherche|cherche|besoin de?|looking for)[^.!?\n]{5,60}/i,
      category: 'recherche',
      opportunity: 'Besoin exprimé = timing parfait pour proposer une solution'
    },
    {
      pattern: /(problème|difficulté|galère|du mal à|struggle|challenge|compliqué de)[^.!?\n]{5,60}/i,
      category: 'problème',
      opportunity: 'Point de douleur identifié = entrée naturelle pour aider'
    },
    {
      pattern: /(je lance|on lance|lancement de|nouveau projet|nouvelle offre|je démarre|viens de créer)[^.!?\n]{5,60}/i,
      category: 'lancement',
      opportunity: 'Phase de lancement = besoins multiples (visibilité, clients, feedback)'
    },
    {
      pattern: /(recrute|hiring|on recrute|we\'re hiring)[^.!?\n]{5,60}/i,
      category: 'recrutement',
      opportunity: 'Croissance active = budget et besoins en expansion'
    },
    {
      pattern: /(viens de rejoindre|nouveau poste|promu|je rejoins|nouvelle aventure)[^.!?\n]{5,50}/i,
      category: 'changement',
      opportunity: 'Transition = ouvert aux nouvelles connections et idées'
    },
  ];

  for (const sp of strongPatterns) {
    const quote = extractSentence(content, sp.pattern);
    if (quote && signals.length < 3) {
      signals.push({
        type: 'fort',
        category: sp.category,
        quote: quote,
        fact: buildFact(quote, sp.category),
        opportunity: sp.opportunity
      });
    }
  }

  // Signaux FAIBLES (contextuels)
  const weakPatterns = [
    {
      pattern: /(freelance|indépendant|entrepreneur|fondateur|founder|ceo|co-founder)[^.!?\n]{0,40}/i,
      category: 'statut',
      opportunity: 'Décideur = pas d\'intermédiaire, décision rapide'
    },
    {
      pattern: /(coach|formateur|consultant|expert|accompagne)[^.!?\n]{5,50}/i,
      category: 'expertise',
      opportunity: 'Expert = comprend la valeur de l\'accompagnement pro'
    },
    {
      pattern: /(\d+[kK]?|\d{1,3}[\s,]\d{3})\s*(abonnés|followers|contacts|relations)/i,
      category: 'audience',
      opportunity: 'Créateur avec audience = influence et besoin de monétisation'
    },
  ];

  for (const wp of weakPatterns) {
    const quote = extractSentence(content, wp.pattern, 80);
    if (quote && signals.length < 5) {
      signals.push({
        type: 'faible',
        category: wp.category,
        quote: quote,
        fact: buildFact(quote, wp.category),
        opportunity: wp.opportunity
      });
    }
  }

  // Fallback: extraire le headline si rien d'autre
  if (signals.length === 0) {
    const lines = content.split('\n').filter(l => l.trim() && l.length > 5);
    if (lines.length >= 2) {
      const headline = lines[1].trim();
      if (headline.length > 10 && headline.length < 150 && !headline.includes('http')) {
        signals.push({
          type: 'faible',
          category: 'profil',
          quote: headline.substring(0, 80),
          fact: `Poste actuel: ${headline.substring(0, 80)}`,
          opportunity: 'Base pour personnaliser l\'approche'
        });
      }
    }
  }

  return signals;
}

/**
 * Génère des angles d'approche de fallback ULTRA-SPÉCIFIQUES
 * Chaque question DOIT contenir un élément concret du profil
 */
function generateFallbackAngles(content, platform, profile) {
  const angles = [];
  const firstName = profile?.fullName?.split(' ')[0] || '';

  // Helper pour extraire des éléments nommés du contenu
  function extractNamedElements(text) {
    const elements = {
      companies: [],
      roles: [],
      locations: [],
      projects: [],
      tools: [],
      numbers: []
    };

    // Entreprises (mots avec majuscule après "chez", "at", "@")
    const companyMatches = text.match(/(?:chez|at|@|pour)\s+([A-Z][A-Za-zÀ-ÿ0-9\s&]+?)(?:\s*[|•\-,.]|\s+depuis|\s+en\s+tant)/gi);
    if (companyMatches) {
      companyMatches.forEach(m => {
        const company = m.replace(/^(chez|at|@|pour)\s+/i, '').replace(/\s*[|•\-,.].*$/, '').trim();
        if (company.length > 2 && company.length < 40) elements.companies.push(company);
      });
    }

    // Lieux
    const locationMatches = text.match(/(?:à|basé à|région de|📍)\s*([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+)?)/g);
    if (locationMatches) {
      locationMatches.forEach(m => {
        const loc = m.replace(/^(à|basé à|région de|📍)\s*/i, '').trim();
        if (loc.length > 2) elements.locations.push(loc);
      });
    }

    // Chiffres significatifs
    const numberMatches = text.match(/(\d+[kKmM]?)\s*(ans?|années?|clients?|entreprises?|personnes?|€|euros?|projets?)/gi);
    if (numberMatches) elements.numbers = numberMatches.slice(0, 3);

    return elements;
  }

  const elements = extractNamedElements(content);

  // 1. Angle basé sur l'entreprise NOMMÉE
  if (profile?.company || elements.companies.length > 0) {
    const company = profile?.company || elements.companies[0];
    angles.push({
      question: `${firstName ? firstName + ', j' : 'J'}'ai vu que tu es chez ${company}. Vous êtes sur quel type de projet en ce moment ?`,
      specificElement: company,
      basedOn: 'company'
    });
  }

  // 2. Angle basé sur le ROLE EXACT du headline
  if (profile?.headline) {
    const headline = profile.headline;
    // Extraire le rôle principal (avant le premier séparateur)
    const roleMatch = headline.match(/^([^|•\-@]{5,50})/);
    if (roleMatch) {
      const role = roleMatch[1].trim();
      // Éviter les rôles trop génériques
      if (!['professionnel', 'expert', 'spécialiste'].some(g => role.toLowerCase().includes(g))) {
        angles.push({
          question: `${firstName ? firstName + ', e' : 'E'}n tant que ${role.toLowerCase()}, c'est quoi le sujet qui t'occupe le plus en ce moment ?`,
          specificElement: role,
          basedOn: 'headline'
        });
      }
    }
  }

  // 3. Angle basé sur une CITATION de post/contenu
  const actionMatch = content.match(/(j'ai lancé|on vient de|je viens de|nous avons créé|on a développé|je travaille sur)[^.!?\n]{10,60}/i);
  if (actionMatch) {
    const action = actionMatch[0].trim();
    angles.push({
      question: `J'ai vu que ${action.toLowerCase()}. Ça avance comment ?`,
      specificElement: action,
      basedOn: 'post'
    });
  }

  // 4. Angle basé sur un LIEU spécifique
  if (elements.locations.length > 0 && profile?.headline) {
    const location = elements.locations[0];
    const role = profile.headline.split(/[|•\-]/)[0].trim();
    angles.push({
      question: `${firstName ? firstName + ', t' : 'T'}u es ${role.toLowerCase()} sur ${location} ? C'est comment le marché là-bas en ce moment ?`,
      specificElement: `${role} + ${location}`,
      basedOn: 'headline+location'
    });
  }

  // 5. Angle basé sur les CHIFFRES mentionnés
  if (elements.numbers.length > 0) {
    const number = elements.numbers[0];
    angles.push({
      question: `${firstName ? firstName + ', ' : ''}${number} c'est impressionnant ! C'est quoi qui a le plus contribué à ce résultat ?`,
      specificElement: number,
      basedOn: 'metrics'
    });
  }

  // 6. Angles métier SPÉCIFIQUES avec éléments du profil
  const specificMetierAngles = [
    {
      pattern: /accompagn[ea].*?(entrepreneur|dirigeant|indépendant|artisan|tpe|pme)/i,
      buildQuestion: (match) => `Tu accompagnes les ${match[1].toLowerCase()}s. C'est quoi leur blocage n°1 quand ils arrivent ?`,
      extract: (match) => match[1]
    },
    {
      pattern: /form[ea].*?(vente|management|leadership|communication|marketing|dev|code)/i,
      buildQuestion: (match) => `Tu formes sur ${match[1].toLowerCase()} - c'est du présentiel, distanciel ou les deux ?`,
      extract: (match) => `formation ${match[1]}`
    },
    {
      pattern: /recrute.*?(\d+|plusieurs|des)\s*(dev|commercial|ingénieur|consultant|profil)/i,
      buildQuestion: (match) => `Vous recrutez ${match[1]} ${match[2]}s - c'est pour de la croissance ou un nouveau projet ?`,
      extract: (match) => `${match[1]} ${match[2]}s`
    },
    {
      pattern: /(croissance|scale|levée|fundraising|série [ab])/i,
      buildQuestion: (match) => `Vous êtes en phase de ${match[1].toLowerCase()} - c'est quoi le plus gros chantier du moment ?`,
      extract: (match) => match[1]
    },
  ];

  for (const ma of specificMetierAngles) {
    const match = content.match(ma.pattern);
    if (match && angles.length < 4) {
      angles.push({
        question: ma.buildQuestion(match),
        specificElement: ma.extract(match),
        basedOn: 'content_analysis'
      });
    }
  }

  // Filtrer: ne garder que les questions avec de vrais éléments spécifiques
  const validAngles = angles.filter(a =>
    a.specificElement &&
    a.specificElement.length > 2 &&
    !a.question.includes('[') &&
    !a.question.includes('undefined')
  );

  // Si on n'a rien de spécifique, mieux vaut être honnête
  if (validAngles.length === 0 && firstName) {
    validAngles.push({
      question: `${firstName}, je serais curieux de savoir sur quoi tu travailles en ce moment ?`,
      specificElement: firstName,
      basedOn: 'name_only'
    });
  }

  return validAngles.slice(0, 3);
}

/**
 * Extraction basique de profil (fallback si API IA indisponible)
 */
function basicExtractProfile(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const profile = {
    fullName: null,
    headline: null,
    company: null,
    bio: null,
    location: null,
    followers: null,
    experience: null
  };

  // Première ligne souvent le nom
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length < 60 && !firstLine.includes('http') && !firstLine.includes('@')) {
      profile.fullName = firstLine;
    }
  }

  // Patterns courants
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    // Headline/titre
    if (!profile.headline && (lower.includes(' chez ') || lower.includes(' at ') || lower.includes(' | ') || lower.includes(' - '))) {
      if (line.length < 150) {
        profile.headline = line;
        // Extraire company
        const companyMatch = line.match(/(?:chez|at|@)\s+([^|·•\-]+)/i);
        if (companyMatch) profile.company = companyMatch[1].trim();
      }
    }

    // Followers
    const followersMatch = line.match(/([\d,.\s]+[kmKM]?)\s*(?:followers?|abonnés?|contacts?)/i);
    if (followersMatch && !profile.followers) {
      profile.followers = followersMatch[1].trim();
    }

    // Location
    const locationMatch = line.match(/(?:📍|Région de|Localisation|Location)[:\s]*(.+)/i);
    if (locationMatch && !profile.location) {
      profile.location = locationMatch[1].trim().substring(0, 100);
    }

    // Bio/About
    if ((lower.includes('à propos') || lower === 'about' || lower === 'bio') && !profile.bio) {
      profile.bio = lines.slice(i + 1, i + 5).join(' ').substring(0, 300);
    }
  }

  return profile;
}

export default router;
