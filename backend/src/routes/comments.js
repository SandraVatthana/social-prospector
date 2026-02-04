import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Check if API key is configured
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn('[Comments] WARNING: ANTHROPIC_API_KEY is not set! AI comments will use fallback.');
} else {
  console.log('[Comments] Anthropic API key configured (starts with:', apiKey.substring(0, 10) + '...)');
}

// Client Anthropic
const anthropic = new Anthropic({
  apiKey: apiKey || 'missing-key',
});

/**
 * POST /api/comments/generate
 * Generate a strategic comment for a LinkedIn post
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { platform, post, commentType = 'deepen', campaignId } = req.body;
    const userId = req.user.id;

    if (!post || !post.content) {
      return res.status(400).json(formatError('Contenu du post requis', 'MISSING_CONTENT'));
    }

    console.log('[Comments] Generating strategic comment for:', post.authorName, 'type:', commentType);

    // Get voice profile - check campaign first (agency mode), then user default
    let voiceProfile = null;
    try {
      // First, check if there's a campaign-specific voice profile
      if (campaignId) {
        const { data: campaignVoice } = await supabaseAdmin
          .from('campaign_voice_profiles')
          .select('*')
          .eq('campaign_id', campaignId)
          .single();

        if (campaignVoice) {
          voiceProfile = campaignVoice;
          console.log('[Comments] Using campaign voice profile');
        }
      }

      // Fallback to user's default voice profile
      if (!voiceProfile) {
        const { data: voiceData } = await supabaseAdmin
          .from('voice_profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        voiceProfile = voiceData;
      }
    } catch (e) {
      console.log('[Comments] No voice profile found');
    }

    // Check if author matches ICP
    let icpMatch = false;
    try {
      const { data: campaigns } = await supabaseAdmin
        .from('campaigns')
        .select('target_description')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (campaigns && campaigns.length > 0) {
        const icpKeywords = campaigns
          .map(c => c.target_description || '')
          .join(' ')
          .toLowerCase();

        const authorInfo = `${post.authorName || ''} ${post.authorHeadline || ''}`.toLowerCase();

        // Simple ICP matching
        const keywords = ['coach', 'consultant', 'entrepreneur', 'founder', 'ceo', 'freelance', 'formateur', 'expert'];
        icpMatch = keywords.some(k => icpKeywords.includes(k) && authorInfo.includes(k));
      }
    } catch (e) {
      console.log('[Comments] ICP check failed:', e.message);
    }

    // Generate comment with AI
    const result = await generateStrategicCommentWithAI({
      post,
      voiceProfile,
      icpMatch,
      commentType
    });

    res.json(formatResponse({
      comment: result.comment,
      angle: result.angle,
      strategy: result.strategy,
      icpMatch
    }));

  } catch (error) {
    console.error('[Comments] Error:', error);
    res.status(500).json(formatError('Erreur lors de la génération du commentaire', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/comments/track
 * Track a comment interaction for follow-up
 */
router.post('/track', requireAuth, async (req, res) => {
  try {
    const { platform, post, comment, icpMatch, commentedAt } = req.body;
    const userId = req.user.id;

    // Store the comment interaction
    const { data, error } = await supabaseAdmin
      .from('comment_interactions')
      .insert({
        user_id: userId,
        platform,
        author_name: post?.authorName || '',
        author_headline: post?.authorHeadline || '',
        post_url: post?.url || '',
        post_content: (post?.content || '').substring(0, 500),
        comment_text: comment,
        icp_match: icpMatch || false,
        commented_at: commentedAt || new Date().toISOString(),
        follow_up_status: 'pending'
      });

    if (error) {
      console.error('[Comments] Track error:', error);
      // Don't fail - just log
    }

    res.json(formatResponse({ success: true }));

  } catch (error) {
    console.error('[Comments] Track error:', error);
    res.status(500).json(formatError('Erreur lors du tracking', 'TRACK_ERROR'));
  }
});

/**
 * GET /api/comments/pending
 * Get comments pending follow-up
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 3 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const { data, error } = await supabaseAdmin
      .from('comment_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('follow_up_status', 'pending')
      .lt('commented_at', cutoffDate.toISOString())
      .order('commented_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    res.json(formatResponse({ interactions: data || [] }));

  } catch (error) {
    console.error('[Comments] Pending fetch error:', error);
    res.status(500).json(formatError('Erreur lors de la récupération', 'FETCH_ERROR'));
  }
});

/**
 * Generate strategic comment using AI
 */
