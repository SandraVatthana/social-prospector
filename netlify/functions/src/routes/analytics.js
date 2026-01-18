import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import analyticsService from '../services/analytics.js';

const router = Router();

/**
 * GET /api/analytics
 * Stats globales de l'utilisateur
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const stats = await analyticsService.getGlobalStats(req.user.id);
    res.json(formatResponse(stats));
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des analytics', 'ANALYTICS_ERROR'));
  }
});

/**
 * GET /api/analytics/evolution
 * Évolution dans le temps
 */
router.get('/evolution', requireAuth, async (req, res) => {
  try {
    const { periode = '30d' } = req.query;
    
    if (!['7d', '30d', '90d'].includes(periode)) {
      return res.status(400).json(formatError('Période invalide (7d, 30d, 90d)', 'VALIDATION_ERROR'));
    }

    const evolution = await analyticsService.getEvolution(req.user.id, periode);
    res.json(formatResponse(evolution));
  } catch (error) {
    console.error('Error fetching evolution:', error);
    res.status(500).json(formatError('Erreur lors de la récupération de l\'évolution', 'ANALYTICS_ERROR'));
  }
});

/**
 * GET /api/analytics/hooks
 * Meilleurs hooks par taux de réponse
 */
router.get('/hooks', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const hooks = await analyticsService.getTopHooks(req.user.id, parseInt(limit));
    res.json(formatResponse(hooks));
  } catch (error) {
    console.error('Error fetching hooks:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des hooks', 'ANALYTICS_ERROR'));
  }
});

/**
 * GET /api/analytics/searches
 * Stats par recherche
 */
router.get('/searches', requireAuth, async (req, res) => {
  try {
    const stats = await analyticsService.getStatsBySearch(req.user.id);
    res.json(formatResponse(stats));
  } catch (error) {
    console.error('Error fetching search stats:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des stats par recherche', 'ANALYTICS_ERROR'));
  }
});

/**
 * GET /api/analytics/platforms
 * Stats par plateforme
 */
router.get('/platforms', requireAuth, async (req, res) => {
  try {
    const stats = await analyticsService.getStatsByPlatform(req.user.id);
    res.json(formatResponse(stats));
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des stats par plateforme', 'ANALYTICS_ERROR'));
  }
});

/**
 * POST /api/analytics/snapshot
 * Sauvegarde manuelle des stats du jour (utile pour debug)
 */
router.post('/snapshot', requireAuth, async (req, res) => {
  try {
    const result = await analyticsService.saveDailyStats(req.user.id);
    res.json(formatResponse(result, 'Snapshot enregistré'));
  } catch (error) {
    console.error('Error saving snapshot:', error);
    res.status(500).json(formatError('Erreur lors de la sauvegarde', 'ANALYTICS_ERROR'));
  }
});

export default router;
