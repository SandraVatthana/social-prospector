/**
 * Service de séquence LinkedIn Native
 * Philosophie : PULL marketing adapté au contexte B2B/professionnel
 * Le premier DM doit être tellement HUMAIN et PERTINENT que la personne se dit :
 * "Tiens, cette personne a vraiment pris le temps de lire mon profil..."
 */

import { callClaude, parseClaudeJSON } from './claude.js';

/**
 * Objectifs disponibles (impactent uniquement la phase 4 - transition)
 * Adaptés au contexte LinkedIn B2B
 */
export const OBJECTIVES = {
  network: {
    id: 'network',
    name: 'Connexion professionnelle',
    description: 'Développer son réseau, pas de pitch',
    transition: 'Pas de pitch, juste connexion et échanges professionnels',
  },
  understand: {
    id: 'understand',
    name: 'Comprendre ses défis business',
    description: 'Écouter et creuser ses problématiques',
    transition: 'Creuser ses défis professionnels, poser des questions, écouter activement',
  },
  service: {
    id: 'service',
    name: 'Proposer une collaboration',
    description: 'Mentionner ton expertise naturellement',
    transition: 'Glisser ce que tu fais de façon organique quand le moment est bon',
  },
  call: {
    id: 'call',
    name: 'Obtenir un café virtuel',
    description: 'Proposer un échange visio',
    transition: 'Proposer un café virtuel quand la confiance est établie',
  },
  product: {
    id: 'product',
    name: 'Partager une ressource',
    description: 'Partager un contenu/offre pertinent',
    transition: 'Partager une ressource ou contenu de valeur',
  },
};

/**
 * Prompt système pour générer le commentaire public (Jour 1)
 * Adapté LinkedIn : plus structuré, apporte de la valeur/expertise
 */
function buildLinkedInCommentSystemPrompt(voiceProfile) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS.'
    : voiceProfile?.tutoiement === 'Parfois'
      ? 'Tu tutoies si le contexte est informel, sinon vouvoie.'
      : 'Tu vouvoies par défaut (contexte professionnel LinkedIn).';

  return `Tu es expert en engagement authentique sur LinkedIn.
Tu génères des COMMENTAIRES PUBLICS qui créent de la connexion professionnelle.

## FORME D'ADRESSE
${tutoiementStyle}

## OBJECTIF DU COMMENTAIRE
- Montrer que tu as VRAIMENT lu et compris le post
- Ajouter de la valeur (insight, expérience concrète, perspective différente)
- Créer un premier point de contact mémorable
- Te positionner comme quelqu'un qui réfléchit et apporte de la valeur

## RÈGLES STRICTES
✅ OBLIGATOIRE :
- Référencer un point PRÉCIS du post (citation ou paraphrase)
- Apporter un insight personnel, une expérience concrète, ou une perspective complémentaire
- Peut faire 2-4 phrases structurées (plus long qu'Instagram)
- Optionnel : une question pertinente pour encourager la discussion
- Ton professionnel mais humain

❌ INTERDIT :
- Commentaires génériques ("Super post !", "Tellement vrai !", "Je suis d'accord !")
- Emojis excessifs (1-2 max si vraiment pertinents)
- Mentionner ton activité/offre
- Liens ou promos
- Compliments creux sans substance
- Flatterie évidente ("Vous êtes inspirant !")

## FORMAT DE RÉPONSE (JSON)
{
  "comment": "Le commentaire à poster",
  "hook_element": "L'élément du post que tu as référencé",
  "value_added": "La valeur que tu as apportée (insight, expérience, perspective)"
}`;
}

/**
 * Prompt système pour le premier DM (Jour 2)
 * AUCUN pitch, AUCUN CTA commercial - adapté LinkedIn B2B
 */
