import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

/**
 * GET /api/campaigns
 * Liste des campagnes de l'utilisateur
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select(`
        *,
        campaign_prospects(count)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    // Transformer pour inclure le compte de prospects
    const campaigns = data?.map(campaign => ({
      ...campaign,
      prospect_count: campaign.campaign_prospects?.[0]?.count || 0,
    }));

    res.json(formatResponse(campaigns));
  } catch (error) {
    console.error('[Campaigns] Error fetching:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * POST /api/campaigns
 * Créer une nouvelle campagne
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, target_description, message_templates, status } = req.body;

    if (!name) {
      return res.status(400).json(formatError('Le nom est requis'));
    }

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: req.user.id,
        name,
        target_description: target_description || null,
        message_templates: message_templates || {
          accroche: '',
          relance_j3: '',
          relance_j7: '',
          relance_j14: '',
        },
        status: status || 'draft',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    res.json(formatResponse(data, 'Campagne créée'));
  } catch (error) {
    console.error('[Campaigns] Error creating:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * GET /api/campaigns/:id
 * Détail d'une campagne avec ses prospects
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Récupérer la campagne
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    // Récupérer les prospects de la campagne
    const { data: campaignProspects } = await supabaseAdmin
      .from('campaign_prospects')
      .select(`
        *,
        prospect:prospects(*)
      `)
      .eq('campaign_id', id);

    // Calculer les stats par statut
    const stats = {};
    campaignProspects?.forEach(cp => {
      const status = cp.prospect?.pipeline_status || 'demande_envoyee';
      stats[status] = (stats[status] || 0) + 1;
    });

    res.json(formatResponse({
      ...campaign,
      prospects: campaignProspects || [],
      stats,
    }));
  } catch (error) {
    console.error('[Campaigns] Error fetching detail:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * PUT /api/campaigns/:id
 * Modifier une campagne
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_description, message_templates, status } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (target_description !== undefined) updateData.target_description = target_description;
    if (message_templates !== undefined) updateData.message_templates = message_templates;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    if (!data) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    res.json(formatResponse(data, 'Campagne mise à jour'));
  } catch (error) {
    console.error('[Campaigns] Error updating:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * DELETE /api/campaigns/:id
 * Supprimer une campagne
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    res.json(formatResponse({ deleted: true }, 'Campagne supprimée'));
  } catch (error) {
    console.error('[Campaigns] Error deleting:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * POST /api/campaigns/:id/prospects
 * Assigner des prospects à une campagne
 */
router.post('/:id/prospects', requireAuth, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { prospect_ids } = req.body;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (!campaign) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return res.status(400).json(formatError('prospect_ids requis'));
    }

    // Vérifier que les prospects appartiennent à l'utilisateur
    const { data: validProspects } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('user_id', req.user.id)
      .in('id', prospect_ids);

    if (!validProspects || validProspects.length === 0) {
      return res.status(400).json(formatError('Aucun prospect valide'));
    }

    const validProspectIds = validProspects.map(p => p.id);

    // Créer les assignations
    const assignments = validProspectIds.map(prospect_id => ({
      campaign_id: campaignId,
      prospect_id,
      stage: 'assigned',
    }));

    const { data, error } = await supabaseAdmin
      .from('campaign_prospects')
      .upsert(assignments, { onConflict: 'campaign_id,prospect_id' })
      .select();

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    res.json(formatResponse(data, `${data?.length || 0} prospect(s) assigné(s)`));
  } catch (error) {
    console.error('[Campaigns] Error assigning prospects:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * DELETE /api/campaigns/:id/prospects
 * Retirer des prospects d'une campagne
 */
router.delete('/:id/prospects', requireAuth, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { prospect_ids } = req.body;

    // Vérifier que la campagne appartient à l'utilisateur
    const { data: campaign } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', req.user.id)
      .single();

    if (!campaign) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    if (!prospect_ids || !Array.isArray(prospect_ids) || prospect_ids.length === 0) {
      return res.status(400).json(formatError('prospect_ids requis'));
    }

    const { error } = await supabaseAdmin
      .from('campaign_prospects')
      .delete()
      .eq('campaign_id', campaignId)
      .in('prospect_id', prospect_ids);

    if (error) {
      return res.status(500).json(formatError(error.message));
    }

    res.json(formatResponse({ removed: true }, 'Prospect(s) retiré(s)'));
  } catch (error) {
    console.error('[Campaigns] Error removing prospects:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

// ============================================
// CAMPAIGN VOICE PROFILES (Agency Mode)
// ============================================

/**
 * GET /api/campaigns/:id/voice
 * Get voice profile for a campaign
 */
router.get('/:id/voice', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    // Get voice profile
    const { data, error } = await supabaseAdmin
      .from('campaign_voice_profiles')
      .select('*')
      .eq('campaign_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json(formatResponse(data || null));

  } catch (error) {
    console.error('[Campaigns] Error fetching voice profile:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

/**
 * POST /api/campaigns/:id/voice
 * Create or update voice profile for a campaign
 */
router.post('/:id/voice', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const voiceData = req.body;

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json(formatError('Campagne non trouvée'));
    }

    // Upsert voice profile
    const { data, error } = await supabaseAdmin
      .from('campaign_voice_profiles')
      .upsert({
        campaign_id: id,
        user_id: userId,
        client_name: voiceData.client_name || null,
        industry: voiceData.industry || null,
        expertise: voiceData.expertise || null,
        tone: voiceData.tone || 'professionnel mais accessible',
        style_notes: voiceData.style_notes || null,
        sample_intro: voiceData.sample_intro || null,
        sample_dm: voiceData.sample_dm || null,
        sample_comment: voiceData.sample_comment || null,
        keywords: voiceData.keywords || [],
        avoid_words: voiceData.avoid_words || [],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'campaign_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(formatResponse(data, 'Profil de voix sauvegardé'));

  } catch (error) {
    console.error('[Campaigns] Error saving voice profile:', error);
    res.status(500).json(formatError('Erreur serveur'));
  }
});

export default router;
