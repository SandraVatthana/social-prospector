/**
 * Routes pour l'ICP (Ideal Customer Profile)
 * Social Prospector - ICP Extraction & Matching
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserICP,
  calculateICPScore,
  calculateICPScoresBatch,
  extractICPInsights,
  saveUserICP,
  updateProspectICPScore,
  getICPStats
} from '../services/icpService.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/icp/me
 * Récupère l'ICP de l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const icp = await getUserICP(req.user.id);
    res.json({
      success: true,
      icp
    });
  } catch (error) {
    console.error('[ICP] Error getting ICP:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/icp/me
 * Met à jour l'ICP de l'utilisateur
 */
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { icp } = req.body;

    if (!icp) {
      return res.status(400).json({ error: 'ICP data is required' });
    }

    await saveUserICP(req.user.id, icp);

    res.json({
      success: true,
      message: 'ICP mis à jour'
    });
  } catch (error) {
    console.error('[ICP] Error saving ICP:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/icp/score-prospect/:prospectId
 * Calcule le score ICP d'un prospect
 */
router.post('/score-prospect/:prospectId', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const userId = req.user.id;

    // Récupérer le prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', userId)
      .single();

    if (prospectError || !prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Récupérer l'ICP
    const icp = await getUserICP(userId);

    // Calculer le score
    const scoreData = await calculateICPScore(prospect, icp);

    // Sauvegarder le score
    await updateProspectICPScore(prospectId, scoreData);

    res.json({
      success: true,
      prospectId,
      score: scoreData
    });
  } catch (error) {
    console.error('[ICP] Error scoring prospect:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/icp/score-batch
 * Calcule les scores ICP pour plusieurs prospects
 */
router.post('/score-batch', requireAuth, async (req, res) => {
  try {
    const { prospectIds } = req.body;
    const userId = req.user.id;

    if (!prospectIds || !Array.isArray(prospectIds)) {
      return res.status(400).json({ error: 'prospectIds array is required' });
    }

    // Récupérer les prospects
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', userId)
      .in('id', prospectIds);

    if (prospectError) {
      throw new Error('Erreur récupération prospects');
    }

    // Récupérer l'ICP
    const icp = await getUserICP(userId);

    // Calculer les scores
    const results = await calculateICPScoresBatch(prospects, icp);

    // Sauvegarder les scores
    for (const result of results) {
      if (!result.error) {
        await updateProspectICPScore(result.prospectId, result);
      }
    }

    res.json({
      success: true,
      results,
      processed: results.length
    });
  } catch (error) {
    console.error('[ICP] Error batch scoring:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/icp/score-all
 * Calcule les scores ICP pour tous les prospects sans score
 */
router.post('/score-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.body;

    // Récupérer les prospects sans score ICP
    const { data: prospects, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('user_id', userId)
      .is('icp_score', null)
      .limit(limit);

    if (prospectError) {
      throw new Error('Erreur récupération prospects');
    }

    if (prospects.length === 0) {
      return res.json({
        success: true,
        message: 'Tous les prospects ont déjà un score ICP',
        processed: 0
      });
    }

    // Récupérer l'ICP
    const icp = await getUserICP(userId);

    // Calculer les scores
    const results = await calculateICPScoresBatch(prospects, icp);

    // Sauvegarder les scores
    let saved = 0;
    for (const result of results) {
      if (!result.error) {
        const success = await updateProspectICPScore(result.prospectId, result);
        if (success) saved++;
      }
    }

    res.json({
      success: true,
      processed: results.length,
      saved,
      remaining: prospects.length < limit ? 0 : 'more'
    });
  } catch (error) {
    console.error('[ICP] Error scoring all:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/icp/extract-insights
 * Extrait des insights ICP à partir des conversions
 */
router.post('/extract-insights', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const insights = await extractICPInsights(userId);

    res.json({
      success: true,
      ...insights
    });
  } catch (error) {
    console.error('[ICP] Error extracting insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/icp/apply-insights
 * Applique les insights extraits pour mettre à jour l'ICP
 */
router.post('/apply-insights', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { insights } = req.body;

    if (!insights || !insights.improvements) {
      return res.status(400).json({ error: 'Insights data is required' });
    }

    // Récupérer l'ICP actuel
    const currentICP = await getUserICP(userId);

    // Fusionner avec les améliorations
    const updatedICP = {
      ...currentICP,
      description: insights.improvements.description_refined || currentICP.description,
      keywords: [
        ...(currentICP.keywords || []),
        ...(insights.improvements.new_keywords || [])
      ].filter((v, i, a) => a.indexOf(v) === i), // Déduplique
      painPoints: insights.improvements.pain_points || currentICP.painPoints,
      demographics: {
        ...(currentICP.demographics || {}),
        ...(insights.improvements.demographics || {})
      },
      psychographics: {
        ...(currentICP.psychographics || {}),
        ...(insights.improvements.psychographics || {})
      },
      patterns: insights.patterns,
      scoringRecommendations: insights.scoringRecommendations,
      confidence: insights.confidence,
      lastInsightsApplied: new Date().toISOString()
    };

    await saveUserICP(userId, updatedICP);

    res.json({
      success: true,
      message: 'ICP mis à jour avec les insights',
      icp: updatedICP
    });
  } catch (error) {
    console.error('[ICP] Error applying insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/icp/unscored-count
 * Récupère le nombre de prospects sans score ICP
 */
router.get('/unscored-count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('icp_score', null);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      count: count || 0
    });
  } catch (error) {
    console.error('[ICP] Error getting unscored count:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/icp/stats
 * Récupère les statistiques ICP
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getICPStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[ICP] Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/icp/top-prospects
 * Récupère les meilleurs prospects selon le score ICP
 */
router.get('/top-prospects', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10, minScore = 60 } = req.query;

    const { data: prospects, error } = await supabase
      .from('prospects')
      .select('id, username, full_name, bio, platform, followers, engagement, avatar_url, icp_score, icp_recommendation, icp_personalization_hooks, status')
      .eq('user_id', userId)
      .gte('icp_score', parseInt(minScore))
      .not('status', 'eq', 'converted')
      .not('status', 'eq', 'not_interested')
      .order('icp_score', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      prospects,
      count: prospects.length
    });
  } catch (error) {
    console.error('[ICP] Error getting top prospects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/icp/recommendations
 * Récupère des recommandations d'actions basées sur l'ICP
 */
router.get('/recommendations', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Prospects à contacter en priorité (score élevé, pas encore contactés)
    const { data: priorityProspects } = await supabase
      .from('prospects')
      .select('id, username, full_name, icp_score, icp_recommendation, icp_personalization_hooks')
      .eq('user_id', userId)
      .eq('status', 'new')
      .gte('icp_score', 70)
      .order('icp_score', { ascending: false })
      .limit(5);

    // Prospects à éviter (score bas)
    const { data: lowScoreProspects } = await supabase
      .from('prospects')
      .select('id, username, full_name, icp_score')
      .eq('user_id', userId)
      .eq('status', 'new')
      .lt('icp_score', 40)
      .limit(5);

    // Stats globales
    const stats = await getICPStats(userId);

    res.json({
      success: true,
      recommendations: {
        priorityContacts: priorityProspects || [],
        lowPriorityContacts: lowScoreProspects || [],
        stats,
        tips: generateTips(stats)
      }
    });
  } catch (error) {
    console.error('[ICP] Error getting recommendations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Génère des conseils basés sur les stats
 */
function generateTips(stats) {
  const tips = [];

  if (stats.averageScore < 50) {
    tips.push({
      type: 'warning',
      message: 'Score ICP moyen bas - Affinez vos critères de recherche ou votre ICP'
    });
  }

  if (stats.conversionByScore.excellent?.conversionRate > stats.conversionByScore.average?.conversionRate) {
    tips.push({
      type: 'insight',
      message: `Les prospects "Excellent" convertissent ${stats.conversionByScore.excellent.conversionRate}% vs ${stats.conversionByScore.average.conversionRate}% pour les "Moyen" - Privilégiez les scores élevés`
    });
  }

  if (stats.byRecommendation.action_immediate > 0) {
    tips.push({
      type: 'action',
      message: `${stats.byRecommendation.action_immediate} prospect(s) à contacter en priorité`
    });
  }

  return tips;
}

export default router;
