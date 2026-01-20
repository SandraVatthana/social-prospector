/**
 * Service de génération de messages avec méthodes d'approche
 * Utilise Claude API pour créer des messages personnalisés
 */

import { callClaude, parseClaudeJSON } from './claude.js';

/**
 * Configuration des méthodes d'approche
 */
export const APPROACH_METHODS = {
  mini_aida: {
    id: 'mini_aida',
    name: 'Mini-AIDA',
    description: 'Accroche → Intérêt → Désir → Action',
    shortDescription: 'Structure classique et efficace',
    icon: 'Target',
    structure: [
      'A (Attention) : Accroche liée à un post / détail perso',
      'I (Interest) : Mini-histoire / constat',
      'D (Desire) : Résultat souhaité',
      'A (Action) : Question simple'
    ],
    template: `
Structure Mini-AIDA :
1. ATTENTION : Une phrase d'accroche qui mentionne un élément SPÉCIFIQUE du prospect (post récent, bio, détail perso)
2. INTÉRÊT : Une phrase qui pose un constat ou mini-histoire que le prospect peut reconnaître
3. DÉSIR : Une phrase sur le résultat possible/souhaité
4. ACTION : Une question ouverte simple (pas de "ça te dit ?", plutôt "tu veux que je te montre ?")

Exemple :
"J'ai vu ton post sur [sujet spécifique]. Beaucoup de [profil_cible] me disent qu'ils galèrent avec [problème]. Quand on ajuste juste [élément], leurs [résultat] deviennent beaucoup plus clairs. Tu veux que je te montre sur un exemple concret ?"
`
  },

  avant_apres: {
    id: 'avant_apres',
    name: 'Avant/Après',
    description: 'Situation → Déclic → Résultat',
    shortDescription: 'Montre la transformation possible',
    icon: 'ArrowRight',
    structure: [
      'Avant : Situation actuelle du prospect',
      'Déclic : Insight ou changement',
      'Après : Résultat possible',
      'Question : Proposition concrète'
    ],
    template: `
Structure Avant/Déclic/Après :
1. AVANT : Décris la situation actuelle du prospect (ce que tu vois dans son profil/posts) avec une force ET un point à améliorer
2. DÉCLIC : Un insight ou élément de changement simple
3. APRÈS : Le résultat possible une fois le déclic fait
4. QUESTION : Une proposition concrète liée à ton offre

Exemple :
"En lisant tes posts sur [sujet], on sent que tu as [force], mais [point_faible] reste un peu caché. Souvent, il suffit d'une [solution_simple] pour que les gens comprennent d'un coup. C'est ce que je fais avec [offre]. Ça te dirait que je te propose une version 'après' de [élément] ?"
`
  },

  miroir: {
    id: 'miroir',
    name: 'Miroir',
    description: 'Reformuler → Valider → Proposer',
    shortDescription: 'Empathie et validation',
    icon: 'Copy',
    structure: [
      'Miroir : Reformuler ce que la personne vit',
      'Validation : Montrer que c\'est normal/légitime',
      'Proposition : Aide concrète',
      'Question : Offre spécifique'
    ],
    template: `
Structure Miroir/Validation/Proposition :
1. MIROIR : Reformule ce que tu perçois de sa situation (ses défis, son quotidien)
2. VALIDATION : Montre que c'est normal, que tu comprends
3. PROPOSITION : Ce que tu fais pour aider des gens comme lui/elle
4. QUESTION : Une offre concrète

Exemple :
"On sent dans tes posts que tu portes beaucoup de choses entre [X] et [Y]. C'est normal que ce soit dur de [difficulté] sans se perdre. J'aide justement des [profil_cible] à [résultat]. Tu veux que je te propose [offre_concrète] ?"
`
  },

  story_seed: {
    id: 'story_seed',
    name: 'Story Seed',
    description: 'Micro-histoire → Lien → Question',
    shortDescription: 'Anecdote qui crée la connexion',
    icon: 'BookOpen',
    structure: [
      'Micro-histoire (2 phrases max)',
      'Lien avec son cas',
      'Question'
    ],
    template: `
Structure Story Seed (micro-anecdote) :
1. MICRO-HISTOIRE : Une anecdote courte (2 phrases max) sur un client/cas similaire
2. LIEN : Comment ça se rapporte à la situation du prospect
3. QUESTION : Une offre de partager quelque chose de concret

Exemple :
"Hier j'ai aidé une [profil_similaire] qui avait exactement le même blocage que toi sur [sujet]. On a juste [action_simple], et [résultat_positif]. Tu veux que je t'envoie [élément_concret] pour que tu voies ?"
`
  }
};

