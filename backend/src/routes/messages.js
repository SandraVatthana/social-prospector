import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import messageGenerator from '../services/messageGenerator.js';

const router = Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * GET /api/messages
 * Liste tous les messages de l'utilisateur
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, prospect_id, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from('messages')
      .select(`
        *,
        prospect:prospects(id, username, platform, full_name, avatar_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (prospect_id) {
      query = query.eq('prospect_id', prospect_id);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json(formatResponse({
      messages: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    }));

  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des messages', 'FETCH_ERROR'));
  }
});

/**
 * GET /api/messages/approach-methods
 * Liste les méthodes d'approche disponibles
 */
router.get('/approach-methods', requireAuth, (req, res) => {
  res.json(formatResponse(messageGenerator.getAvailableMethods()));
});

/**
 * GET /api/messages/approach-recommendation
 * Obtient la méthode recommandée basée sur les stats de l'utilisateur
 */
router.get('/approach-recommendation', requireAuth, async (req, res) => {
  try {
    // Récupérer les stats par méthode pour les 3 derniers mois
    const { data: stats } = await supabaseAdmin
      .from('approach_analytics')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('month', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));

    // Agréger par méthode
    const aggregated = {};
    if (stats) {
      stats.forEach(s => {
        if (!aggregated[s.approach_method]) {
          aggregated[s.approach_method] = {
            messages_sent: 0,
            responses: 0,
            conversions: 0,
          };
        }
        aggregated[s.approach_method].messages_sent += s.messages_sent || 0;
        aggregated[s.approach_method].responses += s.responses || 0;
        aggregated[s.approach_method].conversions += s.conversions || 0;
      });

      // Calculer les taux
      Object.keys(aggregated).forEach(method => {
        const m = aggregated[method];
        m.response_rate = m.messages_sent > 0 ? (m.responses / m.messages_sent) * 100 : 0;
      });
    }

    const recommendation = messageGenerator.getRecommendedMethod(aggregated);

    res.json(formatResponse({
      recommendation,
      stats: aggregated,
    }));
  } catch (error) {
    console.error('Error getting recommendation:', error);
    res.json(formatResponse({
      recommendation: messageGenerator.getRecommendedMethod(null),
      stats: {},
    }));
  }
});

/**
 * POST /api/messages/generate
 * Génère un message personnalisé avec Claude et méthode d'approche
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prospect_id, prospect, posts, voice_profile, approach_method = 'mini_aida' } = req.body;

    // Si prospect_id fourni, récupérer le prospect depuis la DB
    let prospectData = prospect;
    if (prospect_id && !prospect) {
      const { data: dbProspect } = await supabaseAdmin
        .from('prospects')
        .select('*')
        .eq('id', prospect_id)
        .eq('user_id', req.user.id)
        .single();

      if (!dbProspect) {
        return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
      }
      prospectData = dbProspect;
    }

    if (!prospectData) {
      return res.status(400).json(formatError('Données du prospect requises', 'VALIDATION_ERROR'));
    }

    // Récupérer le profil voix de l'utilisateur si non fourni
    let voiceData = voice_profile;
    if (!voiceData) {
      const { data: savedVoice } = await supabaseAdmin
        .from('voice_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single();
      voiceData = savedVoice;
    }

    // Utiliser le nouveau service de génération avec méthodes d'approche
    const result = await messageGenerator.generateMessage(prospectData, voiceData, approach_method);

    res.json(formatResponse({
      message: result.message,
      approach_method: result.approach_method,
      hook_type: result.hook_type,
      variables_used: result.variables_used,
      model: 'claude-3-haiku',
    }));

  } catch (error) {
    console.error('Error generating message:', error);
    res.status(500).json(formatError('Erreur lors de la génération du message', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/messages/generate-vocal
 * Génère un script vocal personnalisé adapté au profil "MA VOIX"
 */
router.post('/generate-vocal', requireAuth, async (req, res) => {
  try {
    const { prospect, posts, voice_profile } = req.body;

    if (!prospect) {
      return res.status(400).json(formatError('Données du prospect requises', 'VALIDATION_ERROR'));
    }

    // Récupérer le profil voix de l'utilisateur si non fourni
    let voiceData = voice_profile;
    if (!voiceData) {
      const { data: savedVoice } = await supabaseAdmin
        .from('voice_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single();
      voiceData = savedVoice?.profil_json || savedVoice;
    }

    // Construire le prompt vocal
    const systemPrompt = buildVocalSystemPrompt(voiceData);
    const userPrompt = buildVocalUserPrompt(prospect, posts, voiceData);

    // Appeler Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const generatedMessage = message.content[0].text;

    res.json(formatResponse({
      message: generatedMessage,
      type: 'vocal',
      word_count: generatedMessage.split(/\s+/).length,
      estimated_duration: Math.round(generatedMessage.split(/\s+/).length / 3) + ' secondes',
      model: 'claude-3-haiku',
    }));

  } catch (error) {
    console.error('Error generating vocal message:', error);
    res.status(500).json(formatError('Erreur lors de la génération vocale', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/messages/generate-legacy
 * Génère un message (ancienne méthode, pour compatibilité)
 */
router.post('/generate-legacy', requireAuth, async (req, res) => {
  try {
    const { prospect, posts, voice_profile } = req.body;

    if (!prospect) {
      return res.status(400).json(formatError('Données du prospect requises', 'VALIDATION_ERROR'));
    }

    // Récupérer le profil voix de l'utilisateur si non fourni
    let voiceData = voice_profile;
    if (!voiceData) {
      const { data: savedVoice } = await supabaseAdmin
        .from('voice_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single();
      voiceData = savedVoice;
    }

    // Construire le prompt
    const systemPrompt = buildSystemPrompt(voiceData);
    const userPrompt = buildUserPrompt(prospect, posts);

    // Appeler Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const generatedMessage = message.content[0].text;

    // Analyser le message pour extraire le hook
    const analysis = analyzeGeneratedMessage(generatedMessage, prospect);

    res.json(formatResponse({
      message: generatedMessage,
      analysis,
      model: 'claude-3-haiku',
      tokens_used: message.usage.input_tokens + message.usage.output_tokens,
    }));

  } catch (error) {
    console.error('Error generating message:', error);
    res.status(500).json(formatError('Erreur lors de la génération du message', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/messages
 * Sauvegarde un message
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { prospect_id, content, status = 'draft', generated_by = 'ai', approach_method, hook_type } = req.body;

    if (!content) {
      return res.status(400).json(formatError('Contenu du message requis', 'VALIDATION_ERROR'));
    }

    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        user_id: req.user.id,
        prospect_id,
        content,
        status,
        generated_by,
        approach_method,
        hook_type,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(formatResponse(data, 'Message sauvegardé'));

  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json(formatError('Erreur lors de la sauvegarde', 'SAVE_ERROR'));
  }
});

/**
 * PATCH /api/messages/:id
 * Met à jour un message
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, status } = req.body;

    const updates = {};
    if (content !== undefined) updates.content = content;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json(formatError('Message non trouvé', 'NOT_FOUND'));
    }

    res.json(formatResponse(data, 'Message mis à jour'));

  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
  }
});

/**
 * DELETE /api/messages/:id
 * Supprime un message
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json(formatResponse({ deleted: true }));

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json(formatError('Erreur lors de la suppression', 'DELETE_ERROR'));
  }
});

/**
 * POST /api/messages/:id/mark-sent
 * Marque un message comme envoyé
 */
router.post('/:id/mark-sent', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    // Mettre à jour le statut du prospect si lié
    if (data.prospect_id) {
      await supabaseAdmin
        .from('prospects')
        .update({ status: 'contacted', last_contacted_at: new Date().toISOString() })
        .eq('id', data.prospect_id);
    }

    // Incrémenter le compteur de DMs du jour
    await incrementDailyDMCount(req.user.id);

    res.json(formatResponse(data, 'Message marqué comme envoyé'));

  } catch (error) {
    console.error('Error marking message as sent:', error);
    res.status(500).json(formatError('Erreur', 'UPDATE_ERROR'));
  }
});

// ============ Helper Functions ============

function buildSystemPrompt(voiceProfile) {
  const basePrompt = `Tu es un expert en copywriting pour DMs Instagram/TikTok. Tu dois générer des messages de prospection personnalisés, authentiques et engageants.

Règles importantes:
- Maximum 300 caractères
- Ton décontracté mais professionnel
- Commence par un hook personnalisé basé sur leur contenu récent
- Pose une question ouverte à la fin
- Évite le spam et les phrases génériques
- Sois spécifique et montre que tu as vraiment regardé leur profil`;

  if (voiceProfile) {
    return `${basePrompt}

STYLE DE L'UTILISATEUR (MA VOIX):
- Ton: ${voiceProfile.tone || 'amical'}
- Style: ${voiceProfile.style || 'décontracté'}
- Signature: ${voiceProfile.signature || ''}
- Exemples de messages qu'il aime: ${voiceProfile.examples || ''}
- Mots à utiliser: ${voiceProfile.keywords?.join(', ') || ''}
- Mots à éviter: ${voiceProfile.avoid_words?.join(', ') || ''}`;
  }

  return basePrompt;
}

function buildUserPrompt(prospect, posts) {
  let prompt = `Génère un DM personnalisé pour ce prospect:

PROFIL:
- Username: @${prospect.username}
- Plateforme: ${prospect.platform}
- Bio: ${prospect.bio || 'Non disponible'}
- Followers: ${prospect.followers || 'Inconnu'}`;

  if (posts && posts.length > 0) {
    prompt += `\n\nPOSTS RÉCENTS ANALYSÉS:`;
    posts.slice(0, 3).forEach((post, idx) => {
      prompt += `\n${idx + 1}. "${post.caption?.slice(0, 100) || 'Sans caption'}..." (${post.likes || 0} likes)`;
    });
    prompt += `\n\nUtilise le contenu de leurs posts pour personnaliser le message et montrer que tu as vraiment regardé leur profil.`;
  }

  prompt += `\n\nGénère UNIQUEMENT le message, sans explication ni guillemets.`;

  return prompt;
}

function analyzeGeneratedMessage(message, prospect) {
  // Extraire le hook (première phrase)
  const firstSentence = message.split(/[.!?]/)[0];

  return {
    hook: firstSentence,
    length: message.length,
    hasQuestion: message.includes('?'),
    mentionsContent: message.toLowerCase().includes('post') ||
                     message.toLowerCase().includes('contenu') ||
                     message.toLowerCase().includes('vu'),
    prospectTone: detectTone(prospect.bio),
  };
}

function detectTone(bio) {
  if (!bio) return 'neutre';
  const bioLower = bio.toLowerCase();
  if (bioLower.includes('coach') || bioLower.includes('mentor')) return 'inspirant';
  if (bioLower.includes('fun') || bioLower.includes('😂')) return 'décontracté';
  if (bioLower.includes('ceo') || bioLower.includes('founder')) return 'professionnel';
  return 'authentique';
}

/**
 * Construit le prompt système pour la génération vocale
 */
function buildVocalSystemPrompt(voiceProfile) {
  // Déterminer le style de voix
  let styleInstructions = '';
  const tone = voiceProfile?.tone?.toLowerCase() || 'decontracte';

  if (tone === 'decontracte' || tone === 'friendly') {
    styleInstructions = `
STYLE "Décontracté/Friendly" :
- Transitions : "du coup", "en fait", "genre", "tu vois"
- Ton : enthousiaste, comme un(e) ami(e)
- Expressions : "j'ai trop kiffé", "c'est canon", "ça m'a parlé"
- Tutoiement naturel`;
  } else if (tone === 'professionnel' || tone === 'pro' || tone === 'expert') {
    styleInstructions = `
STYLE "Pro/Expert" :
- Transitions : "d'ailleurs", "justement", "ce qui m'a interpellé"
- Ton : posé, confiant, crédible
- Expressions : "j'ai trouvé ça pertinent", "ça résonne avec", "je serais curieux de"
- Peut vouvoyer ou tutoyer selon la cible`;
  } else if (tone === 'chaleureux' || tone === 'empathique') {
    styleInstructions = `
STYLE "Chaleureux/Empathique" :
- Transitions : "j'ai ressenti que", "ça m'a touché de voir"
- Ton : bienveillant, à l'écoute
- Expressions : "j'imagine que", "ça doit pas être simple", "bravo pour"
- Tutoiement doux`;
  } else if (tone === 'direct' || tone === 'efficace') {
    styleInstructions = `
STYLE "Direct/Efficace" :
- Transitions : "concrètement", "l'idée c'est"
- Ton : clair, sans détour, respectueux du temps
- Expressions : "je vais droit au but", "voilà ce que je propose"
- Peu de fioritures mais reste humain`;
  }

  return `Tu es un expert en création de scripts vocaux pour messages vocaux Instagram/TikTok.
Tu dois générer un script qui sera DICTÉ, pas lu. Il doit sonner naturel à l'oral.

${styleInstructions}

RÈGLES UNIVERSELLES :
- Écris comme si tu PARLAIS, pas comme si tu écrivais
- 120-180 mots maximum (~30 secondes à l'oral)
- 5-8 phrases
- Mentionne 2-3 détails spécifiques du profil prospect
- Termine par une question ouverte
- ÉVITE : "je me permets", "n'hésitez pas", "cordialement", "j'espère que tu vas bien"
- Le ton doit rester NATUREL à l'oral (pas récité)
- Ajoute des pauses naturelles avec "...", des hésitations légères

Structure à suivre :
📍 Accroche (adaptée au style)
🔗 Connexion (détails profil + ressenti adapté au ton)
💎 Valeur (proposition claire)
👉 CTA (question ouverte adaptée au style)`;
}

/**
 * Construit le prompt utilisateur pour la génération vocale
 */
function buildVocalUserPrompt(prospect, posts, voiceProfile) {
  let prompt = `Génère un script vocal de prospection Instagram pour ce prospect :

PROFIL DU PROSPECT :
- Username : @${prospect.username}
- Plateforme : ${prospect.platform || 'Instagram'}
- Bio : ${prospect.bio || 'Non disponible'}
- Followers : ${prospect.followers || 'Inconnu'}`;

  if (posts && posts.length > 0) {
    prompt += `\n\nPOSTS RÉCENTS :`;
    posts.slice(0, 3).forEach((post, idx) => {
      prompt += `\n${idx + 1}. "${post.caption?.slice(0, 150) || 'Sans caption'}..." (${post.likes || 0} likes)`;
    });
  }

  if (voiceProfile?.business_context) {
    prompt += `\n\nCONTEXTE DE L'UTILISATEUR (MOI) :
- Mon activité : ${voiceProfile.business_context.activity || 'Non spécifié'}
- Ma cible : ${voiceProfile.business_context.target || 'Non spécifié'}
- Mon offre/cadeau : ${voiceProfile.business_context.gift || 'Non spécifié'}`;
  }

  prompt += `\n\nGénère UNIQUEMENT le script vocal, prêt à être dicté. Pas d'explications, pas de guillemets.`;

  return prompt;
}

async function incrementDailyDMCount(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Upsert le compteur journalier
  await supabaseAdmin
    .from('analytics_daily')
    .upsert({
      user_id: userId,
      date: today,
      dms_sent: 1,
    }, {
      onConflict: 'user_id,date',
      count: 'exact',
    });
}

export default router;
