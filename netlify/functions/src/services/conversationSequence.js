/**
 * Service de gestion des séquences de conversation
 * Gère les objectifs, les étapes et la génération de messages contextuels
 */

import Anthropic from '@anthropic-ai/sdk';
import { supabaseAdmin } from '../utils/supabase.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Définition des objectifs de conversation
const CONVERSATION_GOALS = {
  call: {
    id: 'call',
    label: '📞 Obtenir un appel découverte',
    description: 'Séquence pour proposer un call de 15-20 min',
    icon: 'Phone',
    stages: 3,
  },
  link: {
    id: 'link',
    label: '🔗 Amener vers mon lien',
    description: 'Séquence pour diriger vers une page/ressource',
    icon: 'Link',
    stages: 3,
  },
  qualify: {
    id: 'qualify',
    label: '💬 Qualifier et orienter',
    description: 'Séquence pour comprendre le besoin avant de proposer',
    icon: 'MessageCircle',
    stages: 3,
  },
  network: {
    id: 'network',
    label: '🤝 Créer une relation',
    description: 'Séquence douce, pas de vente directe',
    icon: 'Users',
    stages: 3,
  },
};

// Labels des étapes par objectif
const STAGE_LABELS = {
  call: {
    1: { name: 'Ouverture', description: 'Accroche + question ouverte' },
    2: { name: 'Transition vers call', description: 'Valeur + proposition de call' },
    3: { name: 'Relance douce', description: 'Rappel sans pression' },
  },
  link: {
    1: { name: 'Ouverture + Teaser', description: 'Accroche + teaser ressource' },
    2: { name: 'Valeur + Lien', description: 'Avant-goût + partage du lien' },
    3: { name: 'Suivi léger', description: 'Relance pour feedback' },
  },
  qualify: {
    1: { name: 'Question qualification', description: 'Comprendre leur situation' },
    2: { name: 'Approfondissement', description: 'Creuser le besoin' },
    3: { name: 'Proposition adaptée', description: 'Solution sur-mesure' },
  },
  network: {
    1: { name: 'Connexion authentique', description: 'Compliment + point commun' },
    2: { name: 'Valeur sans demande', description: 'Partage désintéressé' },
    3: { name: 'Proposition légère', description: 'Call optionnel' },
  },
};

/**
 * Récupère les objectifs de conversation disponibles
 */
function getConversationGoals() {
  return Object.values(CONVERSATION_GOALS);
}

/**
 * Récupère les informations d'un objectif
 */
function getGoalInfo(goalId) {
  return CONVERSATION_GOALS[goalId] || null;
}

/**
 * Récupère le label d'une étape
 */
function getStageLabel(goalId, stage) {
  return STAGE_LABELS[goalId]?.[stage] || { name: `Étape ${stage}`, description: '' };
}

/**
 * Récupère les templates de séquence pour un utilisateur et un objectif
 */
async function getSequenceTemplates(userId, goalId) {
  // D'abord chercher les templates personnalisés de l'utilisateur
  const { data: userTemplates } = await supabaseAdmin
    .from('conversation_sequences')
    .select('*')
    .eq('user_id', userId)
    .eq('goal', goalId)
    .order('stage');

  // Si l'utilisateur a des templates personnalisés, les utiliser
  if (userTemplates && userTemplates.length > 0) {
    return userTemplates;
  }

  // Sinon, utiliser les templates par défaut du système
  const { data: defaultTemplates } = await supabaseAdmin
    .from('conversation_sequences')
    .select('*')
    .is('user_id', null)
    .eq('goal', goalId)
    .eq('is_system_default', true)
    .order('stage');

  return defaultTemplates || [];
}

/**
 * Analyse la réponse du prospect pour adapter les suggestions
 */