/**
 * Configuration des profils d'acheteurs (Eisenberg Brothers)
 * L'IA détecte automatiquement le profil probable et adapte le message
 */
export const BUYER_PROFILES = {
  competitive: {
    id: 'competitive',
    name: 'Compétitif',
    emoji: '🔴',
    description: 'Veut des résultats, vite, avec des preuves',
    signals: [
      'Bio avec chiffres, résultats, métriques',
      '"CEO", "Founder", "X en Y jours/mois"',
      'Posts orientés performance, succès, croissance',
      'Vocabulaire : scale, ROI, objectifs, résultats',
      'Peu d\'emojis, ton direct et professionnel'
    ],
    messaging: {
      tone: 'Direct, factuel, orienté résultats',
      do: [
        'Aller droit au but',
        'Mentionner des résultats concrets (chiffres si possible)',
        'Montrer que tu respectes son temps',
        'Poser une question précise et actionnable'
      ],
      avoid: [
        'Longs discours émotionnels',
        'Tournures vagues ou floues',
        'Trop de contexte avant d\'arriver au point',
        'Excès d\'emojis ou ton trop casual'
      ],
      example: 'J\'ai vu que tu as scalé à [X]. La plupart bloquent à [Y]. Tu as trouvé quoi comme levier ?'
    }
  },

  spontaneous: {
    id: 'spontaneous',
    name: 'Spontané',
    emoji: '🟡',
    description: 'Achète au coup de cœur, veut du fun et se projeter',
    signals: [
      'Beaucoup d\'emojis, ton enthousiaste',
      'Bio créative, originale, personnelle',
      'Posts lifestyle, voyage, expériences',
      'Vocabulaire : vibes, énergie, passion, kiff',
      'Photos colorées, esthétique soignée'
    ],
    messaging: {
      tone: 'Enthousiaste, léger, inspirant',
      do: [
        'Créer une connexion émotionnelle rapide',
        'Utiliser des emojis (avec modération)',
        'Parler de vision, de possibilités',
        'Montrer que ça peut être fun/excitant'
      ],
      avoid: [
        'Cadre trop rigide ou processus complexes',
        'Ton trop corporate ou froid',
        'Listes de contraintes',
        'Messages trop longs ou détaillés'
      ],
      example: 'Ton univers est canon ✨ J\'adore l\'énergie qui se dégage de [élément]. C\'est quoi qui t\'inspire le plus en ce moment ?'
    }
  },

  methodical: {
    id: 'methodical',
    name: 'Méthodique',
    emoji: '🔵',
    description: 'Vérifie tout, prend son temps, veut être sûr',
    signals: [
      'Bio détaillée, structurée, complète',
      'Certifications, diplômes, expertise affichée',
      'Posts éducatifs, how-to, processus',
      'Vocabulaire : méthode, étapes, analyse, stratégie',
      'Contenu long et approfondi'
    ],
    messaging: {
      tone: 'Posé, précis, respectueux de son processus',
      do: [
        'Être spécifique et factuel',
        'Montrer que tu as vraiment analysé son profil',
        'Laisser de l\'espace pour réfléchir',
        'Poser une question qui invite à l\'analyse'
      ],
      avoid: [
        'Urgence artificielle ("offre limitée")',
        'Promesses trop belles pour être vraies',
        'Pression ou relances agressives',
        'Généralités sans substance'
      ],
      example: 'J\'ai lu ton article sur [sujet]. Ta partie sur [détail précis] m\'a interpellé. Comment t\'en es arrivée à cette approche ?'
    }
  },

  humanist: {
    id: 'humanist',
    name: 'Humaniste',
    emoji: '🟢',
    description: 'Achète sur la confiance et l\'alignement de valeurs',
    signals: [
      'Valeurs affichées dans la bio (impact, mission)',
      'Posts sur la communauté, l\'entraide, le sens',
      'Vocabulaire : alignement, authentique, valeurs, impact',
      'Engagement fort avec sa communauté',
      'Ton bienveillant et inclusif'
    ],
    messaging: {
      tone: 'Chaleureux, authentique, orienté valeurs',
      do: [
        'Créer un lien humain sincère',
        'Montrer tes valeurs communes',
        'Être transparent et authentique',
        'Poser une question sur son "pourquoi"'
      ],
      avoid: [
        'Pression commerciale',
        'Environnement compétitif',
        'Ton transactionnel',
        'Focus uniquement sur les résultats business'
      ],
      example: 'Ce que tu partages sur [valeur/mission] résonne beaucoup avec moi. C\'est quoi qui t\'a amenée à te lancer là-dedans ?'
    }
  }
};

