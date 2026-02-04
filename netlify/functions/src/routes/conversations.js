/**
 * Routes pour les séquences de conversation
 * Gère les objectifs, historique et suggestions de réponse
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import conversationSequence from '../services/conversationSequence.js';

const router = Router();

/**
 * GET /api/conversations/goals
 * Liste les objectifs de conversation disponibles
 */
router.get('/goals', requireAuth, (req, res) => {
  const goals = conversationSequence.getConversationGoals();
  res.json(formatResponse(goals));
});

/**
 * GET /api/conversations/stages/:goal
 * Récupère les étapes pour un objectif donné
 */
router.get('/stages/:goal', requireAuth, (req, res) => {
  const { goal } = req.params;
  const goalInfo = conversationSequence.getGoalInfo(goal);

  if (!goalInfo) {
    return res.status(404).json(formatError('Objectif non trouvé', 'NOT_FOUND'));
  }

  const stages = [];
  for (let i = 1; i <= goalInfo.stages; i++) {
    stages.push({
      stage: i,
      ...conversationSequence.getStageLabel(goal, i),
    });
  }

  res.json(formatResponse({
    goal: goalInfo,
    stages,
  }));
});

/**
 * POST /api/conversations/start
 * Démarre une nouvelle conversation avec un prospect
 */
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { prospect_id, goal, approach_method = 'mini_aida' } = req.body;

    if (!prospect_id || !goal) {
      return res.status(400).json(formatError(
        'prospect_id et goal sont requis',
        'VALIDATION_ERROR'
      ));
    }

    // Vérifier que le goal est valide
    const goalInfo = conversationSequence.getGoalInfo(goal);
    if (!goalInfo) {
      return res.status(400).json(formatError('Objectif invalide', 'VALIDATION_ERROR'));
    }

    // Récupérer le prospect
    const { data: prospect, error: prospectError } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospect_id)
      .eq('user_id', req.user.id)
      .single();

    if (prospectError || !prospect) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    // Récupérer le profil voix de l'utilisateur
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    // Générer le message d'ouverture
    const result = await conversationSequence.generateOpeningMessage({
      prospect,
      goal,
      voiceProfile,
      approachMethod: approach_method,
    });

    // Mettre à jour le prospect avec l'objectif
    await conversationSequence.updateProspectConversation(prospect_id, {
      conversation_goal: goal,
      conversation_stage: 1,
      conversation_status: 'in_progress',
    });

    res.json(formatResponse({
      message: result.message,
      goal: goalInfo,
      stage: result.stageInfo,
      approach_method: result.approach_method,
      prospect_id,
    }));

  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json(formatError('Erreur lors du démarrage de la conversation', 'START_ERROR'));
  }
});

/**
 * POST /api/conversations/:prospectId/send
 * Marque un message comme envoyé et l'ajoute à l'historique
 */
router.post('/:prospectId/send', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { content, stage, approach_method } = req.body;

    if (!content) {
      return res.status(400).json(formatError('Contenu requis', 'VALIDATION_ERROR'));
    }

    // Vérifier que le prospect appartient à l'utilisateur
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    if (!prospect) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    // Sauvegarder dans l'historique
    const historyEntry = await conversationSequence.saveToHistory({
      prospectId,
      userId: req.user.id,
      direction: 'outbound',
      content,
      stage: stage || prospect.conversation_stage,
      approachMethod: approach_method,
    });

    // Mettre à jour le statut du prospect
    await conversationSequence.updateProspectConversation(prospectId, {
      status: 'contacted',
      conversation_status: 'waiting_response',
      last_contacted_at: new Date().toISOString(),
    });

    res.json(formatResponse({
      history_entry: historyEntry,
      message: 'Message enregistré comme envoyé',
    }));

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json(formatError('Erreur', 'SEND_ERROR'));
  }
});

/**
 * POST /api/conversations/:prospectId/response
 * Enregistre une réponse du prospect et génère des suggestions
 */