async function generateStrategicCommentWithAI({ post, voiceProfile, icpMatch, commentType = 'deepen' }) {
  // Define comment type instructions
  const commentTypeInstructions = {
    deepen: `TYPE: APPROFONDIR
Tu dois APPROFONDIR le sujet du post en:
- Ajoutant une couche d'analyse ou de réflexion
- Posant une question qui fait avancer le débat
- Apportant un angle complémentaire non mentionné`,

    challenge: `TYPE: CHALLENGER (avec respect)
Tu dois CHALLENGER le point de vue en:
- Proposant un contre-argument constructif
- Nuançant avec une perspective différente
- Posant une question qui pousse à réfléchir
IMPORTANT: Reste respectueux, pas agressif. "Et si on considérait aussi..." plutôt que "Tu as tort"`,

    testimonial: `TYPE: TÉMOIGNER
Tu dois PARTAGER une expérience personnelle en:
- Racontant brièvement un vécu en lien avec le sujet
- Montrant comment ça résonne avec ton parcours
- Ajoutant de l'authenticité avec du concret`,

    resource: `TYPE: AJOUTER UNE RESSOURCE
Tu dois ENRICHIR avec une ressource en:
- Mentionnant un livre, article, outil, ou concept pertinent
- Expliquant brièvement pourquoi c'est utile
- Créant de la valeur pour tous les lecteurs
NE PAS inventer de liens - juste mentionner le nom de la ressource`
  };

  const typeInstruction = commentTypeInstructions[commentType] || commentTypeInstructions.deepen;

  const systemPrompt = `Tu es un expert en engagement LinkedIn et en personal branding.
Tu aides à rédiger des commentaires stratégiques qui :
1. Apportent de la VALEUR (pas du "Super post ! 👏")
2. Positionnent l'auteur du commentaire comme un EXPERT
3. Créent une CONNEXION avec l'auteur du post
4. Donnent envie de cliquer sur le profil

${typeInstruction}

RÈGLES STRICTES :
- Maximum 3-4 phrases
- Jamais de "Super post" / "Merci pour ce partage" seul
- Toujours apporter une perspective, une expérience ou une question
- Ton naturel, pas corporate
- Pas d'émojis excessifs (max 1)
- Pas de hashtags dans le commentaire

STRUCTURE EFFICACE :
1. Hook/Accroche (optionnel) - rebondir sur un point précis
2. Valeur ajoutée - selon le type demandé
3. Ouverture - question ou invitation à l'échange (optionnel)`;

  const userPrompt = `Génère un commentaire stratégique pour ce post LinkedIn.

AUTEUR DU POST :
- Nom : ${post.authorName || 'Inconnu'}
- Titre : ${post.authorHeadline || 'Non spécifié'}
${icpMatch ? '- ⚡ Match ICP : Cet auteur correspond à ma cible !' : ''}

CONTENU DU POST :
${post.content || 'Contenu non disponible'}

${voiceProfile ? `
MON PROFIL (pour personnaliser) :
- Secteur : ${voiceProfile.industry || 'Non spécifié'}
- Expertise : ${voiceProfile.expertise || 'Non spécifiée'}
- Ton : ${voiceProfile.tone || 'Professionnel mais accessible'}
` : ''}

Réponds en JSON avec ce format exact :
{
  "comment": "Le commentaire à poster (3-4 phrases max)",
  "angle": "L'angle utilisé (ex: 'partage d'expérience', 'question expert', 'complément de perspective')",
  "strategy": "Pourquoi ce commentaire va marquer les esprits (1 phrase)"
}`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const responseText = message.content[0].text;

    // Parse JSON response
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(cleanedResponse);

    return {
      comment: result.comment || '',
      angle: result.angle || 'apport de valeur',
      strategy: result.strategy || ''
    };

  } catch (error) {
    console.error('[Comments] AI generation failed:', error.message || error);
    console.error('[Comments] Error details:', JSON.stringify({
      name: error.name,
      status: error.status,
      message: error.message,
      apiKeySet: !!process.env.ANTHROPIC_API_KEY
    }));

    // Fallback response
    const firstName = (post.authorName || '').split(' ')[0];
    return {
      comment: firstName
        ? `Point de vue intéressant ${firstName} ! [Ajoute ta perspective personnelle ici]`
        : 'Réflexion pertinente ! [Ajoute ta perspective ou une question qui fait avancer le débat]',
      angle: 'apport de valeur',
      strategy: 'Personnalise ce commentaire avec ton expertise unique'
    };
  }
}

export default router;
