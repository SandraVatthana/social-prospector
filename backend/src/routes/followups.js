import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

/**
 * GET /api/followups
 * Récupère les relances selon la période
 * ?period=today|overdue|upcoming|all
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('prospects')
      .select(`
        *,
        campaign_prospects(
          campaign:campaigns(id, name, message_templates)
        )
      `)
      .eq('user_id', req.user.id)
      .not('pipeline_status', 'in', '("converti","ignore")');

    if (period === 'today') {
      query = query.eq('next_action_date', todayStr);
    } else if (period === 'overdue') {
      query = query.lt('next_action_date', todayStr);
    } else if (period === 'upcoming') {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const nextWeekStr = nextWeek.toISOString().split('T')[0];
      query = query
        .gte('next_action_date', todayStr)
        .lte('next_action_date', nextWeekStr);
    } else if (period === 'all') {
      query = query.not('next_action_date', 'is', null);
    }

    const { data, error } = await query.order('next_action_date');

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    // Formater les données pour inclure les infos de campagne
    const followups = data?.map(prospect => {
      const campaignInfo = prospect.campaign_prospects?.[0]?.campaign;
      return {
        ...prospect,
        campaign: campaignInfo || null,
        campaign_prospects: undefined,
      };
    });

    res.json(formatResponse(followups || []));
  } catch (error) {
    console.error('[Followups] Error fetching:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * GET /api/followups/today
 * Alias pour les relances du jour
 */
router.get('/today', requireAuth, async (req, res) => {
  req.query.period = 'today';
  // Réutiliser la logique principale
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('prospects')
      .select(`
        *,
        campaign_prospects(
          campaign:campaigns(id, name, message_templates)
        )
      `)
      .eq('user_id', req.user.id)
      .eq('next_action_date', today)
      .not('pipeline_status', 'in', '("converti","ignore")');

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    const followups = data?.map(prospect => ({
      ...prospect,
      campaign: prospect.campaign_prospects?.[0]?.campaign || null,
      campaign_prospects: undefined,
    }));

    res.json(formatResponse(followups || []));
  } catch (error) {
    console.error('[Followups] Error fetching today:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * GET /api/followups/stats
 * Statistiques des relances
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    // Compter les relances par période
    const [todayResult, overdueResult, upcomingResult] = await Promise.all([
      supabaseAdmin
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .eq('next_action_date', todayStr)
        .not('pipeline_status', 'in', '("converti","ignore")'),
      supabaseAdmin
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .lt('next_action_date', todayStr)
        .not('pipeline_status', 'in', '("converti","ignore")'),
      supabaseAdmin
        .from('prospects')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id)
        .gt('next_action_date', todayStr)
        .lte('next_action_date', nextWeekStr)
        .not('pipeline_status', 'in', '("converti","ignore")'),
    ]);

    res.json(formatResponse({
      today: todayResult.count || 0,
      overdue: overdueResult.count || 0,
      upcoming: upcomingResult.count || 0,
    }));
  } catch (error) {
    console.error('[Followups] Error fetching stats:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

export default router;
