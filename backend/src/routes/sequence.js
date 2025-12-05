/**
 * Routes pour la séquence de prospection Instagram
 * Philosophie : PULL marketing, messages 100% humains
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import {
  OBJECTIVES,
  generateWarmupComment,
  generateFirstDM,
  generateTransitionMessage,
  generateFullSequence,
  generateDirectDM,
} from '../services/instagramSequence.js';

const router = Router();

/**
 * GET /api/sequence/objectives
 * Liste les objectifs disponibles
 */
router.get('/objectives', (req, res) => {
  res.json(formatResponse({
    objectives: Object.values(OBJECTIVES),
  }));
});

/**
 * POST /api/sequence/generate
 * Génère une séquence complète de prospection
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prospect, objective = 'network', mode = 'full' } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Récupérer le profil vocal actif
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;

    let result;
    if (mode === 'direct') {
      // Mode DM direct (pour prospects déjà chauds)
      result = await generateDirectDM(prospect, profile, objective);
    } else {
      // Mode séquence complète
      result = await generateFullSequence(prospect, profile, objective);
    }

    res.json(formatResponse({
      sequence: result,
      mode,
      objective: OBJECTIVES[objective],
    }));
  } catch (error) {
    console.error('[Sequence] Error generating:', error);
    res.status(500).json(formatError('Erreur lors de la génération', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/sequence/comment
 * Génère uniquement le commentaire (Jour 1)
 */
router.post('/comment', requireAuth, async (req, res) => {
  try {
    const { prospect } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const comment = await generateWarmupComment(prospect, profile);

    res.json(formatResponse({ comment }));
  } catch (error) {
    console.error('[Sequence] Error generating comment:', error);
    res.status(500).json(formatError('Erreur lors de la génération du commentaire', 'COMMENT_ERROR'));
  }
});

/**
 * POST /api/sequence/first-dm
 * Génère uniquement le premier DM (Jour 2)
 */
router.post('/first-dm', requireAuth, async (req, res) => {
  try {
    const { prospect } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const dm = await generateFirstDM(prospect, profile);

    res.json(formatResponse({ dm }));
  } catch (error) {
    console.error('[Sequence] Error generating first DM:', error);
    res.status(500).json(formatError('Erreur lors de la génération du DM', 'DM_ERROR'));
  }
});

/**
 * POST /api/sequence/transition
 * Génère le message de transition (Jour 5+)
 */
router.post('/transition', requireAuth, async (req, res) => {
  try {
    const { prospect, objective = 'network', conversationContext } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const transition = await generateTransitionMessage(prospect, profile, objective, conversationContext);

    res.json(formatResponse({
      transition,
      objective: OBJECTIVES[objective],
    }));
  } catch (error) {
    console.error('[Sequence] Error generating transition:', error);
    res.status(500).json(formatError('Erreur lors de la génération de la transition', 'TRANSITION_ERROR'));
  }
});

/**
 * POST /api/sequence/regenerate
 * Régénère un élément spécifique de la séquence
 */
router.post('/regenerate', requireAuth, async (req, res) => {
  try {
    const { prospect, element, objective = 'network', conversationContext } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    if (!['comment', 'first-dm', 'transition'].includes(element)) {
      return res.status(400).json(formatError('Élément invalide', 'INVALID_ELEMENT'));
    }

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;

    let result;
    switch (element) {
      case 'comment':
        result = await generateWarmupComment(prospect, profile);
        break;
      case 'first-dm':
        result = await generateFirstDM(prospect, profile);
        break;
      case 'transition':
        result = await generateTransitionMessage(prospect, profile, objective, conversationContext);
        break;
    }

    res.json(formatResponse({ [element.replace('-', '_')]: result }));
  } catch (error) {
    console.error('[Sequence] Error regenerating:', error);
    res.status(500).json(formatError('Erreur lors de la régénération', 'REGENERATE_ERROR'));
  }
});

export default router;
