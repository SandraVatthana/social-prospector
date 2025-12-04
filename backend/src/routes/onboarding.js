import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { callClaude, parseClaudeJSON } from '../services/claude.js';
import { generateOnboardingToVoicePrompt } from '../prompts/prompt-onboarding-voice.js';

const router = Router();

/**
 * POST /api/onboarding/generate-voice
 * Génère un profil MA VOIX à partir des données d'onboarding
 */
router.post('/generate-voice', requireAuth, async (req, res) => {
  try {
    const onboardingData = req.body;

    // Validation basique
    if (!onboardingData.prenom || !onboardingData.activite) {
      return res.status(400).json(formatError('Données d\'onboarding incomplètes', 'VALIDATION_ERROR'));
    }

    // Générer le prompt
    const { system, user } = generateOnboardingToVoicePrompt(onboardingData);

    // Appeler Claude
    const response = await callClaude(system, user, {
      max_tokens: 2000,
      temperature: 0.7,
    });

    // Parser la réponse JSON
    const voiceProfile = parseClaudeJSON(response);

    if (!voiceProfile) {
      throw new Error('Impossible de parser le profil généré');
    }

    // Ajouter des métadonnées
    voiceProfile.source = 'onboarding';
    voiceProfile.onboarding_data = onboardingData;
    voiceProfile.created_at = new Date().toISOString();

    res.json(formatResponse(voiceProfile, 'Profil MA VOIX généré avec succès'));
  } catch (error) {
    console.error('Error generating voice profile from onboarding:', error);
    res.status(500).json(formatError('Erreur lors de la génération du profil', 'GENERATION_ERROR'));
  }
});

/**
 * POST /api/onboarding/complete
 * Sauvegarde les données d'onboarding et le profil généré
 */
router.post('/complete', requireAuth, async (req, res) => {
  try {
    const { onboarding_data, voice_profile } = req.body;

    // Mettre à jour l'utilisateur
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_data: onboarding_data,
      })
      .eq('id', req.user.id);

    if (userError) throw userError;

    // Créer le profil MA VOIX si fourni (sans description - colonne n'existe pas)
    if (voice_profile) {
      const { error: voiceError } = await supabaseAdmin
        .from('voice_profiles')
        .insert({
          user_id: req.user.id,
          nom: voice_profile.nom || `MA VOIX — ${onboarding_data.prenom}`,
          profil_json: voice_profile,
          is_active: true,
        });

      if (voiceError) {
        console.error('Error creating voice profile:', voiceError);
        // Non bloquant, on continue
      }
    }

    res.json(formatResponse({ completed: true }, 'Onboarding complété avec succès'));
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json(formatError('Erreur lors de la finalisation', 'COMPLETE_ERROR'));
  }
});

/**
 * GET /api/onboarding/status
 * Vérifie le statut d'onboarding de l'utilisateur
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('onboarding_completed, onboarding_data')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json(formatResponse({
      completed: user.onboarding_completed || false,
      data: user.onboarding_data,
    }));
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du statut', 'STATUS_ERROR'));
  }
});

export default router;