router.post('/:prospectId/response', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json(formatError('Réponse requise', 'VALIDATION_ERROR'));
    }

    // Vérifier que le prospect appartient à l'utilisateur
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    if (!prospect) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    // Sauvegarder la réponse dans l'historique
    await conversationSequence.saveToHistory({
      prospectId,
      userId: req.user.id,
      direction: 'inbound',
      content: response,
      stage: prospect.conversation_stage,
      analysis: conversationSequence.analyzeProspectResponse(response),
    });

    // Mettre à jour le prospect
    await conversationSequence.updateProspectConversation(prospectId, {
      last_prospect_response: response,
      last_prospect_response_at: new Date().toISOString(),
      conversation_status: 'in_progress',
    });

    // Récupérer l'historique complet
    const history = await conversationSequence.getConversationHistory(prospectId, req.user.id);

    // Récupérer le profil voix
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    // Générer des suggestions de réponse
    const suggestions = await conversationSequence.generateResponseSuggestions({
      prospect,
      conversationHistory: history,
      lastProspectResponse: response,
      goal: prospect.conversation_goal,
      currentStage: prospect.conversation_stage,
      voiceProfile,
    });

    res.json(formatResponse({
      response_analysis: suggestions.analysis,
      suggestions: suggestions.suggestions,
      next_stage: suggestions.nextStage,
      stage_info: suggestions.stageInfo,
    }));

  } catch (error) {
    console.error('Error processing response:', error);
    res.status(500).json(formatError('Erreur lors du traitement de la réponse', 'RESPONSE_ERROR'));
  }
});

/**
 * POST /api/conversations/:prospectId/advance
 * Avance à l'étape suivante de la conversation
 */
router.post('/:prospectId/advance', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;

    // Récupérer le prospect
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    if (!prospect) {
      return res.status(404).json(formatError('Prospect non trouvé', 'NOT_FOUND'));
    }

    const goalInfo = conversationSequence.getGoalInfo(prospect.conversation_goal);
    const nextStage = Math.min(prospect.conversation_stage + 1, goalInfo?.stages || 3);

    // Mettre à jour l'étape
    const updated = await conversationSequence.updateProspectConversation(prospectId, {
      conversation_stage: nextStage,
    });

    res.json(formatResponse({
      prospect: updated,
      stage_info: conversationSequence.getStageLabel(prospect.conversation_goal, nextStage),
    }));

  } catch (error) {
    console.error('Error advancing conversation:', error);
    res.status(500).json(formatError('Erreur', 'ADVANCE_ERROR'));
  }
});

/**
 * POST /api/conversations/:prospectId/complete
 * Marque la conversation comme complétée (objectif atteint)
 */
router.post('/:prospectId/complete', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { outcome } = req.body; // 'achieved' ou 'abandoned'

    const status = outcome === 'achieved' ? 'goal_achieved' : 'abandoned';

    const updated = await conversationSequence.updateProspectConversation(prospectId, {
      conversation_status: status,
      status: outcome === 'achieved' ? 'converted' : 'not_interested',
    });

    // Mettre à jour les analytics
    if (outcome === 'achieved') {
      const today = new Date();
      const month = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

      await supabaseAdmin.rpc('increment_conversation_goals', {
        p_user_id: req.user.id,
        p_month: month,
        p_goal: updated.conversation_goal,
      }).catch(() => {
        // Si la RPC n'existe pas, ignorer
      });
    }

    res.json(formatResponse({
      prospect: updated,
      message: outcome === 'achieved' ? 'Objectif atteint !' : 'Conversation terminée',
    }));

  } catch (error) {
    console.error('Error completing conversation:', error);
    res.status(500).json(formatError('Erreur', 'COMPLETE_ERROR'));
  }
});

/**
 * GET /api/conversations/:prospectId/history
 * Récupère l'historique d'une conversation
 */
router.get('/:prospectId/history', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;

    const history = await conversationSequence.getConversationHistory(prospectId, req.user.id);

    // Récupérer aussi les infos du prospect
    const { data: prospect } = await supabaseAdmin
      .from('prospects')
      .select('id, username, platform, conversation_goal, conversation_stage, conversation_status')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    res.json(formatResponse({
      prospect,
      history,
      goal_info: prospect?.conversation_goal
        ? conversationSequence.getGoalInfo(prospect.conversation_goal)
        : null,
      stage_info: prospect?.conversation_goal
        ? conversationSequence.getStageLabel(prospect.conversation_goal, prospect.conversation_stage)
        : null,
    }));

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json(formatError('Erreur', 'FETCH_ERROR'));
  }
});

