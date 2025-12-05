/**
 * Service de génération de suggestions de recherche basées sur le profil utilisateur
 * Génère des hashtags Instagram/TikTok et des mots-clés LinkedIn
 */

import { callClaude, parseClaudeJSON } from './claude.js';

/**
 * Prompt système pour générer des suggestions de recherche
 */
const SUGGESTIONS_SYSTEM_PROMPT = `Tu es un expert en prospection sur les réseaux sociaux.
Tu dois générer des suggestions de recherche ULTRA-PERTINENTES pour aider un utilisateur à trouver son client idéal.

RÈGLES IMPORTANTES :
- Hashtags Instagram : EXCLUSIVEMENT EN FRANÇAIS pour cibler les francophones (ex: #entrepreneuriatfeminin, #coachdeveloppementpersonnel, #formationenligne)
- Hashtags TikTok : EN FRANÇAIS, orientés tendances et communautés (ex: #entrepreneurfrancais, #coachingfr, #biznessfrench)
- LinkedIn : titres de poste réalistes EN FRANÇAIS, pas de jargon marketing
- Privilégie les hashtags de NICHE (moins de concurrence, plus ciblés)
- Évite les hashtags trop génériques (#business, #entrepreneur, #motivation) et les hashtags anglais
- Pense aux hashtags que le CLIENT IDÉAL FRANCOPHONE utiliserait, PAS ceux du user
- Pour chaque hashtag, explique brièvement sa pertinence
- TOUS les hashtags doivent être utilisés par la communauté francophone

FORMAT DE RÉPONSE (JSON uniquement, pas de texte avant ou après) :
{
  "instagram": {
    "hashtags": [
      {"tag": "#hashtag1", "pertinence": "Pourquoi ce hashtag est pertinent"},
      {"tag": "#hashtag2", "pertinence": "..."}
    ],
    "types_comptes": ["Type de compte à chercher 1", "Type 2"]
  },
  "tiktok": {
    "hashtags": [
      {"tag": "#hashtag1", "pertinence": "..."}
    ],
    "types_comptes": ["Type de compte à chercher 1"]
  },
  "linkedin": {
    "titres_poste": ["Titre 1", "Titre 2"],
    "secteurs": ["Secteur 1", "Secteur 2"],
    "hashtags": ["#hashtag1", "#hashtag2"],
    "mots_cles_recherche": ["Mot-clé 1", "Mot-clé 2"]
  }
}`;

/**
 * Mappe les données d'OnboardingProfond vers le format attendu
 * @param {Object} data - Données brutes de l'onboarding
 * @returns {Object} Données mappées
 */
function mapOnboardingData(data) {
  // Si les champs attendus existent déjà, utiliser directement
  if (data.metier && data.client_ideal) {
    return data;
  }

  // Sinon, mapper depuis le format OnboardingProfond
  const problemesMap = {
    'overwhelm': 'Trop de choses à gérer',
    'budget': 'Budget limité',
    'temps': 'Manque de temps',
    'savoir': 'Ne sait pas par où commencer',
    'technique': 'Bloqué par la technique',
    'visibilite': 'Manque de visibilité',
    'confiance': 'Manque de confiance',
    'strategie': 'Pas de stratégie claire',
  };

  const objectifsMap = {
    'clients': 'Trouver des clients',
    'collabs': 'Proposer des collaborations',
    'influenceurs': 'Contacter des influenceurs',
    'reseau': 'Développer mon réseau',
  };

  const typeActiviteMap = {
    'coach': 'Coach',
    'freelance': 'Freelance',
    'ecommerce': 'E-commerce',
    'formateur': 'Formateur',
    'creatif': 'Créatif',
    'agence': 'Agence',
  };

  // Construire les problèmes du client
  const problemes = (data.cible_problemes || [])
    .map(p => problemesMap[p] || p)
    .join(', ');

  return {
    metier: data.activite || data.metier || '',
    secteur_niche: typeActiviteMap[data.type_activite] || data.secteur_niche || '',
    offre_description: data.resultat_promis || data.offre_description || '',
    client_ideal: data.cible_description || data.client_ideal || '',
    probleme_client: problemes || data.probleme_client || '',
    zone_geo: data.zone_geo || 'France',
    objectif: objectifsMap[data.objectif_prospection] || data.objectif || '',
    plateformes: data.plateformes || ['Instagram', 'TikTok'],
  };
}