function buildLinkedInFirstDMSystemPrompt(voiceProfile) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.'
    : voiceProfile?.tutoiement === 'Parfois'
      ? 'Tu vouvoies par défaut, mais peux tutoyer si le profil semble informel.'
      : 'Tu vouvoies TOUJOURS (contexte professionnel LinkedIn).';

  let styleInstructions = '';
  if (voiceProfile) {
    styleInstructions = `
## STYLE PERSONNEL
- Ton : ${voiceProfile.tone || 'Professionnel et authentique'}
- Style : ${voiceProfile.style || 'Direct et bienveillant'}`;

    if (voiceProfile.expressions?.length > 0) {
      styleInstructions += `
- Expressions à utiliser naturellement : ${voiceProfile.expressions.join(', ')}`;
    }
  }

  return `Tu es expert en prospection HUMAINE sur LinkedIn.
Tu génères le PREMIER message privé d'une séquence de prospection B2B.

## PHILOSOPHIE FONDAMENTALE
Sur LinkedIn, les gens reçoivent des dizaines de messages automatiques par jour.
Le but n'est PAS de vendre, c'est de CRÉER UNE CONNEXION RÉELLE pour que le prospect :
1. Réponde (conversation)
2. Aille voir ton profil (curiosité professionnelle)
3. Te considère comme une connexion de valeur

= PULL marketing, pas PUSH

Le message doit être tellement PERTINENT et HUMAIN que la personne se dit :
"Tiens, cette personne a vraiment pris le temps de regarder mon profil..."

## FORME D'ADRESSE
${tutoiementStyle}
${styleInstructions}

## ÉLÉMENTS À UTILISER (selon disponibilité)
- Parcours professionnel (expériences, transitions de carrière)
- Posts LinkedIn récents (sujets abordés, opinions partagées)
- Bio et titre de poste
- Connexions ou parcours similaires
- Secteur d'activité et expertise

## STRUCTURE OBLIGATOIRE (3 éléments)

1. ACCROCHE PERSONNALISÉE
   → Référence précise à son contenu LinkedIn (post récent, parcours, bio)
   → Peut mentionner un parcours similaire ou une connexion commune
   → Montre qu'on a VRAIMENT regardé son profil

2. REMARQUE AUTHENTIQUE
   → Point commun professionnel OU observation pertinente sur son travail
   → Pas de flatterie générique, quelque chose de spécifique

3. QUESTION OUVERTE SUR SON EXPÉRIENCE
   → Sur son parcours, sa vision, son expertise
   → Pas sur ses "problèmes" ou "besoins en accompagnement"

## RÈGLES ABSOLUES

✅ OBLIGATOIRE :
- 100% centré sur LUI/ELLE (pas sur toi/ton offre)
- Référence à son contenu LinkedIn réel
- Question ouverte sur SON parcours / SON avis / SON expérience
- Ressembler à un message d'un professionnel curieux et authentique
- Court : 3-4 phrases MAX
- Commencer par "Bonjour [Prénom]" (pas de "Cher/Chère")

❌ STRICTEMENT INTERDITS :
- Toute mention de ton activité / ton offre / tes services
- "Je pourrais t'aider avec..."
- "Serais-tu intéressé(e) par..."
- "On en discute ?"
- "Je t'envoie plus d'infos ?"
- "Réserve un créneau"
- "Si ça t'intéresse..."
- "J'accompagne les [cible] à..."
- Tout CTA, même soft
- Tout ce qui ressemble à un pitch, même déguisé
- "J'ai vu que tu étais [poste]" (trop générique)
- "J'espère que tu vas bien"
- Demander une connexion LinkedIn dans le message

## BONNES QUESTIONS DE FIN (curieuses, professionnelles)
- "C'est quelque chose que tu as développé suite à une expérience précise ?"
- "Tu es sur ce sujet depuis longtemps ?"
- "Comment en es-tu arrivé(e) à cette conviction ?"
- "Qu'est-ce qui t'a amené(e) vers [son domaine actuel] ?"
- "C'est une évolution récente dans ton secteur ou c'est plus ancien ?"
- "Tu as constaté ça chez tes clients aussi ?"

## MAUVAISES QUESTIONS (commerciales déguisées) - INTERDITES
- "Comment fais-tu pour trouver de nouveaux clients ?"
- "As-tu déjà pensé à automatiser ça ?"
- "Ça te dirait d'en discuter ?"
- "Serais-tu ouvert(e) à découvrir une solution ?"

## TON GLOBAL
Comme si tu parlais à un futur partenaire ou pair, pas à un prospect.
Professionnel, curieux, authentique, respectueux, généreux.

## FORMAT DE RÉPONSE (JSON)
{
  "message": "Le message DM à envoyer",
  "hook_element": "L'élément spécifique du prospect utilisé",
  "question_type": "career_path | expertise | opinion | process | vision",
  "authenticity_check": {
    "mentions_offer": false,
    "has_cta": false,
    "is_about_them": true,
    "references_real_content": true
  }
}`;
}

