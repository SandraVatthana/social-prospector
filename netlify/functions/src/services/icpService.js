/**
 * Service d'Extraction et Matching ICP (Ideal Customer Profile)
 *
 * Analyse les prospects et les compare à l'ICP de l'utilisateur.
 * Extrait des insights des conversions réussies pour affiner l'ICP.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Récupère l'ICP de l'utilisateur depuis ses données d'onboarding
 */
export async function getUserICP(userId) {
  const { data: user, error } = await supabase
    .from('users')
    .select('onboarding_data, icp_data')
    .eq('id', userId)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  // Si l'utilisateur a un ICP personnalisé, l'utiliser
  if (user.icp_data) {
    return user.icp_data;
  }

  // Sinon, extraire l'ICP des données d'onboarding
  const onboarding = user.onboarding_data || {};

  return {
    description: onboarding.cible_description || '',
    genre: onboarding.cible_genre || 'tous',
    problemes: onboarding.cible_problemes || '',
    activite: onboarding.activite || '',
    proposition_valeur: onboarding.resultat_promis || '',
    secteur: onboarding.type_activite || '',
    // Champs calculés/enrichis (à remplir par l'IA)
    keywords: [],
    demographics: {},
    psychographics: {},
    behaviors: [],
    painPoints: [],
    goals: [],
    lastUpdated: null,
    confidence: 0
  };
}

/**
 * Calcule le score ICP d'un prospect par rapport à l'ICP de l'utilisateur
 * @param {object} prospect - Données du prospect
 * @param {object} icp - ICP de l'utilisateur
 * @returns {object} Score et détails
 */
