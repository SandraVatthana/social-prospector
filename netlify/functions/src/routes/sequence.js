/**
 * Routes pour la séquence de prospection (Instagram, TikTok, LinkedIn)
 * Philosophie : PULL marketing, messages 100% humains
 * Détecte automatiquement la plateforme et utilise le service approprié
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import * as instagramSequence from '../services/instagramSequence.js';
import * as linkedinSequence from '../services/linkedinSequence.js';

/**
 * Sélectionne le service approprié selon la plateforme du prospect
 * @param {string} platform - La plateforme (instagram, tiktok, linkedin)
 * @returns {object} Le service de séquence approprié
 */
function getSequenceService(platform) {
  const platformLower = (platform || 'instagram').toLowerCase();
  if (platformLower === 'linkedin') {
    return linkedinSequence;
  }
  // Instagram et TikTok utilisent le même service
  return instagramSequence;
}

// Pour rétro-compatibilité, exporter les OBJECTIVES combinés
const OBJECTIVES = {
  ...instagramSequence.OBJECTIVES,
  // Les objectifs LinkedIn sont similaires mais avec des noms adaptés
  // On garde les mêmes IDs pour la compatibilité
};

const router = Router();

/**
 * GET /api/sequence/objectives
 * Liste les objectifs disponibles
 * Peut accepter ?platform=linkedin pour obtenir les objectifs LinkedIn
 */
router.get('/objectives', (req, res) => {
  const { platform } = req.query;
  const service = getSequenceService(platform);
  res.json(formatResponse({
    objectives: Object.values(service.OBJECTIVES),
    platform: platform || 'instagram',
  }));
});

/**
 * POST /api/sequence/generate
 * Génère une séquence complète de prospection
 * Détecte automatiquement la plateforme via prospect.platform
 */
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prospect, objective = 'network', mode = 'full' } = req.body;

    if (!prospect?.username && !prospect?.fullName) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Sélectionner le service selon la plateforme
    const service = getSequenceService(prospect.platform);

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
      result = await service.generateDirectDM(prospect, profile, objective);
    } else {
      // Mode séquence complète
      result = await service.generateFullSequence(prospect, profile, objective);
    }

    res.json(formatResponse({
      sequence: result,
      mode,
      objective: service.OBJECTIVES[objective],
      platform: prospect.platform || 'instagram',
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

    if (!prospect?.username && !prospect?.fullName) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Sélectionner le service selon la plateforme
    const service = getSequenceService(prospect.platform);

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const comment = await service.generateWarmupComment(prospect, profile);

    res.json(formatResponse({ comment, platform: prospect.platform || 'instagram' }));
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

    if (!prospect?.username && !prospect?.fullName) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Sélectionner le service selon la plateforme
    const service = getSequenceService(prospect.platform);

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const dm = await service.generateFirstDM(prospect, profile);

    res.json(formatResponse({ dm, platform: prospect.platform || 'instagram' }));
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

    if (!prospect?.username && !prospect?.fullName) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    // Sélectionner le service selon la plateforme
    const service = getSequenceService(prospect.platform);

    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json || voiceProfile;
    const transition = await service.generateTransitionMessage(prospect, profile, objective, conversationContext);

    res.json(formatResponse({
      transition,
      objective: service.OBJECTIVES[objective],
      platform: prospect.platform || 'instagram',
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

    if (!prospect?.username && !prospect?.fullName) {
      return res.status(400).json(formatError('Prospect requis', 'MISSING_PROSPECT'));
    }

    if (!['comment', 'first-dm', 'transition'].includes(element)) {
      return res.status(400).json(formatError('Élément invalide', 'INVALID_ELEMENT'));
    }

    // Sélectionner le service selon la plateforme
    const service = getSequenceService(prospect.platform);

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
        result = await service.generateWarmupComment(prospect, profile);
        break;
      case 'first-dm':
        result = await service.generateFirstDM(prospect, profile);
        break;
      case 'transition':
        result = await service.generateTransitionMessage(prospect, profile, objective, conversationContext);
        break;
    }

    res.json(formatResponse({
      [element.replace('-', '_')]: result,
      platform: prospect.platform || 'instagram',
    }));
  } catch (error) {
    console.error('[Sequence] Error regenerating:', error);
    res.status(500).json(formatError('Erreur lors de la régénération', 'REGENERATE_ERROR'));
  }
});

export default router;