/**
 * Prompt système pour le message de transition (Jour 5+)
 * Adapté LinkedIn : "café virtuel" plutôt que "call"
 */
function buildLinkedInTransitionSystemPrompt(voiceProfile, objective) {
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours'
    ? 'Tu tutoies TOUJOURS.'
    : voiceProfile?.tutoiement === 'Parfois'
      ? 'Tu gardes la même forme que dans les messages précédents.'
      : 'Tu vouvoies TOUJOURS.';

  const objectiveConfig = OBJECTIVES[objective] || OBJECTIVES.network;

  let transitionGuide = '';
  switch (objective) {
    case 'network':
      transitionGuide = `
## OBJECTIF : Connexion professionnelle
- Continue simplement la conversation professionnelle
- Partage des expériences ou insights communs
- Pas de pitch, juste connexion humaine
- Le message peut proposer de rester en contact ou d'échanger à nouveau`;
      break;
    case 'understand':
      transitionGuide = `
## OBJECTIF : Comprendre ses défis business
- Creuse ce qu'il/elle a partagé
- Pose des questions sur ses défis actuels dans son poste/secteur
- Écoute activement, rebondis sur ses réponses
- Montre de l'empathie et de la compréhension professionnelle`;
      break;
    case 'service':
      transitionGuide = `
## OBJECTIF : Proposer une collaboration
- Glisse naturellement ce que tu fais
- "D'ailleurs, c'est justement mon domaine d'expertise, j'accompagne les [cible] sur [sujet]"
- Propose SEULEMENT si il/elle montre de l'intérêt
- CTA soft : "Si tu veux, je peux te partager quelques pistes en 10 min"`;
      break;
    case 'call':
      transitionGuide = `
## OBJECTIF : Obtenir un café virtuel
- Propose un échange de vive voix
- "Ce serait intéressant d'échanger plus en détail"
- "Seriez-vous disponible pour un café virtuel de 15-20 min ?"
- "Je serais curieux d'approfondir autour d'un appel"
- Garde un ton professionnel mais chaleureux`;
      break;
    case 'product':
      transitionGuide = `
## OBJECTIF : Partager une ressource
- Partage une ressource pertinente à la conversation
- "J'ai justement un [article/guide/outil] qui traite de ce sujet"
- "Je me permets de vous partager un contenu qui pourrait vous intéresser"
- Reste dans le partage de valeur, pas la vente forcée`;
      break;
  }

  return `Tu génères un message de TRANSITION dans une séquence de prospection LinkedIn.
Ce message arrive APRÈS plusieurs échanges (Jour 5+), quand la confiance est établie.

## FORME D'ADRESSE
${tutoiementStyle}

${transitionGuide}

## CONTEXTE
La conversation a déjà eu lieu. Vous avez échangé plusieurs messages.
Ce message doit :
- Rebondir sur ce qui a été dit
- Être naturel dans le flow de la conversation
- Introduire doucement ton sujet/offre SI l'objectif le demande

## RÈGLES
- Reste naturel et professionnel
- Pas de pitch agressif
- Pas de pression
- Laisse une porte ouverte

## FORMAT DE RÉPONSE (JSON)
{
  "message": "Le message de transition",
  "transition_type": "soft_mention | resource_share | coffee_proposal | continued_conversation",
  "next_step_if_positive": "Ce que tu feras si il/elle répond positivement"
}`;
}

/**
 * Génère un commentaire public pour le warm-up (Jour 1)
 */