function analyzeProspectResponse(response) {
  const responseLower = response.toLowerCase();

  const analysis = {
    sentiment: 'neutral',
    buyingSignals: [],
    objections: [],
    questions: [],
    suggestedApproach: 'continue',
  };

  // Détection du sentiment
  const positiveWords = ['super', 'génial', 'intéressant', 'oui', 'ok', 'cool', 'parfait', 'merci', 'trop bien', 'grave'];
  const negativeWords = ['non', 'pas intéressé', 'stop', 'spam', 'arrête', 'dégage'];
  const hesitantWords = ['peut-être', 'je sais pas', 'on verra', 'pas sûr', 'je réfléchis'];

  if (positiveWords.some(w => responseLower.includes(w))) {
    analysis.sentiment = 'positive';
    analysis.suggestedApproach = 'advance'; // Passer à l'action
  } else if (negativeWords.some(w => responseLower.includes(w))) {
    analysis.sentiment = 'negative';
    analysis.suggestedApproach = 'abandon'; // Arrêter la conversation
  } else if (hesitantWords.some(w => responseLower.includes(w))) {
    analysis.sentiment = 'hesitant';
    analysis.suggestedApproach = 'reassure'; // Rassurer
  }

  // Détection des signaux d'achat
  const buyingPatterns = [
    { pattern: /combien.*coût|prix|tarif/i, signal: 'asking_price' },
    { pattern: /comment.*march|fonctionne/i, signal: 'asking_how' },
    { pattern: /c'?est quoi.*exact/i, signal: 'asking_details' },
    { pattern: /tu fais quoi|tu proposes quoi/i, signal: 'asking_offer' },
    { pattern: /ça m'?intéresse/i, signal: 'expressing_interest' },
  ];

  buyingPatterns.forEach(({ pattern, signal }) => {
    if (pattern.test(response)) {
      analysis.buyingSignals.push(signal);
      analysis.sentiment = 'positive';
      analysis.suggestedApproach = 'advance';
    }
  });

  // Détection des objections
  const objectionPatterns = [
    { pattern: /pas.*temps|pas le temps|débordé|surchargé/i, objection: 'no_time' },
    { pattern: /pas.*budget|trop cher|pas les moyens/i, objection: 'no_budget' },
    { pattern: /je réfléchis|j'?y pense|plus tard/i, objection: 'thinking' },
    { pattern: /déjà.*quelqu'?un|j'?ai déjà/i, objection: 'has_solution' },
  ];

  objectionPatterns.forEach(({ pattern, objection }) => {
    if (pattern.test(response)) {
      analysis.objections.push(objection);
      analysis.suggestedApproach = 'handle_objection';
    }
  });

  // Détection des questions
  if (response.includes('?')) {
    analysis.questions.push('has_question');
    if (analysis.suggestedApproach === 'continue') {
      analysis.suggestedApproach = 'answer_then_advance';
    }
  }

  return analysis;
}

/**
 * Génère des suggestions de réponse basées sur le contexte
 */
async function generateResponseSuggestions(params) {
  const {
    prospect,
    conversationHistory,
    lastProspectResponse,
    goal,
    currentStage,
    voiceProfile,
    numberOfSuggestions = 3,
  } = params;

  // Analyser la réponse du prospect
  const responseAnalysis = analyzeProspectResponse(lastProspectResponse);

  // Récupérer le template de la prochaine étape
  const templates = await getSequenceTemplates(null, goal);
  const nextStageTemplate = templates.find(t => t.stage === currentStage + 1) || templates[templates.length - 1];

  // Construire le prompt pour Claude
  const systemPrompt = buildSuggestionSystemPrompt(voiceProfile, goal, responseAnalysis);
  const userPrompt = buildSuggestionUserPrompt({
    prospect,
    conversationHistory,
    lastProspectResponse,
    responseAnalysis,
    currentStage,
    nextStageTemplate,
    numberOfSuggestions,
  });

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = response.content[0].text;

    // Parser les suggestions (format JSON attendu)
    try {
      const suggestions = JSON.parse(content);
      return {
        suggestions: suggestions.slice(0, numberOfSuggestions),
        analysis: responseAnalysis,
        nextStage: currentStage + 1,
        stageInfo: getStageLabel(goal, currentStage + 1),
      };
    } catch {
      // Si le parsing échoue, retourner le contenu brut comme une seule suggestion
      return {
        suggestions: [{
          type: 'default',
          label: 'Réponse suggérée',
          content: content.replace(/```json|```/g, '').trim(),
        }],
        analysis: responseAnalysis,
        nextStage: currentStage + 1,
        stageInfo: getStageLabel(goal, currentStage + 1),
      };
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    throw error;
  }
}

/**
 * Génère le message d'ouverture (étape 1) avec objectif
 */
async function generateOpeningMessage(params) {
  const { prospect, goal, voiceProfile, approachMethod = 'mini_aida' } = params;

  // Récupérer le template de l'étape 1
  const templates = await getSequenceTemplates(null, goal);
  const openingTemplate = templates.find(t => t.stage === 1);

  const systemPrompt = buildOpeningSystemPrompt(voiceProfile, goal, openingTemplate);
  const userPrompt = buildOpeningUserPrompt(prospect, goal);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    return {
      message: response.content[0].text,
      goal,
      stage: 1,
      stageInfo: getStageLabel(goal, 1),
      approach_method: approachMethod,
    };
  } catch (error) {
    console.error('Error generating opening message:', error);
    throw error;
  }
}

/**
 * Enregistre un message dans l'historique de conversation
 */
async function saveToHistory(params) {
  const { prospectId, userId, direction, content, stage, approachMethod, analysis } = params;

  const { data, error } = await supabaseAdmin
    .from('conversation_history')
    .insert({
      prospect_id: prospectId,
      user_id: userId,
      direction,
      content,
      stage,
      approach_method: approachMethod,
      analysis: analysis || {},
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Met à jour le statut de conversation d'un prospect
 */
async function updateProspectConversation(prospectId, updates) {
  const { data, error } = await supabaseAdmin
    .from('prospects')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Récupère l'historique de conversation d'un prospect
 */
async function getConversationHistory(prospectId, userId) {
  const { data, error } = await supabaseAdmin
    .from('conversation_history')
    .select('*')
    .eq('prospect_id', prospectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============ Helper Functions ============

function buildSuggestionSystemPrompt(voiceProfile, goal, analysis) {
  const goalInfo = CONVERSATION_GOALS[goal];

  // Déterminer le tutoiement
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours' ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.' :
                          voiceProfile?.tutoiement === 'Jamais' ? 'Tu vouvoies TOUJOURS, jamais de tutoiement.' :
                          'Tu tutoies par défaut (style Instagram/TikTok).';

  let prompt = `Tu es un expert en copywriting pour DMs Instagram/TikTok.
Tu génères des suggestions de réponse pour continuer une conversation de prospection.

OBJECTIF DE LA CONVERSATION: ${goalInfo.label}
${goalInfo.description}

ANALYSE DE LA RÉPONSE DU PROSPECT:
- Sentiment: ${analysis.sentiment}
- Signaux d'achat: ${analysis.buyingSignals.join(', ') || 'Aucun'}
- Objections: ${analysis.objections.join(', ') || 'Aucune'}
- Approche suggérée: ${analysis.suggestedApproach}

FORME D'ADRESSE: ${tutoiementStyle}

RÈGLES:
- Messages courts (max 250 caractères)
- Ton naturel et conversationnel
- Jamais de spam ou phrases génériques
- Adapter le ton au sentiment du prospect
- Si objection → rassurer avec douceur
- Si positif → avancer vers l'objectif
- Si question → répondre puis transition`;

  // Règles spécifiques pour "Créer une relation" (network)
  if (goal === 'network') {
    prompt += `

⚠️ MODE "CRÉER UNE RELATION" - ZÉRO VENTE ⚠️

Tu n'es PAS en train de prospecter. Tu continues une conversation comme un humain curieux.

ABSOLUMENT INTERDIT:
❌ Mentionner ton activité, tes services, ton offre
❌ "J'aide les X à...", "Je propose...", "Mon truc c'est..."
❌ "Tu veux que je te montre ?", "On en discute ?", "Je t'envoie des infos ?"
❌ Proposer un call, un échange, une démo
❌ Toute phrase qui sous-entend que tu veux quelque chose d'elle

CE QUE TU DOIS FAIRE:
✅ Répondre naturellement à ce qu'elle a dit
✅ Montrer un intérêt sincère pour SON expérience
✅ Poser des questions sur ELLE, pas sur tes services
✅ Écrire comme une vraie conversation entre humains

Le message doit être IMPOSSIBLE à distinguer d'une conversation naturelle.`;
  }

  if (voiceProfile) {
    prompt += `

STYLE "MA VOIX" DE L'UTILISATEUR:
- Ton: ${voiceProfile.tone || 'amical'}
- Style: ${voiceProfile.style || 'décontracté'}
- Expressions favorites: ${voiceProfile.keywords?.join(', ') || ''}
- Mots à éviter: ${voiceProfile.avoid_words?.join(', ') || ''}`;
  }

  prompt += `

FORMAT DE SORTIE (JSON uniquement):
[
  {
    "type": "direct|soft|value",
    "label": "Nom court de l'option",
    "content": "Le message suggéré"
  }
]`;

  return prompt;
}

function buildSuggestionUserPrompt(params) {
  const {
    prospect,
    conversationHistory,
    lastProspectResponse,
    responseAnalysis,
    currentStage,
    nextStageTemplate,
    numberOfSuggestions,
  } = params;

  let prompt = `PROSPECT:
- @${prospect.username} (${prospect.platform})
- Bio: ${prospect.bio || 'Non disponible'}

HISTORIQUE DE LA CONVERSATION:
${conversationHistory.map(h => `${h.direction === 'outbound' ? 'MOI' : 'PROSPECT'}: "${h.content}"`).join('\n')}

DERNIÈRE RÉPONSE DU PROSPECT:
"${lastProspectResponse}"

ÉTAPE ACTUELLE: ${currentStage}/3
PROCHAINE ÉTAPE: ${nextStageTemplate?.stage_name || 'Closing'}

TEMPLATE DE RÉFÉRENCE POUR LA PROCHAINE ÉTAPE:
${nextStageTemplate?.template || 'Proposer l\'action finale'}

INSTRUCTIONS:
${nextStageTemplate?.ai_instructions || 'Adapter au contexte de la conversation'}

Génère ${numberOfSuggestions} suggestions de réponse différentes:
1. Une version directe (va droit au but)
2. Une version douce (plus progressive)
3. Une version valeur (apporte quelque chose d'utile d'abord)

Réponds UNIQUEMENT en JSON valide.`;

  return prompt;
}

function buildOpeningSystemPrompt(voiceProfile, goal, template) {
  const goalInfo = CONVERSATION_GOALS[goal];

  // Déterminer le tutoiement
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours' ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.' :
                          voiceProfile?.tutoiement === 'Jamais' ? 'Tu vouvoies TOUJOURS, jamais de tutoiement.' :
                          'Tu tutoies par défaut (style Instagram/TikTok).';

  let prompt = `Tu es un expert en copywriting pour DMs Instagram/TikTok.
Tu génères le PREMIER message d'une séquence de prospection.

OBJECTIF FINAL: ${goalInfo.label}
${goalInfo.description}

ÉTAPE ACTUELLE: 1 - Ouverture
${template?.ai_instructions || 'Créer une accroche personnalisée basée sur le contenu du prospect.'}

FORME D'ADRESSE: ${tutoiementStyle}

RÈGLES:
- Message court (max 300 caractères)
- Accroche personnalisée basée sur leur contenu récent
- Question ouverte pour engager
- Ton naturel et curieux
- Pas de pitch, pas de vente à ce stade`;

  // Règles spécifiques pour "Créer une relation" (network)
  if (goal === 'network') {
    prompt += `

⚠️ MODE "CRÉER UNE RELATION" - ZÉRO VENTE ⚠️

Tu n'es PAS en train de prospecter. Tu es quelqu'un qui a VRAIMENT regardé ce profil et qui veut juste échanger, comme un humain curieux.

MINDSET: Imagine que tu découvres quelqu'un d'intéressant à une soirée. Tu veux juste discuter, pas vendre.

ABSOLUMENT INTERDIT:
❌ Mentionner ton activité, tes services, ton offre, ton expertise
❌ "J'aide les X à...", "Je propose...", "Mon truc c'est..."
❌ Toute forme de pitch même subtil
❌ "Tu veux que je te montre ?", "On en discute ?", "Je t'envoie des infos ?"
❌ Proposer un call, un échange, une démo, quoi que ce soit
❌ Phrases qui sous-entendent que tu veux quelque chose d'elle
❌ "Ça pourrait t'intéresser", "Si jamais tu as besoin"

CE QUE TU DOIS FAIRE:
✅ Référencer un VRAI élément spécifique de son profil/post récent
✅ Montrer que tu as vraiment regardé son contenu (détail précis)
✅ Exprimer une curiosité sincère sur ce qu'ELLE fait/pense
✅ Poser une question ouverte sur SON expérience, SON avis, SES projets
✅ Écrire comme si tu parlais à une future amie, pas une future cliente

EXEMPLES DE FINS DE MESSAGE:
- "Comment t'es arrivée à cette approche ?"
- "Ça fait longtemps que tu bosses sur ce sujet ?"
- "C'est quoi le truc qui t'a le plus marquée là-dedans ?"
- "T'as des ressources que tu recommandes ?"

Le message doit être IMPOSSIBLE à distinguer d'un vrai message spontané d'une personne curieuse.`;
  }

  if (voiceProfile) {
    prompt += `

STYLE "MA VOIX":
- Ton: ${voiceProfile.tone || 'amical'}
- Style: ${voiceProfile.style || 'décontracté'}
- Expressions: ${voiceProfile.keywords?.join(', ') || ''}`;
  }

  return prompt;
}

function buildOpeningUserPrompt(prospect, goal) {
  return `PROSPECT:
- Username: @${prospect.username}
- Plateforme: ${prospect.platform}
- Bio: ${prospect.bio || 'Non disponible'}
- Followers: ${prospect.followers || 'Inconnu'}
- Posts récents: ${prospect.recent_posts?.map(p => p.caption?.slice(0, 50)).join(' | ') || 'Non disponibles'}

Génère le message d'ouverture. Réponds UNIQUEMENT avec le message, sans guillemets ni explication.`;
}

export default {
  getConversationGoals,
  getGoalInfo,
  getStageLabel,
  getSequenceTemplates,
  analyzeProspectResponse,
  generateResponseSuggestions,
  generateOpeningMessage,
  saveToHistory,
  updateProspectConversation,
  getConversationHistory,
  CONVERSATION_GOALS,
  STAGE_LABELS,
};