/**
 * Génère le prompt système pour la génération de message
 */
function buildSystemPrompt(voiceProfile, method) {
  // Déterminer le tutoiement
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours' ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.' :
                          voiceProfile?.tutoiement === 'Jamais' ? 'Tu vouvoies TOUJOURS, jamais de tutoiement.' :
                          'Tu tutoies par défaut (style Instagram/TikTok).';

  return `Tu es un expert en CONVERSATION AUTHENTIQUE sur les réseaux sociaux (Instagram/TikTok).

## TON RÔLE
Générer un PREMIER message qui ressemble à celui d'une vraie personne curieuse — PAS à un message de prospection.

## MINDSET ESSENTIEL
Imagine que tu découvres quelqu'un d'intéressant sur Instagram. Tu as vraiment regardé son profil, ses posts. Tu veux engager une conversation naturelle.
Ce n'est PAS un pitch. C'est une conversation humaine qui PEUT mener à quelque chose plus tard, mais pour l'instant tu veux juste connecter.

## FORME D'ADRESSE
${tutoiementStyle}

## STYLE ET TON À ADOPTER
${voiceProfile ? `
Voici le profil "MA VOIX" de l'expéditeur. Tu dois écrire EXACTEMENT comme cette personne :
- Ton : ${voiceProfile.tone || 'Professionnel mais accessible'}
- Style : ${voiceProfile.style || 'Direct et concis'}
- Mots-clés fréquents : ${voiceProfile.keywords?.join(', ') || 'Aucun spécifié'}
- Ce qu'il/elle offre : ${voiceProfile.offer || 'Non spécifié'}
- Son public cible : ${voiceProfile.target_audience || 'Non spécifié'}
- Sa proposition de valeur : ${voiceProfile.value_proposition || 'Non spécifié'}
` : 'Adopte un ton professionnel mais chaleureux, direct mais pas agressif.'}

## MÉTHODE D'APPROCHE : ${APPROACH_METHODS[method]?.name || 'Mini-AIDA'}
${APPROACH_METHODS[method]?.template || APPROACH_METHODS.mini_aida.template}

## DÉTECTION ÉMOTIONNELLE (CONDITIONNELLE)
UNIQUEMENT si l'offre de l'utilisateur aide directement avec des problématiques humaines/entrepreneuriales (coaching, consulting, accompagnement, formation mindset/productivité, thérapie, etc.) :

Analyse discrètement la bio et les posts du prospect pour détecter d'éventuels signaux :
- Charge mentale, fatigue, surmenage
- Syndrome de l'imposteur, doutes
- Solitude entrepreneuriale
- Perfectionnisme paralysant
- Dispersion, TDAH-like

Si tu détectes ces signaux ET que l'offre est pertinente pour y répondre :
- N'en fais JAMAIS mention explicite dans le message
- Intègre subtilement des formulations INCLUSIVES et BIENVEILLANTES :
  → "Beaucoup de [profil_cible] vivent ça..."
  → "Si tu te reconnais dans..."
  → "C'est normal de..."
- Le ton reste léger, jamais diagnostic ni jugement
- La personne doit se sentir comprise, pas "profilée"

Si l'offre n'a PAS de lien avec ces problématiques (produits physiques, services techniques sans lien humain, etc.) :
- IGNORE cette section
- Reste sur une approche factuelle basée sur les centres d'intérêt du prospect

## DÉTECTION DU PROFIL D'ACHETEUR (Méthode Eisenberg)
Analyse le profil et les posts du prospect pour identifier son profil d'acheteur probable, puis ADAPTE ton message en conséquence.

🔴 COMPÉTITIF - Signaux : chiffres dans la bio, "CEO/Founder", résultats affichés, ton direct, peu d'emojis
   → Message : Direct, factuel, va droit au but. Respecte son temps. Question précise et actionnable.
   → Évite : Longs discours, flou, trop d'émotions, tournures vagues.

🟡 SPONTANÉ - Signaux : beaucoup d'emojis, bio créative/fun, lifestyle, "vibes/énergie/passion"
   → Message : Enthousiaste, léger, connexion émotionnelle rapide. Emojis OK (avec modération).
   → Évite : Cadre rigide, ton froid/corporate, process complexes.

🔵 MÉTHODIQUE - Signaux : bio détaillée/structurée, certifications, posts éducatifs/how-to, contenu long
   → Message : Posé, précis, spécifique. Montre que tu as VRAIMENT analysé. Laisse-lui le temps.
   → Évite : Urgence artificielle, promesses trop belles, pression, généralités.

🟢 HUMANISTE - Signaux : valeurs/mission affichées, posts sur l'impact/communauté, ton bienveillant
   → Message : Chaleureux, authentique, orienté valeurs. Question sur son "pourquoi".
   → Évite : Pression, compétition, ton transactionnel, focus uniquement business.

IMPORTANT : Tu dois identifier LE profil dominant et adapter ton message. Ne mentionne JAMAIS le profil explicitement.

## RÈGLES STRICTES
1. Maximum 4 phrases (vraiment court !)
2. Termine par une question ouverte sur ELLE/LUI (pas sur ton offre)
3. Mentionne un élément SPÉCIFIQUE et PRÉCIS de son profil/post (prouve que tu as regardé)
4. Le message doit pouvoir être envoyé par quelqu'un qui n'a RIEN à vendre

INTERDIT (trop commercial/pushy):
❌ "J'adore ton contenu", "Ton profil est super" (générique)
❌ Commencer par "Hey" + emoji
❌ Points d'exclamation excessifs
❌ "Tu veux que je te montre ?", "Ça te dit qu'on en parle ?"
❌ "J'aide les X à...", "Je propose...", "Mon expertise..."
❌ Tout CTA qui pousse vers une action commerciale
❌ Pointer directement un signal émotionnel détecté

OBLIGATOIRE (naturel/humain):
✅ Référence à un VRAI détail spécifique (post, phrase de bio, projet)
✅ Curiosité sincère sur ce qu'ELLE fait, pas ce que TU fais
✅ Ton conversationnel comme un DM à une connaissance
✅ Question ouverte qui invite à partager son expérience

## FORMAT DE RÉPONSE (JSON STRICT)
{
  "message": "Le message généré ici",
  "approach_method": "${method}",
  "buyer_profile": "competitive | spontaneous | methodical | humanist",
  "buyer_profile_signals": ["signal 1 détecté", "signal 2 détecté"],
  "hook_type": "post_reference | story_reference | common_point | direct_offer | question | compliment",
  "variables_used": {
    "element_specifique": "ce que tu as utilisé du prospect",
    "probleme_identifie": "le pain point (si détecté)",
    "adaptation_profil": "comment tu as adapté le ton au profil détecté"
  }
}`;
}

