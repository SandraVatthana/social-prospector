/**
 * Service de séquence Instagram Native
 * Philosophie : PULL marketing, pas PUSH
 * Le premier DM doit être tellement HUMAIN que la personne se dit :
 * "Tiens, c'est pas un message automatique ça... C'est qui cette personne ?"
 */

import { callClaude, parseClaudeJSON } from './claude.js';

/**
 * Objectifs disponibles (impactent uniquement la phase 4 - transition)
 */
export const OBJECTIVES = {
  network: {
    id: 'network',
    name: 'Créer une relation',
    description: 'Connexion authentique, pas de pitch',
    transition: 'Pas de pitch, juste connexion et échanges',
  },
  understand: {
    id: 'understand',
    name: 'Comprendre ses besoins',
    description: 'Écouter et creuser ses défis',
    transition: 'Creuser ses défis, poser des questions, écouter activement',
  },
  service: {
    id: 'service',
    name: 'Proposer un service',
    description: 'Mentionner ton offre naturellement',
    transition: 'Glisser ce que tu fais de façon organique quand le moment est bon',
  },
  call: {
    id: 'call',
    name: 'Obtenir un appel',
    description: 'Proposer un échange visio',
    transition: 'Proposer un appel/visio quand la confiance est établie',
  },
  product: {
    id: 'product',
    name: 'Vendre un produit',
    description: 'Partager une ressource/offre',
    transition: 'Partager une ressource ou offre pertinente',
  },
};

/**
 * Prompt système pour générer le commentaire public (Jour 1)
 */
function buildCommentSystemPrompt(voiceProfile) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS.'
    : voiceProfile?.tutoiement === 'Jamais'
      ? 'Tu vouvoies TOUJOURS.'
      : 'Tu tutoies par défaut (style Instagram).';

  return `Tu es expert en engagement authentique sur Instagram.
Tu génères des COMMENTAIRES PUBLICS qui créent de la connexion.

## FORME D'ADRESSE
${tutoiementStyle}

## OBJECTIF DU COMMENTAIRE
- Montrer que tu as VRAIMENT lu/regardé le contenu
- Ajouter de la valeur (insight, expérience perso, question pertinente)
- Créer un premier point de contact mémorable
- Faire en sorte qu'elle remarque ton nom

## RÈGLES STRICTES
✅ OBLIGATOIRE :
- Référencer un point PRÉCIS du post (pas générique)
- Ajouter un insight personnel OU une expérience similaire
- Optionnel : une micro-question pour encourager la réponse
- 2-4 lignes max

❌ INTERDIT :
- Commentaires génériques ("Super post !", "Tellement vrai !", "J'adore !")
- Emojis excessifs
- Mentionner ton activité/offre
- Liens ou promos
- Compliments creux

## FORMAT DE RÉPONSE (JSON)
{
  "comment": "Le commentaire à poster",
  "hook_element": "L'élément du post que tu as référencé",
  "personal_touch": "Ce que tu as ajouté de personnel"
}`;
}

/**
 * Prompt système pour le premier DM (Jour 2)
 * AUCUN pitch, AUCUN CTA commercial
 */
