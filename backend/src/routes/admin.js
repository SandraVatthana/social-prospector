import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

// Fallback admins (utilisé si la colonne is_admin n'existe pas encore en DB)
const FALLBACK_ADMIN_EMAILS = ['sandra@myinnerquest.fr', 'contact@myinnerquest.fr'];

/**
 * Middleware pour vérifier si l'utilisateur est admin
 * Vérifie d'abord la colonne is_admin en base, sinon utilise la liste de fallback
 */
async function requireAdmin(req, res, next) {
  if (!req.user?.id) {
    return res.status(403).json(formatError('Accès non autorisé', 'FORBIDDEN'));
  }

  try {
    // Vérifier le flag is_admin en base de données
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('is_admin, email')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(403).json(formatError('Accès non autorisé', 'FORBIDDEN'));
    }

    // Si is_admin est défini, l'utiliser
    if (user.is_admin === true) {
      return next();
    }

    // Sinon, fallback sur la liste d'emails (pour compatibilité)
    if (FALLBACK_ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      return next();
    }

    return res.status(403).json(formatError('Accès non autorisé', 'FORBIDDEN'));
  } catch (err) {
    return res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
}

/**
 * GET /api/admin/dashboard
 * Stats globales du dashboard admin
 */
router.get('/dashboard', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const today = new Date().toISOString().split('T')[0];

    // Nouveaux utilisateurs ce mois
    const { count: newUsersThisMonth } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth);

    // Utilisateurs payants
    const { count: payingUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('plan', 'free');

    // Opt-out en attente
    const { count: pendingOptOuts } = await supabaseAdmin
      .from('opt_out_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Alertes non lues
    const { count: unreadAlerts } = await supabaseAdmin
      .from('admin_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    // Prospects et messages aujourd'hui
    const { data: todayUsage } = await supabaseAdmin
      .from('daily_usage')
      .select('prospects_scraped, messages_generated')
      .eq('date', today);

    const prospectsToday = todayUsage?.reduce((acc, u) => acc + (u.prospects_scraped || 0), 0) || 0;
    const messagesToday = todayUsage?.reduce((acc, u) => acc + (u.messages_generated || 0), 0) || 0;

    res.json(formatResponse({
      new_users_this_month: newUsersThisMonth || 0,
      paying_users: payingUsers || 0,
      pending_opt_outs: pendingOptOuts || 0,
      unread_alerts: unreadAlerts || 0,
      prospects_today: prospectsToday,
      messages_today: messagesToday,
    }));
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * GET /api/admin/alerts
 * Liste des alertes admin
 */
router.get('/alerts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(formatResponse(data));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/admin/alerts/:id/read
 * Marquer une alerte comme lue
 */
router.post('/alerts/:id/read', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('admin_alerts')
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;

    res.json(formatResponse({ success: true }));
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * GET /api/admin/top-users
 * Top utilisateurs du mois
 */
router.get('/top-users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Récupérer les utilisateurs
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, plan');

    if (usersError) throw usersError;

    // Récupérer l'usage ce mois
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('daily_usage')
      .select('user_id, prospects_scraped, messages_generated')
      .gte('date', startOfMonth.split('T')[0]);

    if (usageError) throw usageError;

    // Agréger par utilisateur
    const usageByUser = {};
    usage?.forEach(u => {
      if (!usageByUser[u.user_id]) {
        usageByUser[u.user_id] = { prospects: 0, messages: 0 };
      }
      usageByUser[u.user_id].prospects += u.prospects_scraped || 0;
      usageByUser[u.user_id].messages += u.messages_generated || 0;
    });

    // Construire le résultat
    const result = users.map(user => {
      const userUsage = usageByUser[user.id] || { prospects: 0, messages: 0 };
      const limits = {
        free: 50,
        solo: 500,
        agence: 2000,
        agency_plus: 10000,
      };

      return {
        ...user,
        monthly_prospects: userUsage.prospects,
        monthly_messages: userUsage.messages,
        monthly_limit: limits[user.plan] || 50,
      };
    });

    // Trier par usage
    result.sort((a, b) => b.monthly_prospects - a.monthly_prospects);

    res.json(formatResponse(result.slice(0, 20)));
  } catch (error) {
    console.error('Error fetching top users:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * GET /api/admin/opt-out-requests
 * Liste des demandes opt-out
 */
router.get('/opt-out-requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('opt_out_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(formatResponse(data));
  } catch (error) {
    console.error('Error fetching opt-out requests:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/admin/opt-out/:id/process
 * Traiter une demande opt-out
 */
router.post('/opt-out/:id/process', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la demande
    const { data: request, error: requestError } = await supabaseAdmin
      .from('opt_out_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !request) {
      return res.status(404).json(formatError('Demande non trouvée', 'NOT_FOUND'));
    }

    // Si suppression demandée, anonymiser les prospects
    if (request.delete_existing) {
      const { error: anonymizeError } = await supabaseAdmin
        .from('prospects')
        .update({
          username: `anon_${request.username.substring(0, 4)}`,
          full_name: null,
          bio: null,
          avatar_url: null,
          profile_pic_url: null,
          email: null,
          website: null,
          is_anonymized: true,
        })
        .eq('platform', request.platform)
        .eq('username', request.username);

      if (anonymizeError) {
        console.error('Error anonymizing prospects:', anonymizeError);
      }
    }

    // Marquer comme traité
    const { error: updateError } = await supabaseAdmin
      .from('opt_out_requests')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: req.user.id,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // TODO: Envoyer email de confirmation si email fourni

    res.json(formatResponse({ success: true }, 'Demande traitée avec succès'));
  } catch (error) {
    console.error('Error processing opt-out:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * POST /api/admin/users/:id/suspend
 * Suspendre un utilisateur
 */
router.post('/users/:id/suspend', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        is_suspended: true,
        suspended_reason: reason || 'Violation des CGU',
        suspended_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    res.json(formatResponse({ success: true }, 'Utilisateur suspendu'));
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

export default router;