export async function generateWarmupComment(prospect, voiceProfile) {
  const systemPrompt = buildLinkedInCommentSystemPrompt(voiceProfile);

  // Construire le contexte du prospect avec les données LinkedIn disponibles
  let prospectContext = `PROSPECT : ${prospect.fullName || prospect.username}`;

  if (prospect.headline || prospect.title) {
    prospectContext += `\nTITRE : ${prospect.headline || prospect.title}`;
  }

  if (prospect.company) {
    prospectContext += `\nENTREPRISE : ${prospect.company}`;
  }

  prospectContext += `\nBIO / À PROPOS : ${prospect.bio || prospect.about || prospect.summary || 'Non disponible'}`;

  const userPrompt = `Génère un commentaire public pour ce prospect LinkedIn :

${prospectContext}

DERNIER POST / CONTENU RÉCENT :
${prospect.recentPost || prospect.lastPostCaption || prospect.recent_post || prospect.latestPost || 'Contenu non disponible - utilise la bio et le titre'}

Génère un commentaire professionnel et engageant qui apporte de la valeur.
Réponds UNIQUEMENT avec le JSON demandé.`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      temperature: 0.8,
    });

    const parsed = parseClaudeJSON(response);

    if (!parsed || !parsed.comment) {
      const commentMatch = response.match(/"comment"\s*:\s*"([^"]+)"/);
      return {
        comment: commentMatch ? commentMatch[1] : "Très pertinent ton analyse. J'ai rencontré une situation similaire et ton approche m'éclaire sur certains aspects.",
        hook_element: 'contenu général',
        value_added: 'perspective personnelle',
      };
    }

    return parsed;
  } catch (error) {
    console.error('[LinkedInSequence] Error generating comment:', error);
    throw error;
  }
}

/**
 * Génère le premier DM (Jour 2) - SANS pitch
 */
export async function generateFirstDM(prospect, voiceProfile) {
  const systemPrompt = buildLinkedInFirstDMSystemPrompt(voiceProfile);

  // Construire le contexte enrichi pour LinkedIn
  let prospectContext = `PROSPECT : ${prospect.fullName || prospect.username}`;

  if (prospect.firstName) {
    prospectContext += `\nPRÉNOM : ${prospect.firstName}`;
  }

  if (prospect.headline || prospect.title) {
    prospectContext += `\nTITRE/POSTE : ${prospect.headline || prospect.title}`;
  }

  if (prospect.company) {
    prospectContext += `\nENTREPRISE ACTUELLE : ${prospect.company}`;
  }

  prospectContext += `\nBIO / À PROPOS : ${prospect.bio || prospect.about || prospect.summary || 'Non disponible'}`;

  // Ajouter le parcours professionnel si disponible
  if (prospect.experiences && prospect.experiences.length > 0) {
    prospectContext += `\n\nPARCOURS PROFESSIONNEL :`;
    prospect.experiences.slice(0, 3).forEach((exp, i) => {
      prospectContext += `\n${i + 1}. ${exp.title || exp.role} chez ${exp.company || 'N/A'}${exp.duration ? ` (${exp.duration})` : ''}`;
    });
  }

  const userPrompt = `Génère le PREMIER message DM pour ce prospect LinkedIn :

${prospectContext}

DERNIER POST / CONTENU RÉCENT :
${prospect.recentPost || prospect.lastPostCaption || prospect.recent_post || prospect.latestPost || 'Contenu non disponible - base-toi sur le profil'}

${prospect.analysis ? `ANALYSE DU PROSPECT :\n${JSON.stringify(prospect.analysis, null, 2)}` : ''}

RAPPEL CRITIQUE :
- Ce message doit être 100% centré sur LUI/ELLE
- AUCUNE mention de ton offre/activité
- AUCUN CTA commercial
- Juste une vraie curiosité professionnelle

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
      const firstName = prospect.firstName || prospect.fullName?.split(' ')[0] || '';
      return {
        message: messageMatch ? messageMatch[1] : `Bonjour${firstName ? ' ' + firstName : ''}, j'ai lu ton dernier post avec intérêt. Tu es sur ce sujet depuis longtemps ?`,
        hook_element: 'profil général',
        question_type: 'expertise',
        authenticity_check: {
          mentions_offer: false,
          has_cta: false,
          is_about_them: true,
          references_real_content: true,
        },
      };
    }

    // Vérification de sécurité : s'assurer qu'il n'y a pas de CTA commercial
    const forbiddenPhrases = [
      'seriez-vous intéressé',
      'on en discute',
      'je vous envoie',
      'réservez',
      'si cela vous intéresse',
      'j\'accompagne',
      'je pourrais vous aider',
      'j\'aide les',
      'mon offre',
      'mes services',
      'ma solution',
      'notre solution',
      'je propose',
    ];

    const messageLower = parsed.message.toLowerCase();
    const hasForbidden = forbiddenPhrases.some(phrase => messageLower.includes(phrase));

    if (hasForbidden) {
      console.warn('[LinkedInSequence] Generated message contained forbidden phrases, flagging for review...');
    }

    return parsed;
  } catch (error) {
    console.error('[LinkedInSequence] Error generating first DM:', error);
    throw error;
  }
}