/**
 * POST /api/conversations/analyze
 * Analyse une conversation en cours et suggère la prochaine réponse
 * Utilisé par l'extension Chrome pour le panel de messaging
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { platform, prospect, messages } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json(formatError('Messages requis', 'VALIDATION_ERROR'));
    }

    // Get the last message from them (not from us)
    const theirMessages = messages.filter(m => !m.isMe);
    const lastTheirMessage = theirMessages[theirMessages.length - 1];

    if (!lastTheirMessage) {
      return res.json(formatResponse({
        temperature: 'neutral',
        insight: 'En attente de leur réponse.',
        suggestion: null,
        nextAction: 'wait'
      }));
    }

    // Get user's voice profile for personalization
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    // Analyze the conversation with AI
    const analysis = await analyzeConversationWithAI({
      prospect,
      messages,
      lastResponse: lastTheirMessage.text,
      voiceProfile: voiceProfile?.profil_json || voiceProfile
    });

    res.json(formatResponse(analysis));

  } catch (error) {
    console.error('[Conversations] Analyze error:', error);
    // Return a fallback analysis instead of error
    const { messages, prospect } = req.body;
    const fallback = generateFallbackAnalysis(messages, prospect);
    res.json(formatResponse(fallback));
  }
});

/**
 * Analyze conversation using AI to determine interest level and suggest response
 */
async function analyzeConversationWithAI({ prospect, messages, lastResponse, voiceProfile }) {
  const { callClaude, parseClaudeJSON } = await import('../services/claude.js');

  const firstName = (prospect?.fullName || '').split(' ')[0];
  const tutoiement = voiceProfile?.tutoiement === 'Toujours' ? 'tutoie' : 'vouvoie';

  // Build conversation context
  const conversationContext = messages.map(m =>
    `${m.isMe ? 'MOI' : 'EUX'}: ${m.text}`
  ).join('\n');

  const systemPrompt = `Tu es un assistant de prospection expert en analyse de conversations LinkedIn.
Tu analyses les réponses des prospects pour déterminer leur niveau d'intérêt et suggérer la meilleure réponse.

Tu ${tutoiement} dans tes suggestions (comme l'utilisateur).

RÈGLE ABSOLUE: Les réponses suggérées doivent faire 3-4 phrases MAX. Pas de pavés !`;

  const userPrompt = `Analyse cette conversation et la dernière réponse du prospect:

PROSPECT: ${prospect?.fullName || 'Contact LinkedIn'}
POSTE: ${prospect?.headline || 'Non spécifié'}

CONVERSATION:
${conversationContext}

DERNIÈRE RÉPONSE DU PROSPECT:
"${lastResponse}"

Réponds en JSON:
{
  "temperature": "hot|warm|neutral|cold|drop",
  "temperatureReason": "Explication courte de pourquoi ce niveau",
  "insight": "Ce que cette réponse révèle sur l'intérêt du prospect (1-2 phrases)",
  "suggestion": {
    "message": "La réponse suggérée (3-4 phrases MAX, personnalisée)",
    "reason": "Pourquoi cette approche",
    "nextAction": "continue|propose_call|share_value|wait|drop"
  },
  "signals": ["liste des signaux détectés dans sa réponse"]
}

GUIDE TEMPÉRATURE:
- hot: Questions actives, demande d'infos, enthousiasme, mentionne un besoin
- warm: Réponse positive/curieuse, mais pas d'engagement fort
- neutral: Réponse polie mais sans signal clair
- cold: Réponse courte/distante, "pas le moment", "pas intéressé"
- drop: Refus clair, hostilité, demande d'arrêt

GUIDE RÉPONSE:
- Si hot → propose un échange/call
- Si warm → creuse avec une question sur son expérience/ses défis
- Si neutral → relance avec un élément de valeur ou question ouverte
- Si cold → message de clôture poli
- Si drop → remercie et arrête`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      temperature: 0.7
    });

    const parsed = parseClaudeJSON(response);

    if (parsed && parsed.temperature) {
      return {
        temperature: parsed.temperature,
        insight: parsed.insight || parsed.temperatureReason || 'Analyse terminée',
        suggestion: parsed.suggestion || null,
        signals: parsed.signals || [],
        nextAction: parsed.suggestion?.nextAction || 'continue'
      };
    }

    throw new Error('Invalid AI response');
  } catch (error) {
    console.error('[Conversations] AI analysis failed:', error);
    throw error;
  }
}

/**
 * Generate fallback analysis when AI is unavailable
 */