export async function calculateICPScore(prospect, icp) {
  if (!prospect || !icp) {
    return { score: 50, confidence: 0, reasoning: 'Données insuffisantes' };
  }

  const prompt = `Tu es un expert en qualification de leads B2B/B2C. Analyse ce prospect et calcule son score de correspondance avec l'ICP (Ideal Customer Profile).

ICP DE L'UTILISATEUR :
- Description cible : ${icp.description || 'Non défini'}
- Genre cible : ${icp.genre || 'tous'}
- Problèmes résolus : ${icp.problemes || 'Non défini'}
- Secteur : ${icp.secteur || 'Non défini'}
- Proposition de valeur : ${icp.proposition_valeur || 'Non défini'}
${icp.keywords?.length ? `- Mots-clés ICP : ${icp.keywords.join(', ')}` : ''}
${icp.painPoints?.length ? `- Points de douleur : ${icp.painPoints.join(', ')}` : ''}

PROSPECT À ANALYSER :
- Username : ${prospect.username || 'Inconnu'}
- Nom complet : ${prospect.full_name || 'Inconnu'}
- Bio : ${prospect.bio || 'Pas de bio'}
- Plateforme : ${prospect.platform || 'instagram'}
- Followers : ${prospect.followers || 0}
- Engagement : ${prospect.engagement || 0}%
${prospect.recent_posts ? `- Posts récents : ${JSON.stringify(prospect.recent_posts).substring(0, 500)}` : ''}

ANALYSE ET SCORE :
Calcule un score de 0 à 100 basé sur :
1. Correspondance bio/description avec l'ICP (40%)
2. Secteur d'activité apparent (20%)
3. Taille d'audience pertinente (15%)
4. Engagement et activité (15%)
5. Signaux d'intérêt potentiel (10%)

RÉPONDS EN JSON UNIQUEMENT :
{
  "score": 0-100,
  "confidence": 0.0-1.0,
  "reasoning": "Explication courte",
  "matches": ["point fort 1", "point fort 2"],
  "gaps": ["point faible 1"],
  "recommendation": "action_immediate|nurturing|a_eviter|observer",
  "detected_sector": "secteur détecté ou null",
  "detected_pain_points": ["point de douleur détecté"],
  "personalization_hooks": ["angle de personnalisation 1", "angle 2"]
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text.trim();

    // Parser le JSON
    let parsed;
    try {
      let cleanText = responseText;
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      console.error('[ICP] Failed to parse JSON:', responseText);
      return {
        score: 50,
        confidence: 0.3,
        reasoning: 'Erreur de parsing',
        matches: [],
        gaps: [],
        recommendation: 'observer'
      };
    }

    return {
      score: parsed.score || 50,
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || '',
      matches: parsed.matches || [],
      gaps: parsed.gaps || [],
      recommendation: parsed.recommendation || 'observer',
      detectedSector: parsed.detected_sector,
      detectedPainPoints: parsed.detected_pain_points || [],
      personalizationHooks: parsed.personalization_hooks || [],
      analyzedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[ICP] API Error:', error);
    throw new Error('Erreur lors du calcul du score ICP: ' + error.message);
  }
}

/**
 * Calcule les scores ICP pour plusieurs prospects en batch
 */
export async function calculateICPScoresBatch(prospects, icp) {
  const results = [];

  // Traiter par lots de 3 pour éviter les rate limits
  for (let i = 0; i < prospects.length; i += 3) {
    const batch = prospects.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async (prospect) => {
        try {
          const score = await calculateICPScore(prospect, icp);
          return { prospectId: prospect.id, ...score };
        } catch (error) {
          return {
            prospectId: prospect.id,
            score: 50,
            confidence: 0,
            error: error.message
          };
        }
      })
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Extrait des insights ICP à partir des prospects convertis
 * @param {string} userId - ID de l'utilisateur
 * @returns {object} Insights et suggestions d'amélioration de l'ICP
 */
export async function extractICPInsights(userId) {
  // Récupérer les prospects convertis
  const { data: convertedProspects, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'converted')
    .limit(20);

  if (error) {
    throw new Error('Erreur récupération prospects: ' + error.message);
  }

  if (!convertedProspects || convertedProspects.length < 3) {
    return {
      success: false,
      message: 'Pas assez de conversions pour extraire des insights (minimum 3)',
      conversionsCount: convertedProspects?.length || 0
    };
  }

  // Récupérer l'ICP actuel
  const currentICP = await getUserICP(userId);

  const prospectsData = convertedProspects.map(p => ({
    username: p.username,
    fullName: p.full_name,
    bio: p.bio,
    platform: p.platform,
    followers: p.followers,
    engagement: p.engagement
  }));

  const prompt = `Tu es un expert en analyse de données clients et création d'ICP (Ideal Customer Profile).

Analyse ces ${convertedProspects.length} prospects qui ont été CONVERTIS (clients réels) et extrais des patterns communs pour affiner l'ICP.

ICP ACTUEL :
- Description cible : ${currentICP.description || 'Non défini'}
- Genre cible : ${currentICP.genre || 'tous'}
- Problèmes résolus : ${currentICP.problemes || 'Non défini'}
- Secteur : ${currentICP.secteur || 'Non défini'}

PROSPECTS CONVERTIS :
${JSON.stringify(prospectsData, null, 2)}

ANALYSE LES PATTERNS ET PROPOSE DES AMÉLIORATIONS.

RÉPONDS EN JSON UNIQUEMENT :
{
  "patterns_detected": {
    "common_keywords": ["mot1", "mot2"],
    "typical_follower_range": {"min": 1000, "max": 50000},
    "dominant_sectors": ["secteur1", "secteur2"],
    "common_pain_points": ["douleur1", "douleur2"],
    "typical_engagement": {"min": 1.0, "max": 5.0}
  },
  "icp_improvements": {
    "description_refined": "nouvelle description plus précise",
    "new_keywords": ["nouveau mot-clé 1", "nouveau mot-clé 2"],
    "pain_points": ["point de douleur identifié"],
    "demographics": {
      "typical_role": "rôle type",
      "experience_level": "débutant|intermédiaire|avancé",
      "business_size": "solo|petite|moyenne|grande"
    },
    "psychographics": {
      "motivations": ["motivation1"],
      "objections_frequentes": ["objection1"],
      "valeurs": ["valeur1"]
    }
  },
  "scoring_recommendations": {
    "prioritize": ["critère à prioriser"],
    "deprioritize": ["critère moins important"],
    "red_flags": ["signal négatif à éviter"]
  },
  "confidence": 0.0-1.0,
  "insights_summary": "Résumé en 2-3 phrases des insights principaux"
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const responseText = response.content[0].text.trim();

    let parsed;
    try {
      let cleanText = responseText;
      if (cleanText.startsWith('```json')) cleanText = cleanText.slice(7);
      if (cleanText.startsWith('```')) cleanText = cleanText.slice(3);
      if (cleanText.endsWith('```')) cleanText = cleanText.slice(0, -3);
      parsed = JSON.parse(cleanText.trim());
    } catch (e) {
      console.error('[ICP] Failed to parse insights JSON:', responseText);
      throw new Error('Erreur de parsing des insights');
    }

    return {
      success: true,
      conversionsCount: convertedProspects.length,
      patterns: parsed.patterns_detected,
      improvements: parsed.icp_improvements,
      scoringRecommendations: parsed.scoring_recommendations,
      confidence: parsed.confidence,
      summary: parsed.insights_summary,
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[ICP] Extraction error:', error);
    throw error;
  }
}

/**
 * Sauvegarde un ICP enrichi/mis à jour
 */
export async function saveUserICP(userId, icpData) {
  const { error } = await supabase
    .from('users')
    .update({
      icp_data: {
        ...icpData,
        lastUpdated: new Date().toISOString()
      }
    })
    .eq('id', userId);

  if (error) {
    throw new Error('Erreur sauvegarde ICP: ' + error.message);
  }

  return { success: true };
}

/**
 * Met à jour le score ICP d'un prospect dans la base
 */
export async function updateProspectICPScore(prospectId, scoreData) {
  const { error } = await supabase
    .from('prospects')
    .update({
      icp_score: scoreData.score,
      icp_score_confidence: scoreData.confidence,
      icp_score_reasoning: scoreData.reasoning,
      icp_matches: scoreData.matches,
      icp_gaps: scoreData.gaps,
      icp_recommendation: scoreData.recommendation,
      icp_personalization_hooks: scoreData.personalizationHooks,
      icp_scored_at: new Date().toISOString()
    })
    .eq('id', prospectId);

  if (error) {
    console.error('[ICP] Error updating prospect score:', error);
  }

  return !error;
}

/**
 * Obtient des statistiques ICP globales pour un utilisateur
 */
export async function getICPStats(userId) {
  const { data: prospects, error } = await supabase
    .from('prospects')
    .select('icp_score, icp_recommendation, status, response_category')
    .eq('user_id', userId)
    .not('icp_score', 'is', null);

  if (error) {
    throw new Error('Erreur récupération stats: ' + error.message);
  }

  const stats = {
    total: prospects.length,
    byScore: {
      excellent: 0, // 80-100
      good: 0,      // 60-79
      average: 0,   // 40-59
      low: 0        // 0-39
    },
    byRecommendation: {
      action_immediate: 0,
      nurturing: 0,
      observer: 0,
      a_eviter: 0
    },
    conversionByScore: {
      excellent: { total: 0, converted: 0 },
      good: { total: 0, converted: 0 },
      average: { total: 0, converted: 0 },
      low: { total: 0, converted: 0 }
    },
    averageScore: 0
  };

  let totalScore = 0;

  prospects.forEach(p => {
    const score = p.icp_score || 0;
    totalScore += score;

    // Classification par score
    let tier;
    if (score >= 80) {
      stats.byScore.excellent++;
      tier = 'excellent';
    } else if (score >= 60) {
      stats.byScore.good++;
      tier = 'good';
    } else if (score >= 40) {
      stats.byScore.average++;
      tier = 'average';
    } else {
      stats.byScore.low++;
      tier = 'low';
    }

    // Stats de conversion par tier
    stats.conversionByScore[tier].total++;
    if (p.status === 'converted') {
      stats.conversionByScore[tier].converted++;
    }

    // Par recommandation
    if (p.icp_recommendation && stats.byRecommendation[p.icp_recommendation] !== undefined) {
      stats.byRecommendation[p.icp_recommendation]++;
    }
  });

  stats.averageScore = prospects.length > 0 ? Math.round(totalScore / prospects.length) : 0;

  // Calculer les taux de conversion
  Object.keys(stats.conversionByScore).forEach(tier => {
    const data = stats.conversionByScore[tier];
    data.conversionRate = data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0;
  });

  return stats;
}

export default {
  getUserICP,
  calculateICPScore,
  calculateICPScoresBatch,
  extractICPInsights,
  saveUserICP,
  updateProspectICPScore,
  getICPStats
};