function buildFirstDMSystemPrompt(voiceProfile) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.'
    : voiceProfile?.tutoiement === 'Jamais'
      ? 'Tu vouvoies TOUJOURS, jamais de tutoiement.'
      : 'Tu tutoies par défaut (style Instagram/TikTok).';

  let styleInstructions = '';
  if (voiceProfile) {
    styleInstructions = `
## STYLE PERSONNEL
- Ton : ${voiceProfile.tone || 'Décontracté et authentique'}
- Style : ${voiceProfile.style || 'Direct et naturel'}`;

    if (voiceProfile.expressions?.length > 0) {
      styleInstructions += `
- Expressions à utiliser naturellement : ${voiceProfile.expressions.join(', ')}`;
    }
  }

  return `Tu es expert en prospection HUMAINE sur Instagram.
Tu génères le PREMIER message privé d'une séquence de prospection.

## PHILOSOPHIE FONDAMENTALE
Sur Instagram, AUCUN premier message ne doit ressembler à de la prospection.
Le but n'est PAS de vendre, c'est d'INTRIGUER pour que le prospect :
1. Réponde (conversation)
2. Aille voir ton profil (curiosité)
3. Revienne vers toi naturellement

= PULL marketing, pas PUSH

Le message doit être tellement HUMAIN que la personne se dit :
"Tiens, c'est pas un message automatique ça... C'est qui cette personne ?"

## FORME D'ADRESSE
${tutoiementStyle}
${styleInstructions}

## STRUCTURE OBLIGATOIRE (3 éléments)

1. ACCROCHE PERSONNALISÉE
   → Référence précise à son contenu (post, story, réel, bio)
   → Montre qu'on a VRAIMENT regardé son profil

2. REMARQUE AUTHENTIQUE
   → Point commun OU compliment sincère et spécifique
   → Pas de flatterie générique

3. QUESTION OUVERTE SUR ELLE
   → Sur son vécu, son parcours, son avis
   → Pas sur ses "besoins" ou "problèmes"

## RÈGLES ABSOLUES

✅ OBLIGATOIRE :
- 100% centré sur ELLE (pas sur toi/ton offre)
- Référence à son contenu réel
- Question ouverte sur SON vécu / SON avis
- Ressembler à un message d'une vraie personne curieuse
- Court : 3-4 phrases MAX

❌ STRICTEMENT INTERDITS :
- Toute mention de ton activité / ton offre / tes services
- "Je peux t'aider avec..."
- "Tu veux que je te montre..."
- "On en discute ?"
- "Je t'envoie plus d'infos ?"
- "Réserve un call"
- "Si ça t'intéresse..."
- "J'accompagne les [cible] à..."
- Tout CTA, même soft
- Tout ce qui ressemble à un pitch, même déguisé
- "J'adore ton contenu" / "Ton profil est super" (trop générique)
- Commencer par "J'espère que tu vas bien"

## BONNES QUESTIONS DE FIN (curieuses, humaines)
- "Ça t'a pris combien de temps pour en arriver là ?"
- "C'est quoi le plus dur dans ton quotidien ?"
- "Comment t'as eu ce déclic ?"
- "Ça te fait quoi quand [situation de son post] ?"
- "T'as commencé comment toi ?"
- "C'est venu d'où cette passion ?"
- "Qu'est-ce qui t'a fait changer d'approche ?"

## MAUVAISES QUESTIONS (commerciales déguisées) - INTERDITES
- "Comment tu fais pour trouver des clients ?"
- "T'as déjà pensé à automatiser ça ?"
- "Ça te dirait d'en discuter ?"
- "Tu serais ouverte à découvrir une solution ?"

## TON GLOBAL
Comme si tu parlais à une future amie, pas à un prospect.
Curieux, authentique, humain, décontracté, généreux.

## FORMAT DE RÉPONSE (JSON)
{
  "message": "Le message DM à envoyer",
  "hook_element": "L'élément spécifique du prospect utilisé",
  "question_type": "personal_journey | experience | opinion | process | passion",
  "authenticity_check": {
    "mentions_offer": false,
    "has_cta": false,
    "is_about_her": true,
    "references_real_content": true
  }
}`;
}

/**
 * Prompt système pour le message de transition (Jour 5+)
 */
function buildTransitionSystemPrompt(voiceProfile, objective) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS.'
    : voiceProfile?.tutoiement === 'Jamais'
      ? 'Tu vouvoies TOUJOURS.'
      : 'Tu tutoies par défaut.';

  const objectiveConfig = OBJECTIVES[objective] || OBJECTIVES.network;

  let transitionGuide = '';
  switch (objective) {
    case 'network':
      transitionGuide = `
## OBJECTIF : Créer une relation
- Continue simplement la conversation
- Partage des expériences communes
- Pas de pitch, juste connexion humaine
- Le message peut proposer de rester en contact ou échanger à nouveau`;
      break;
    case 'understand':
      transitionGuide = `
## OBJECTIF : Comprendre ses besoins
- Creuse ce qu'elle a partagé
- Pose des questions sur ses défis actuels
- Écoute activement, rebondis sur ses réponses
- Montre de l'empathie et de la compréhension`;
      break;
    case 'service':
      transitionGuide = `
## OBJECTIF : Proposer un service
- Glisse naturellement ce que tu fais
- "D'ailleurs c'est un peu mon taf, j'aide les [cible] à [résultat]"
- Propose SEULEMENT si elle montre de l'intérêt
- CTA soft : "Si tu veux, je peux te montrer 2-3 trucs en 5 min"`;
      break;
    case 'call':
      transitionGuide = `
## OBJECTIF : Obtenir un appel
- Propose un échange de vive voix
- "On pourrait en parler de vive voix si ça te dit"
- "Je serais curieux d'échanger avec toi, t'aurais 15 min cette semaine ?"
- Garde un ton décontracté, pas vendeur`;
      break;
    case 'product':
      transitionGuide = `
## OBJECTIF : Vendre un produit
- Partage une ressource pertinente
- "J'ai un truc qui pourrait t'aider avec ça"
- "Je t'envoie un lien, dis-moi ce que t'en penses"
- Reste dans le partage, pas la vente forcée`;
      break;
  }

  return `Tu génères un message de TRANSITION dans une séquence de prospection Instagram.
Ce message arrive APRÈS plusieurs échanges (Jour 5+), quand la confiance est établie.

## FORME D'ADRESSE
${tutoiementStyle}

${transitionGuide}

## CONTEXTE
La conversation a déjà eu lieu. Tu as échangé plusieurs messages.
Ce message doit :
- Rebondir sur ce qui a été dit
- Être naturel dans le flow de la conversation
- Introduire doucement ton sujet/offre SI l'objectif le demande

## RÈGLES
- Reste naturel et authentique
- Pas de pitch agressif
- Pas de pression
- Laisse une porte ouverte

## FORMAT DE RÉPONSE (JSON)
{
  "message": "Le message de transition",
  "transition_type": "soft_mention | resource_share | call_proposal | continued_conversation",
  "next_step_if_positive": "Ce que tu feras si elle répond positivement"
}`;
}