/**
 * Génère le prompt utilisateur avec les infos du prospect
 */
function buildUserPrompt(prospect, voiceProfile) {
  return `## PROSPECT À CONTACTER
- Username : @${prospect.username}
- Plateforme : ${prospect.platform || 'Instagram'}
- Bio : ${prospect.bio || 'Non disponible'}
- Followers : ${prospect.followers_count || 'Non connu'}
- Catégorie détectée : ${prospect.category || 'Non catégorisé'}

## DERNIER POST/CONTENU
${prospect.recent_post || prospect.last_post_caption || 'Aucun post récent disponible'}

## ANALYSE IA DU PROSPECT
${prospect.ai_analysis || prospect.analysis || 'Pas d\'analyse disponible'}

## CE QUE TU PROPOSES (de MA VOIX)
${voiceProfile?.offer || voiceProfile?.value_proposition || 'Service de prospection personnalisée'}

## TA MISSION
1. Analyse le profil pour identifier le type d'acheteur (Compétitif/Spontané/Méthodique/Humaniste)
2. Adapte ton ton et ton approche à ce profil
3. Génère un message ultra-personnalisé qui donne envie de répondre

Réponds UNIQUEMENT avec le JSON demandé, rien d'autre.`;
}

/**
 * Génère un message de prospection personnalisé
 * @param {Object} prospect - Les données du prospect
 * @param {Object} voiceProfile - Le profil MA VOIX de l'utilisateur
 * @param {string} method - La méthode d'approche (mini_aida, avant_apres, miroir, story_seed)
 * @returns {Promise<Object>} - Le message généré avec métadonnées
 */
