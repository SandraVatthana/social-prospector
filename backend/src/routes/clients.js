import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireAgencyPlan, canAddClient } from '../middleware/plans.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

/**
 * GET /api/clients
 * Liste des clients de l'agence
 */
router.get('/', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { data: clients, error } = await supabaseAdmin
      .from('agency_clients')
      .select(`
        *,
        voice_profile:voice_profiles(id, nom, is_active)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json(formatResponse(clients || []));
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des clients', 'FETCH_ERROR'));
  }
});

/**
 * GET /api/clients/:id
 * Détail d'un client
 */
router.get('/:id', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: client, error } = await supabaseAdmin
      .from('agency_clients')
      .select(`
        *,
        voice_profile:voice_profiles(*),
        prospects:prospects(count),
        messages:messages(count)
      `)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json(formatError('Client non trouvé', 'NOT_FOUND'));
      }
      throw error;
    }

    res.json(formatResponse(client));
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du client', 'FETCH_ERROR'));
  }
});

/**
 * POST /api/clients
 * Créer un nouveau client
 */
router.post('/', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { name, onboarding_data, voice_profile } = req.body;

    // Validation
    if (!name?.trim()) {
      return res.status(400).json(formatError('Le nom du client est requis', 'NAME_REQUIRED'));
    }

    // Vérifier la limite
    const canAdd = await canAddClient(supabaseAdmin, req.user.id, req.user.plan);
    if (!canAdd.allowed) {
      return res.status(403).json(formatError(canAdd.reason, 'LIMIT_REACHED'));
    }

    // Créer le client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('agency_clients')
      .insert({
        user_id: req.user.id,
        name: name.trim(),
        onboarding_data,
        status: voice_profile ? 'active' : 'pending',
      })
      .select()
      .single();

    if (clientError) throw clientError;

    // Si un profil vocal est fourni, le créer (sans description - colonne n'existe pas)
    if (voice_profile) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('voice_profiles')
        .insert({
          user_id: req.user.id,
          client_id: client.id,
          nom: voice_profile.nom || `MA VOIX — ${name}`,
          profil_json: voice_profile,
          is_active: true,
          source: 'onboarding',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating voice profile:', profileError);
      } else {
        // Mettre à jour le client avec le voice_profile_id
        await supabaseAdmin
          .from('agency_clients')
          .update({ voice_profile_id: profile.id })
          .eq('id', client.id);

        client.voice_profile_id = profile.id;
        client.voice_profile = profile;
      }
    }

    res.status(201).json(formatResponse(client, 'Client créé avec succès'));
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json(formatError('Erreur lors de la création du client', 'CREATE_ERROR'));
  }
});

/**
 * PATCH /api/clients/:id
 * Mettre à jour un client
 */
router.patch('/:id', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logo_url, onboarding_data, status } = req.body;

    // Vérifier que le client appartient à l'utilisateur
    const { data: existingClient } = await supabaseAdmin
      .from('agency_clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingClient) {
      return res.status(404).json(formatError('Client non trouvé', 'NOT_FOUND'));
    }

    // Construire les updates
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (onboarding_data !== undefined) updates.onboarding_data = onboarding_data;
    if (status !== undefined) updates.status = status;

    const { data: client, error } = await supabaseAdmin
      .from('agency_clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(client, 'Client mis à jour'));
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
  }
});

/**
 * DELETE /api/clients/:id
 * Supprimer un client (cascade sur prospects, messages, voice_profile)
 */
router.delete('/:id', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le client appartient à l'utilisateur
    const { data: existingClient } = await supabaseAdmin
      .from('agency_clients')
      .select('id, voice_profile_id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!existingClient) {
      return res.status(404).json(formatError('Client non trouvé', 'NOT_FOUND'));
    }

    // Supprimer le client (cascade sur prospects et messages via FK)
    const { error } = await supabaseAdmin
      .from('agency_clients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json(formatResponse(null, 'Client supprimé avec succès'));
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json(formatError('Erreur lors de la suppression', 'DELETE_ERROR'));
  }
});

/**
 * GET /api/clients/:id/stats
 * Statistiques d'un client
 */
router.get('/:id/stats', requireAuth, requireAgencyPlan, async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le client appartient à l'utilisateur
    const { data: client } = await supabaseAdmin
      .from('agency_clients')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!client) {
      return res.status(404).json(formatError('Client non trouvé', 'NOT_FOUND'));
    }

    // Compter prospects
    const { count: prospectsCount } = await supabaseAdmin
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);

    // Compter messages
    const { count: messagesCount } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', id);

    // Messages par statut
    const { data: messagesByStatus } = await supabaseAdmin
      .from('messages')
      .select('status')
      .eq('client_id', id);

    const statusCounts = (messagesByStatus || []).reduce((acc, msg) => {
      acc[msg.status] = (acc[msg.status] || 0) + 1;
      return acc;
    }, {});

    res.json(formatResponse({
      prospects: prospectsCount || 0,
      messages: messagesCount || 0,
      messagesByStatus: statusCounts,
    }));
  } catch (error) {
    console.error('Error fetching client stats:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des stats', 'FETCH_ERROR'));
  }
});

export default router;
