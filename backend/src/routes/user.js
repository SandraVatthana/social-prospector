import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

/**
 * GET /api/user/profile
 * Récupère le profil de l'utilisateur
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, avatar_url, plan, created_at, onboarding_completed, monthly_goal_responses, monthly_goal_meetings')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json(formatResponse(user));
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du profil', 'PROFILE_ERROR'));
  }
});

/**
 * PATCH /api/user/profile
 * Met à jour le profil
 */
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const {
      full_name,
      avatar_url,
      onboarding_completed,
      onboarding_data,
      monthly_goal_responses,
      monthly_goal_meetings
    } = req.body;

    const updates = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
    if (onboarding_data !== undefined) updates.onboarding_data = onboarding_data;
    // Objectifs mensuels
    if (monthly_goal_responses !== undefined) updates.monthly_goal_responses = monthly_goal_responses;
    if (monthly_goal_meetings !== undefined) updates.monthly_goal_meetings = monthly_goal_meetings;

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(data, 'Profil mis à jour'));
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
  }
});

/**
 * GET /api/user/export
 * Exporte toutes les données de l'utilisateur (RGPD)
 */
router.get('/export', requireAuth, async (req, res) => {
  try {
    // Récupérer toutes les données de l'utilisateur
    const [
      { data: profile },
      { data: voiceProfiles },
      { data: socialAccounts },
      { data: searches },
      { data: prospects },
      { data: messages },
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('id', req.user.id).single(),
      supabaseAdmin.from('voice_profiles').select('*').eq('user_id', req.user.id),
      supabaseAdmin.from('social_accounts').select('*').eq('user_id', req.user.id),
      supabaseAdmin.from('searches').select('*').eq('user_id', req.user.id),
      supabaseAdmin.from('prospects').select('*').eq('user_id', req.user.id),
      supabaseAdmin.from('messages').select('*').eq('user_id', req.user.id),
    ]);

    // Supprimer les données sensibles
    if (profile) {
      delete profile.subscription_id;
      delete profile.lemon_customer_id;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      profile,
      voice_profiles: voiceProfiles || [],
      social_accounts: socialAccounts || [],
      searches: searches || [],
      prospects: prospects || [],
      messages: messages || [],
    };

    res.json(formatResponse(exportData));
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json(formatError('Erreur lors de l\'export', 'EXPORT_ERROR'));
  }
});

/**
 * DELETE /api/user/account
 * Supprime le compte et toutes les données
 */
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Supprimer dans l'ordre (foreign keys)
    await supabaseAdmin.from('messages').delete().eq('user_id', userId);
    await supabaseAdmin.from('prospects').delete().eq('user_id', userId);
    await supabaseAdmin.from('searches').delete().eq('user_id', userId);
    await supabaseAdmin.from('voice_profiles').delete().eq('user_id', userId);
    await supabaseAdmin.from('social_accounts').delete().eq('user_id', userId);
    await supabaseAdmin.from('analytics_daily').delete().eq('user_id', userId);
    
    // Supprimer l'utilisateur
    await supabaseAdmin.from('users').delete().eq('id', userId);
    
    // Supprimer de Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(userId);

    res.json(formatResponse({ deleted: true }, 'Compte supprimé'));
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json(formatError('Erreur lors de la suppression', 'DELETE_ERROR'));
  }
});

/**
 * POST /api/user/onboarding
 * Sauvegarde les données d'onboarding
 */
router.post('/onboarding', requireAuth, async (req, res) => {
  try {
    const { data: onboardingData, skipped } = req.body;

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        onboarding_completed: !skipped,
        onboarding_data: onboardingData || null,
      })
      .eq('id', req.user.id);

    if (error) throw error;

    res.json(formatResponse({ saved: true }));
  } catch (error) {
    console.error('Error saving onboarding:', error);
    res.status(500).json(formatError('Erreur lors de la sauvegarde', 'ONBOARDING_ERROR'));
  }
});

export default router;