function generateFallbackAnalysis(messages, prospect) {
  const theirMessages = (messages || []).filter(m => !m.isMe);
  const lastTheirMessage = theirMessages[theirMessages.length - 1];

  if (!lastTheirMessage) {
    return {
      temperature: 'neutral',
      insight: 'En attente de leur réponse.',
      suggestion: null
    };
  }

  const text = lastTheirMessage.text.toLowerCase();
  const firstName = (prospect?.fullName || '').split(' ')[0];

  // Simple keyword analysis
  const positiveWords = ['merci', 'intéressant', 'super', 'génial', 'curieux', 'oui', 'volontiers'];
  const negativeWords = ['non merci', 'pas intéressé', 'pas le moment', 'pas besoin'];
  const questionWords = ['comment', 'pourquoi', 'quand', 'quel', '?'];

  const hasPositive = positiveWords.some(w => text.includes(w));
  const hasNegative = negativeWords.some(w => text.includes(w));
  const hasQuestion = questionWords.some(w => text.includes(w));

  let temperature = 'neutral';
  let insight = '';
  let suggestion = null;

  if (hasNegative) {
    temperature = 'cold';
    insight = 'Réponse négative. Mieux vaut ne pas insister.';
    suggestion = {
      message: 'Pas de souci, merci pour votre retour. Bonne continuation !',
      reason: 'Clôture polie'
    };
  } else if (hasPositive && hasQuestion) {
    temperature = 'hot';
    insight = 'Signal très positif - questions et intérêt !';
    suggestion = {
      message: `Avec plaisir ${firstName || ''}! [Répondez et proposez un échange]`,
      reason: 'Lead chaud - proposez un call'
    };
  } else if (hasPositive) {
    temperature = 'warm';
    insight = 'Réponse positive, continuez à creuser.';
    suggestion = {
      message: `Merci ${firstName || ''}! [Posez une question sur son expérience]`,
      reason: 'Creusez pour comprendre ses besoins'
    };
  } else {
    temperature = 'neutral';
    insight = 'Réponse neutre - relancez avec une question.';
    suggestion = {
      message: `[Posez une question ouverte en lien avec son domaine]`,
      reason: 'Une question peut relancer la conversation'
    };
  }

  return { temperature, insight, suggestion };
}

/**
 * GET /api/conversations/analytics
 * Récupère les analytics des séquences de conversation
 */
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const { months = 3 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    const { data: analytics } = await supabaseAdmin
      .from('conversation_analytics')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('month', startDate.toISOString().split('T')[0])
      .order('month', { ascending: false });

    // Calculer les taux de conversion par étape
    const summary = {};
    const goals = conversationSequence.getConversationGoals();

    goals.forEach(goal => {
      const goalAnalytics = analytics?.filter(a => a.goal === goal.id) || [];

      const totals = goalAnalytics.reduce((acc, a) => ({
        stage_1_sent: acc.stage_1_sent + (a.stage_1_sent || 0),
        stage_1_responses: acc.stage_1_responses + (a.stage_1_responses || 0),
        stage_2_sent: acc.stage_2_sent + (a.stage_2_sent || 0),
        stage_2_responses: acc.stage_2_responses + (a.stage_2_responses || 0),
        stage_3_sent: acc.stage_3_sent + (a.stage_3_sent || 0),
        stage_3_responses: acc.stage_3_responses + (a.stage_3_responses || 0),
        goals_achieved: acc.goals_achieved + (a.goals_achieved || 0),
        abandoned: acc.abandoned + (a.abandoned || 0),
      }), {
        stage_1_sent: 0,
        stage_1_responses: 0,
        stage_2_sent: 0,
        stage_2_responses: 0,
        stage_3_sent: 0,
        stage_3_responses: 0,
        goals_achieved: 0,
        abandoned: 0,
      });

      summary[goal.id] = {
        ...totals,
        stage_1_rate: totals.stage_1_sent > 0
          ? ((totals.stage_1_responses / totals.stage_1_sent) * 100).toFixed(1)
          : 0,
        stage_2_rate: totals.stage_2_sent > 0
          ? ((totals.stage_2_responses / totals.stage_2_sent) * 100).toFixed(1)
          : 0,
        stage_3_rate: totals.stage_3_sent > 0
          ? ((totals.stage_3_responses / totals.stage_3_sent) * 100).toFixed(1)
          : 0,
        conversion_rate: totals.stage_1_sent > 0
          ? ((totals.goals_achieved / totals.stage_1_sent) * 100).toFixed(1)
          : 0,
      };
    });

    res.json(formatResponse({
      raw: analytics,
      summary,
    }));

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json(formatError('Erreur', 'FETCH_ERROR'));
  }
});

export default router;
