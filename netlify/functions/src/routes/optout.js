import { Router } from 'express';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';

const router = Router();

/**
 * POST /api/opt-out
 * Soumettre une demande de suppression de données (public, pas d'auth)
 */
router.post('/', async (req, res) => {
  try {
    const { platform, username, email, reason, delete_existing, block_future } = req.body;

    // Validation
    if (!platform || !username) {
      return res.status(400).json(formatError(
        'Plateforme et nom d\'utilisateur requis',
        'VALIDATION_ERROR'
      ));
    }

    if (!['instagram', 'tiktok'].includes(platform.toLowerCase())) {
      return res.status(400).json(formatError(
        'Plateforme invalide',
        'VALIDATION_ERROR'
      ));
    }

    // Nettoyer le username
    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();

    if (!cleanUsername) {
      return res.status(400).json(formatError(
        'Nom d\'utilisateur invalide',
        'VALIDATION_ERROR'
      ));
    }

    // Vérifier si une demande existe déjà
    const { data: existingRequest } = await supabaseAdmin
      .from('opt_out_requests')
      .select('id, status')
      .eq('platform', platform.toLowerCase())
      .eq('username', cleanUsername)
      .single();

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.json(formatResponse(
          { already_exists: true },
          'Une demande est déjà en cours de traitement pour ce compte'
        ));
      }
      // Si déjà traité, permettre une nouvelle demande
    }

    // Créer la demande
    const { data, error } = await supabaseAdmin
      .from('opt_out_requests')
      .insert({
        platform: platform.toLowerCase(),
        username: cleanUsername,
        email: email || null,
        reason: reason || null,
        delete_existing: delete_existing !== false, // Par défaut true
        block_future: block_future !== false, // Par défaut true
        status: 'pending',
        requested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Créer une alerte admin
    await supabaseAdmin
      .from('admin_alerts')
      .insert({
        type: 'opt_out_request',
        severity: 'info',
        title: `Nouvelle demande opt-out: @${cleanUsername}`,
        message: `Plateforme: ${platform}${reason ? `, Raison: ${reason}` : ''}`,
        metadata: { request_id: data.id },
      });

    res.json(formatResponse(
      { request_id: data.id },
      'Votre demande a été enregistrée. Elle sera traitée sous 72 heures.'
    ));
  } catch (error) {
    console.error('Error creating opt-out request:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

/**
 * GET /api/opt-out/status/:platform/:username
 * Vérifier le statut d'une demande (public)
 */
router.get('/status/:platform/:username', async (req, res) => {
  try {
    const { platform, username } = req.params;
    const cleanUsername = username.replace(/^@/, '').toLowerCase().trim();

    const { data, error } = await supabaseAdmin
      .from('opt_out_requests')
      .select('status, requested_at, processed_at')
      .eq('platform', platform.toLowerCase())
      .eq('username', cleanUsername)
      .order('requested_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.json(formatResponse(
        { found: false },
        'Aucune demande trouvée pour ce compte'
      ));
    }

    res.json(formatResponse({
      found: true,
      status: data.status,
      requested_at: data.requested_at,
      processed_at: data.processed_at,
    }));
  } catch (error) {
    console.error('Error checking opt-out status:', error);
    res.status(500).json(formatError('Erreur serveur', 'SERVER_ERROR'));
  }
});

export default router;