/**
 * Génère un commentaire public pour le warm-up (Jour 1)
 */
export async function generateWarmupComment(prospect, voiceProfile) {
  const systemPrompt = buildCommentSystemPrompt(voiceProfile);

  const userPrompt = `Génère un commentaire public pour ce prospect :

PROSPECT : @${prospect.username}
PLATEFORME : ${prospect.platform || 'Instagram'}
BIO : ${prospect.bio || 'Non disponible'}

DERNIER POST / CONTENU RÉCENT :
${prospect.recentPost || prospect.lastPostCaption || prospect.recent_post || 'Contenu non disponible - utilise la bio'}

Génère un commentaire authentique et engageant.
Réponds UNIQUEMENT avec le JSON demandé.`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0.8,
    });

    const parsed = parseClaudeJSON(response);

    if (!parsed || !parsed.comment) {
      // Fallback
      const commentMatch = response.match(/"comment"\s*:\s*"([^"]+)"/);
      return {
        comment: commentMatch ? commentMatch[1] : "Ton post m'a fait réfléchir, merci pour ce partage !",
        hook_element: 'contenu général',
        personal_touch: 'réflexion personnelle',
      };
    }

    return parsed;
  } catch (error) {
    console.error('[InstagramSequence] Error generating comment:', error);
    throw error;
  }
}

/**
 * Génère le premier DM (Jour 2) - SANS pitch
 */
export async function generateFirstDM(prospect, voiceProfile) {
  const systemPrompt = buildFirstDMSystemPrompt(voiceProfile);

  const userPrompt = `Génère le PREMIER message DM pour ce prospect :

PROSPECT : @${prospect.username}
PLATEFORME : ${prospect.platform || 'Instagram'}
BIO : ${prospect.bio || 'Non disponible'}
FOLLOWERS : ${prospect.followers_count || prospect.followers || 'N/A'}

DERNIER POST / CONTENU RÉCENT :
${prospect.recentPost || prospect.lastPostCaption || prospect.recent_post || 'Contenu non disponible - base-toi sur la bio'}

${prospect.analysis ? `ANALYSE DU PROSPECT :\n${JSON.stringify(prospect.analysis, null, 2)}` : ''}

RAPPEL CRITIQUE :
- Ce message doit être 100% centré sur ELLE
- AUCUNE mention de ton offre/activité
- AUCUN CTA commercial
- Juste une vraie curiosité humaine

Réponds UNIQUEMENT avec le JSON demandé.`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0.7,
    });

    const parsed = parseClaudeJSON(response);

    if (!parsed || !parsed.message) {
      const messageMatch = response.match(/"message"\s*:\s*"([^"]+)"/);
      return {
        message: messageMatch ? messageMatch[1] : `Hello ! J'ai vu ton profil et ça m'a intrigué. Tu fais ça depuis longtemps ?`,
        hook_element: 'profil général',
        question_type: 'personal_journey',
        authenticity_check: {
          mentions_offer: false,
          has_cta: false,
          is_about_her: true,
          references_real_content: true,
        },
      };
    }

    // Vérification de sécurité : s'assurer qu'il n'y a pas de CTA commercial
    const forbiddenPhrases = [
      'tu veux que je te montre',
      'on en discute',
      'je t\'envoie',
      'réserve',
      'si ça t\'intéresse',
      'j\'accompagne',
      'je peux t\'aider',
      'j\'aide les',
      'mon offre',
      'mes services',
    ];

    const messageLower = parsed.message.toLowerCase();
    const hasForbidden = forbiddenPhrases.some(phrase => messageLower.includes(phrase));

    if (hasForbidden) {
      console.warn('[InstagramSequence] Generated message contained forbidden phrases, regenerating...');
      // On pourrait régénérer ici, mais pour l'instant on log juste
    }

    return parsed;
  } catch (error) {
    console.error('[InstagramSequence] Error generating first DM:', error);
    throw error;
  }
}

