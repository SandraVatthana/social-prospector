/**
 * Service de Catégorisation IA des Réponses
 *
 * Analyse les réponses des prospects avec Claude et les catégorise
 * automatiquement pour faciliter le suivi CRM.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Catégories de réponses
const RESPONSE_CATEGORIES = {
  HOT_LEAD: {
    id: 'hot_lead',
    label: 'Lead chaud',
    emoji: '🔥',
    color: '#ef4444',
    description: 'Intéressé, prêt à avancer',
    priority: 1,
    suggestedAction: 'Relancer rapidement, proposer un RDV'
  },
  MEETING_REQUEST: {
    id: 'meeting_request',
    label: 'Demande RDV',
    emoji: '📅',
    color: '#8b5cf6',
    description: 'Veut un rendez-vous ou appel',
    priority: 2,
    suggestedAction: 'Planifier immédiatement'
  },
  WARM_LEAD: {
    id: 'warm_lead',
    label: 'Lead tiède',
    emoji: '🟡',
    color: '#f59e0b',
    description: 'Curieux, pose des questions',
    priority: 3,
    suggestedAction: 'Nurturing, répondre aux questions'
  },
  QUESTION: {
    id: 'question',
    label: 'Question',
    emoji: '❓',
    color: '#3b82f6',
    description: 'Pose une question spécifique',
    priority: 4,
    suggestedAction: 'Répondre à la question'
  },
  OBJECTION: {
    id: 'objection',
    label: 'Objection',
    emoji: '🛡️',
    color: '#f97316',
    description: 'Objection à traiter',
    priority: 5,
    suggestedAction: 'Traiter l\'objection avec tact'
  },
  NOT_INTERESTED: {
    id: 'not_interested',
    label: 'Pas intéressé',
    emoji: '🔴',
    color: '#6b7280',
    description: 'Décline poliment',
    priority: 6,
    suggestedAction: 'Archiver, remercier'
  },
  NEGATIVE: {
    id: 'negative',
    label: 'Négatif',
    emoji: '🚫',
    color: '#dc2626',
    description: 'Réponse négative ou spam',
    priority: 7,
    suggestedAction: 'Ignorer, ne pas relancer'
  },
  NEUTRAL: {
    id: 'neutral',
    label: 'Neutre',
    emoji: '⚪',
    color: '#9ca3af',
    description: 'Pas assez clair pour catégoriser',
    priority: 8,
    suggestedAction: 'Analyser le contexte'
  }
};

/**
 * Catégorise une réponse de prospect avec l'IA
 * @param {string} prospectResponse - La réponse du prospect
 * @param {object} context - Contexte optionnel (conversation précédente, infos prospect)
 * @returns {object} Résultat de la catégorisation
 */