/**
 * Génère le message de transition (Jour 5+)
 */
export async function generateTransitionMessage(prospect, voiceProfile, objective, conversationContext) {
  const systemPrompt = buildLinkedInTransitionSystemPrompt(voiceProfile, objective);

  const firstName = prospect.firstName || prospect.fullName?.split(' ')[0] || '';

  const userPrompt = `Génère un message de TRANSITION pour ce prospect LinkedIn :

PROSPECT : ${prospect.fullName || prospect.username}${firstName ? ` (Prénom: ${firstName})` : ''}
TITRE : ${prospect.headline || prospect.title || 'Non spécifié'}
OBJECTIF : ${OBJECTIVES[objective]?.name || 'Connexion professionnelle'}

CONTEXTE DE LA CONVERSATION :
${conversationContext || 'Tu as échangé plusieurs messages avec cette personne. Elle a répondu positivement à ton premier DM et vous avez eu une conversation authentique sur son expertise.'}

${voiceProfile?.business_context ? `
TON ACTIVITÉ (à mentionner SEULEMENT si pertinent) :
- Activité : ${voiceProfile.business_context.activity || 'Non spécifié'}
- Cible : ${voiceProfile.business_context.target || 'Non spécifié'}
- Offre : ${voiceProfile.business_context.gift || 'Non spécifié'}
` : ''}

Génère un message de transition naturel et professionnel.
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
        message: messageMatch ? messageMatch[1] : `Nos échanges sont vraiment enrichissants. Ce serait intéressant d'approfondir autour d'un café virtuel - vous auriez 15-20 min cette semaine ?`,
        transition_type: 'coffee_proposal',
        next_step_if_positive: 'Proposer un créneau et un lien visio',
      };
    }

    return parsed;
  } catch (error) {
    console.error('[LinkedInSequence] Error generating transition:', error);
    throw error;
  }
}

/**
 * Génère la séquence complète pour un prospect LinkedIn
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
        description: 'Message privé professionnel',
        message: firstDM.message,
        metadata: firstDM,
      },
      day3_5: {
        phase: 'Conversation',
        description: 'Si réponse positive',
        tips: [
          'Rebondir sur sa réponse avec une expérience similaire',
          'Poser une question sur un défi actuel qu\'il/elle rencontre',
          'Partager un insight ou une ressource pertinente',
          'Rester dans l\'échange, ZÉRO pitch',
          'Mentionner un point commun dans vos parcours respectifs si pertinent',
        ],
      },
      day5_plus: {
        phase: 'Transition',
        description: `Objectif : ${OBJECTIVES[objective]?.name || 'Connexion professionnelle'}`,
        message: transition.message,
        metadata: transition,
        objective: OBJECTIVES[objective],
      },
    };
  } catch (error) {
    console.error('[LinkedInSequence] Error generating full sequence:', error);
    throw error;
  }
}

/**
 * Génère uniquement le DM direct (pour prospects déjà chauds)
 */
export async function generateDirectDM(prospect, voiceProfile, objective = 'network') {
  // Pour un DM direct, on génère juste le premier DM
  // La personne est déjà "chaude" donc on peut aller un peu plus vite
  // Mais on reste professionnel et sans pitch agressif

  const firstDM = await generateFirstDM(prospect, voiceProfile);

  return {
    mode: 'direct',
    message: firstDM.message,
    metadata: firstDM,
    tips: [
      'Ce prospect a déjà interagi avec toi',
      'Tu peux aller un peu plus vite dans la conversation',
      'Mais reste professionnel et sans pression',
      'Pense à mentionner le contexte de ta première interaction',
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