/**
 * Génère le message de transition (Jour 5+)
 */
export async function generateTransitionMessage(prospect, voiceProfile, objective, conversationContext) {
  const systemPrompt = buildTransitionSystemPrompt(voiceProfile, objective);

  const userPrompt = `Génère un message de TRANSITION pour ce prospect :

PROSPECT : @${prospect.username}
OBJECTIF : ${OBJECTIVES[objective]?.name || 'Créer une relation'}

CONTEXTE DE LA CONVERSATION :
${conversationContext || 'Vous avez échangé plusieurs messages. Elle a répondu positivement à ton premier DM et vous avez eu une conversation authentique.'}

${voiceProfile?.business_context ? `
TON ACTIVITÉ (à mentionner SEULEMENT si pertinent) :
- Activité : ${voiceProfile.business_context.activity || 'Non spécifié'}
- Cible : ${voiceProfile.business_context.target || 'Non spécifié'}
- Offre : ${voiceProfile.business_context.gift || 'Non spécifié'}
` : ''}

Génère un message de transition naturel.
Réponds UNIQUEMENT avec le JSON demandé.`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      temperature: 0.7,
    });

    const parsed = parseClaudeJSON(response);

    if (!parsed || !parsed.message) {
      const messageMatch = response.match(/"message"\s*:\s*"([^"]+)"/);
      return {
        message: messageMatch ? messageMatch[1] : `J'ai adoré notre échange ! On reste en contact ?`,
        transition_type: 'continued_conversation',
        next_step_if_positive: 'Continuer à échanger régulièrement',
      };
    }

    return parsed;
  } catch (error) {
    console.error('[InstagramSequence] Error generating transition:', error);
    throw error;
  }
}

/**
 * Génère la séquence complète pour un prospect
 */
export async function generateFullSequence(prospect, voiceProfile, objective = 'network') {
  try {
    // Générer les 3 éléments en parallèle
    const [comment, firstDM, transition] = await Promise.all([
      generateWarmupComment(prospect, voiceProfile),
      generateFirstDM(prospect, voiceProfile),
      generateTransitionMessage(prospect, voiceProfile, objective, null),
    ]);

    return {
      day1: {
        phase: 'Warm-up',
        description: 'Interaction publique',
        actions: [
          { type: 'like', description: 'Liker 2-3 posts récents' },
          { type: 'comment', content: comment.comment, metadata: comment },
        ],
      },
      day2: {
        phase: 'Premier DM',
        description: 'Message privé humain',
        message: firstDM.message,
        metadata: firstDM,
      },
      day3_5: {
        phase: 'Conversation',
        description: 'Si réponse positive',
        tips: [
          'Rebondir sur sa réponse',
          'Partager une expérience similaire',
          'Poser une autre question sur elle',
          'Apporter un micro-conseil gratuit si pertinent',
          'Toujours ZÉRO pitch',
        ],
      },
      day5_plus: {
        phase: 'Transition',
        description: `Objectif : ${OBJECTIVES[objective]?.name || 'Créer une relation'}`,
        message: transition.message,
        metadata: transition,
        objective: OBJECTIVES[objective],
      },
    };
  } catch (error) {
    console.error('[InstagramSequence] Error generating full sequence:', error);
    throw error;
  }
}

/**
 * Génère uniquement le DM direct (pour prospects déjà chauds)
 */
export async function generateDirectDM(prospect, voiceProfile, objective = 'network') {
  // Pour un DM direct, on génère juste le premier DM
  // La personne est déjà "chaude" donc on peut aller un peu plus vite
  // Mais on reste humain et sans pitch agressif

  const firstDM = await generateFirstDM(prospect, voiceProfile);

  return {
    mode: 'direct',
    message: firstDM.message,
    metadata: firstDM,
    tips: [
      'Ce prospect a déjà interagi avec toi',
      'Tu peux aller un peu plus vite dans la conversation',
      'Mais reste authentique et sans pression',
    ],
  };
}

export default {
  OBJECTIVES,
  generateWarmupComment,
  generateFirstDM,
  generateTransitionMessage,
  generateFullSequence,
  generateDirectDM,
};
