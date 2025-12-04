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
 * Génère le prompt système pour la génération de message
 */
function buildSystemPrompt(voiceProfile, method) {
  // Déterminer le tutoiement
  const tutoiementStyle = voiceProfile?.tutoiement === 'Toujours' ? 'Tu tutoies TOUJOURS, jamais de vouvoiement.' :
                          voiceProfile?.tutoiement === 'Jamais' ? 'Tu vouvoies TOUJOURS, jamais de tutoiement.' :
                          'Tu tutoies par défaut (style Instagram/TikTok).';

  return `Tu es un expert en prospection personnalisée sur les réseaux sociaux (Instagram/TikTok).

## TON RÔLE
Générer un message de prospection court, authentique et personnalisé qui donne envie de répondre.

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

## RÈGLES STRICTES
1. Maximum 4 phrases (vraiment court !)
2. Termine TOUJOURS par une question ouverte
3. Mentionne un élément SPÉCIFIQUE du prospect (pas de générique)
4. INTERDIT : "j'adore ton contenu", "ton profil est super", phrases bateau
5. INTERDIT : Commencer par "Hey" + emoji (trop commercial)
6. Pas de points d'exclamation excessifs
7. Sois naturel comme dans une vraie conversation

## FORMAT DE RÉPONSE (JSON STRICT)
{
  "message": "Le message généré ici",
  "approach_method": "${method}",
  "hook_type": "post_reference | story_reference | common_point | direct_offer | question | compliment",
  "variables_used": {
    "element_specifique": "ce que tu as utilisé du prospect",
    "probleme_identifie": "le pain point",
    "solution_proposee": "ce que tu proposes"
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
Génère un message de prospection en utilisant la méthode indiquée. Le message doit être ultra-personnalisé et donner envie de répondre.

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

export default {
  APPROACH_METHODS,
  generateMessage,
  generateMultipleVersions,
  getRecommendedMethod,
  getAvailableMethods,
};