async function categorizeResponse(prospectResponse, context = {}) {
  if (!prospectResponse || prospectResponse.trim().length === 0) {
    return {
      category: RESPONSE_CATEGORIES.NEUTRAL,
      confidence: 0,
      reasoning: 'Réponse vide',
      signals: [],
      suggestedResponse: null
    };
  }

  const contextInfo = context.previousMessages
    ? `\nCONTEXTE DE LA CONVERSATION :\n${context.previousMessages.slice(-3).map(m => `${m.direction === 'outbound' ? 'MOI' : 'PROSPECT'}: ${m.content}`).join('\n')}`
    : '';

  const prospectInfo = context.prospectName
    ? `\nPROSPECT : ${context.prospectName}${context.prospectBio ? ` - ${context.prospectBio}` : ''}`
    : '';

  const prompt = `Tu es un expert en qualification de leads et prospection. Analyse cette réponse de prospect et catégorise-la.
${prospectInfo}
${contextInfo}

RÉPONSE DU PROSPECT À ANALYSER :
"${prospectResponse}"

CATÉGORIES POSSIBLES :
- hot_lead : Très intéressé, veut avancer (ex: "oui ça m'intéresse", "comment on fait ?", "je suis partant")
- meeting_request : Veut un RDV/appel (ex: "on peut s'appeler ?", "t'es dispo quand ?", "je veux en savoir plus en visio")
- warm_lead : Curieux mais pas encore convaincu (ex: "c'est quoi exactement ?", "ça marche comment ?", "intéressant...")
- question : Pose une question précise (ex: "c'est combien ?", "ça prend combien de temps ?", "c'est pour quel type de profil ?")
- objection : Objection à traiter (ex: "j'ai pas le temps", "c'est trop cher", "j'ai déjà quelqu'un", "je réfléchis")
- not_interested : Pas intéressé poliment (ex: "merci mais non", "pas pour moi", "peut-être plus tard")
- negative : Négatif/agressif/spam (ex: "arrête de me contacter", "c'est du spam", réponse agressive)
- neutral : Impossible à catégoriser clairement (ex: "ok", "merci", réponse très courte sans indication)

RÉPONDS EN JSON UNIQUEMENT :
{
  "category": "id_de_la_categorie",
  "confidence": 0.0 à 1.0,
  "reasoning": "Explication courte de pourquoi cette catégorie",
  "signals": ["signal1", "signal2"],
  "objection_type": "no_time|no_budget|has_solution|thinking|other" (seulement si objection),
  "question_type": "price|how_it_works|timing|target|other" (seulement si question),
  "suggested_response_tone": "enthusiastic|helpful|reassuring|professional|empathetic"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = response.content[0].text.trim();

    // Parser le JSON
    let parsed;
    try {
      // Nettoyer si markdown
      let cleanText = responseText;
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      console.error('[Categorization] Failed to parse JSON:', responseText);
      return {
        category: RESPONSE_CATEGORIES.NEUTRAL,
        confidence: 0.5,
        reasoning: 'Erreur de parsing',
        signals: [],
        raw: responseText
      };
    }

    // Mapper la catégorie
    const categoryKey = Object.keys(RESPONSE_CATEGORIES).find(
      key => RESPONSE_CATEGORIES[key].id === parsed.category
    );
    const category = categoryKey ? RESPONSE_CATEGORIES[categoryKey] : RESPONSE_CATEGORIES.NEUTRAL;

    return {
      category,
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || '',
      signals: parsed.signals || [],
      objectionType: parsed.objection_type || null,
      questionType: parsed.question_type || null,
      suggestedTone: parsed.suggested_response_tone || 'professional',
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[Categorization] API Error:', error);
    throw new Error('Erreur lors de la catégorisation: ' + error.message);
  }
}

/**
 * Catégorise plusieurs réponses en batch
 * @param {array} responses - Array de {id, response, context}
 * @returns {array} Résultats de catégorisation
 */
async function categorizeResponses(responses) {
  const results = [];

  for (const item of responses) {
    try {
      const result = await categorizeResponse(item.response, item.context || {});
      results.push({
        id: item.id,
        ...result
      });
    } catch (error) {
      results.push({
        id: item.id,
        category: RESPONSE_CATEGORIES.NEUTRAL,
        confidence: 0,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Obtenir les statistiques de catégorisation
 * @param {array} categorizedResponses - Réponses catégorisées
 * @returns {object} Statistiques
 */
function getCategoryStats(categorizedResponses) {
  const stats = {};

  Object.values(RESPONSE_CATEGORIES).forEach(cat => {
    stats[cat.id] = {
      ...cat,
      count: 0,
      percentage: 0
    };
  });

  categorizedResponses.forEach(response => {
    if (response.category && response.category.id) {
      stats[response.category.id].count++;
    }
  });

  const total = categorizedResponses.length;
  if (total > 0) {
    Object.keys(stats).forEach(key => {
      stats[key].percentage = Math.round((stats[key].count / total) * 100);
    });
  }

  return {
    total,
    byCategory: stats,
    hotLeadsCount: stats.hot_lead.count + stats.meeting_request.count,
    needsAttentionCount: stats.question.count + stats.objection.count,
    archivedCount: stats.not_interested.count + stats.negative.count
  };
}

/**
 * Suggérer une action basée sur la catégorie
 * @param {object} categorization - Résultat de catégorisation
 * @returns {object} Action suggérée
 */
function suggestAction(categorization) {
  const { category, objectionType, questionType } = categorization;

  const actions = {
    hot_lead: {
      action: 'follow_up_fast',
      message: 'Relancer dans les 24h avec une proposition concrète',
      urgency: 'high'
    },
    meeting_request: {
      action: 'schedule_meeting',
      message: 'Proposer 2-3 créneaux disponibles',
      urgency: 'immediate'
    },
    warm_lead: {
      action: 'nurture',
      message: 'Envoyer du contenu de valeur, répondre aux questions',
      urgency: 'medium'
    },
    question: {
      action: 'answer_question',
      message: questionType === 'price'
        ? 'Répondre au prix en ajoutant de la valeur'
        : 'Répondre précisément à la question',
      urgency: 'medium'
    },
    objection: {
      action: 'handle_objection',
      message: getObjectionHandlingTip(objectionType),
      urgency: 'medium'
    },
    not_interested: {
      action: 'archive_politely',
      message: 'Remercier et garder la porte ouverte',
      urgency: 'low'
    },
    negative: {
      action: 'do_not_contact',
      message: 'Ne plus contacter, marquer comme spam',
      urgency: 'none'
    },
    neutral: {
      action: 'clarify',
      message: 'Poser une question pour clarifier l\'intérêt',
      urgency: 'low'
    }
  };

  return actions[category.id] || actions.neutral;
}

function getObjectionHandlingTip(objectionType) {
  const tips = {
    no_time: 'Proposer un format court (15min) ou asynchrone',
    no_budget: 'Mettre en avant le ROI ou proposer une offre découverte',
    has_solution: 'Identifier les limites de la solution actuelle',
    thinking: 'Proposer un élément déclencheur (deadline, bonus)',
    other: 'Écouter et reformuler pour comprendre le vrai blocage'
  };
  return tips[objectionType] || tips.other;
}

export {
  RESPONSE_CATEGORIES,
  categorizeResponse,
  categorizeResponses,
  getCategoryStats,
  suggestAction
};