export async function generateMessage(prospect, voiceProfile, method = 'mini_aida') {
  // Valider la méthode
  if (!APPROACH_METHODS[method]) {
    method = 'mini_aida';
  }

  const systemPrompt = buildSystemPrompt(voiceProfile, method);
  const userPrompt = buildUserPrompt(prospect, voiceProfile);

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.8, // Un peu plus de créativité
    });

    const parsed = parseClaudeJSON(response);

    if (!parsed || !parsed.message) {
      // Fallback : essayer d'extraire juste le message
      const messageMatch = response.match(/"message"\s*:\s*"([^"]+)"/);
      if (messageMatch) {
        return {
          message: messageMatch[1],
          approach_method: method,
          hook_type: 'other',
          variables_used: {},
          raw_response: response,
        };
      }
      throw new Error('Failed to parse Claude response');
    }

    return {
      ...parsed,
      approach_method: method,
    };
  } catch (error) {
    console.error('Error generating message:', error);
    throw error;
  }
}

/**
 * Génère plusieurs versions du message avec différentes méthodes
 * @param {Object} prospect - Les données du prospect
 * @param {Object} voiceProfile - Le profil MA VOIX
 * @param {string[]} methods - Les méthodes à utiliser (default: toutes)
 * @returns {Promise<Object[]>} - Les messages générés
 */
export async function generateMultipleVersions(prospect, voiceProfile, methods = null) {
  const methodsToUse = methods || Object.keys(APPROACH_METHODS);

  const results = await Promise.all(
    methodsToUse.map(method =>
      generateMessage(prospect, voiceProfile, method)
        .catch(err => ({
          error: err.message,
          approach_method: method,
        }))
    )
  );

  return results;
}

/**
 * Obtient la méthode recommandée basée sur les stats (mock pour l'instant)
 * @param {Object} stats - Les statistiques de l'utilisateur par méthode
 * @returns {Object} - La recommandation
 */
export function getRecommendedMethod(stats = null) {
  if (!stats || Object.keys(stats).length === 0) {
    return {
      method: 'mini_aida',
      reason: 'Méthode recommandée pour débuter - structure claire et efficace',
      confidence: 'low',
    };
  }

  // Trouver la méthode avec le meilleur taux de réponse
  let bestMethod = 'mini_aida';
  let bestRate = 0;
  let totalMessages = 0;

  for (const [method, methodStats] of Object.entries(stats)) {
    if (methodStats.messages_sent >= 5) { // Minimum 5 messages pour être significatif
      const rate = methodStats.responses / methodStats.messages_sent;
      totalMessages += methodStats.messages_sent;
      if (rate > bestRate) {
        bestRate = rate;
        bestMethod = method;
      }
    }
  }

  if (totalMessages < 10) {
    return {
      method: 'mini_aida',
      reason: 'Pas assez de données - continue à tester différentes méthodes',
      confidence: 'low',
    };
  }

  return {
    method: bestMethod,
    reason: `Meilleur taux de réponse : ${(bestRate * 100).toFixed(1)}% sur ${stats[bestMethod].messages_sent} messages`,
    confidence: bestRate > 0.2 ? 'high' : 'medium',
    response_rate: bestRate,
  };
}

/**
 * Liste des méthodes disponibles pour le frontend
 */
export function getAvailableMethods() {
  return Object.values(APPROACH_METHODS).map(method => ({
    id: method.id,
    name: method.name,
    description: method.description,
    shortDescription: method.shortDescription,
    icon: method.icon,
    structure: method.structure,
  }));
}

/**
 * Liste des profils d'acheteurs (Eisenberg) pour le frontend
 */
export function getBuyerProfiles() {
  return Object.values(BUYER_PROFILES).map(profile => ({
    id: profile.id,
    name: profile.name,
    emoji: profile.emoji,
    description: profile.description,
    signals: profile.signals,
    messaging: profile.messaging,
  }));
}

export default {
  APPROACH_METHODS,
  BUYER_PROFILES,
  generateMessage,
  generateMultipleVersions,
  getRecommendedMethod,
  getAvailableMethods,
  getBuyerProfiles,
};