/**
 * Génère les suggestions de recherche pour toutes les plateformes
 * @param {Object} profile - Profil utilisateur de l'onboarding
 * @returns {Object} Suggestions pour Instagram, TikTok et LinkedIn
 */
export async function generateSearchSuggestions(profile) {
  // Mapper les données si nécessaire
  const mappedProfile = mapOnboardingData(profile);

  const {
    metier,
    secteur_niche,
    offre_description,
    client_ideal,
    probleme_client,
    zone_geo,
    objectif,
    plateformes,
  } = mappedProfile;

  const userPrompt = `Génère des suggestions de recherche pour ce profil :

PROFIL UTILISATEUR :
- Métier : ${metier}
- Secteur/Niche : ${secteur_niche}
- Offre : ${offre_description}
- Client idéal : ${client_ideal}
- Problème du client : ${probleme_client}
- Zone géographique : ${zone_geo || 'France'}
- Objectif : ${objectif}
- Plateformes utilisées : ${plateformes?.join(', ') || 'Instagram, TikTok'}

Génère entre 10 et 15 hashtags pertinents par plateforme.
Pour LinkedIn, génère au moins 5 titres de poste et 5 mots-clés de recherche.

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans aucun texte avant ou après.`;

  try {
    const response = await callClaude(SUGGESTIONS_SYSTEM_PROMPT, userPrompt, {
      max_tokens: 2000,
      temperature: 0.7,
    });

    const suggestions = parseClaudeJSON(response);

    if (!suggestions) {
      throw new Error('Impossible de parser les suggestions générées');
    }

    // Ajouter les métadonnées
    const timestamp = new Date().toISOString();

    return {
      instagram: {
        ...suggestions.instagram,
        generated_at: timestamp,
      },
      tiktok: {
        ...suggestions.tiktok,
        generated_at: timestamp,
      },
      linkedin: {
        ...suggestions.linkedin,
        generated_at: timestamp,
      },
    };
  } catch (error) {
    console.error('[SearchSuggestions] Error generating:', error);
    throw error;
  }
}

/**
 * Génère un message LinkedIn personnalisé sans scraping
 * L'utilisateur décrit manuellement le prospect
 * @param {Object} params - Paramètres
 * @returns {Object} Message généré avec métadonnées
 */
export async function generateLinkedInMessage(params) {
  const {
    prospectDescription,
    recentPost,
    objective,
    voiceProfile,
  } = params;

  const systemPrompt = `Tu es un expert en prospection LinkedIn.
Tu dois générer un message de connexion AUTHENTIQUE et HUMAIN.

RÈGLES :
- Message court (3-4 phrases max)
- AUCUN pitch commercial dans le premier message
- Commence par quelque chose de spécifique à la personne
- Pose UNE question ouverte qui invite à la discussion
- Ton naturel, comme si tu écrivais à quelqu'un que tu veux sincèrement connaître
- ${voiceProfile?.tutoiement ? 'TUTOIE la personne' : 'VOUVOIE la personne'}

OBJECTIF (à garder en tête mais PAS à mentionner) : ${objective || 'Créer une relation'}

FORMAT DE RÉPONSE (JSON) :
{
  "message": "Le message à envoyer",
  "hook_used": "L'accroche utilisée",
  "why_it_works": "Pourquoi ce message fonctionne"
}`;

  const userPrompt = `Génère un message LinkedIn pour ce prospect :

DESCRIPTION DU PROSPECT :
${prospectDescription}

${recentPost ? `CONTENU RÉCENT :
${recentPost}` : ''}

${voiceProfile ? `TON STYLE :
- Ton : ${voiceProfile.style_redaction?.ton || 'Naturel'}
- ${voiceProfile.tutoiement ? 'Tu tutoies' : 'Tu vouvoies'}` : ''}

Réponds UNIQUEMENT avec le JSON.`;

  try {
    const response = await callClaude(systemPrompt, userPrompt, {
      max_tokens: 500,
      temperature: 0.8,
    });

    const result = parseClaudeJSON(response);

    if (!result?.message) {
      throw new Error('Impossible de parser le message généré');
    }

    return result;
  } catch (error) {
    console.error('[LinkedInMessage] Error generating:', error);
    throw error;
  }
}

export default {
  generateSearchSuggestions,
  generateLinkedInMessage,
};
