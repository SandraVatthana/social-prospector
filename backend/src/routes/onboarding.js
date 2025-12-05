import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { callClaude, parseClaudeJSON } from '../services/claude.js';
import { generateOnboardingToVoicePrompt } from '../prompts/prompt-onboarding-voice.js';
import { generateSearchSuggestions, generateLinkedInMessage } from '../services/searchSuggestions.js';

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

    // Créer le profil MA VOIX si fourni (mapper vers les colonnes existantes)
    if (voice_profile) {
      const voiceData = {
        user_id: req.user.id,
        name: voice_profile.nom || voice_profile.name || 'Mon style',
        tone: voice_profile.ton_dominant || voice_profile.tone || null,
        style: voice_profile.style_redaction?.style || voice_profile.style || null,
        signature: voice_profile.signature || null,
        examples: voice_profile.examples || null,
        keywords: voice_profile.expressions_cles || voice_profile.keywords || null,
        avoid_words: voice_profile.mots_a_eviter || voice_profile.avoid_words || null,
        target_audience: voice_profile.contexte_business?.cible || voice_profile.target_audience || null,
        offer_description: voice_profile.contexte_business?.proposition_valeur || voice_profile.offer_description || null,
        is_active: true,
      };

      const { error: voiceError } = await supabaseAdmin
        .from('voice_profiles')
        .insert(voiceData);

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
 * POST /api/onboarding/complete-enriched
 * Nouvel onboarding enrichi avec génération de suggestions
 */
router.post('/complete-enriched', requireAuth, async (req, res) => {
  try {
    const profileData = req.body;

    // Validation
    const requiredFields = ['metier', 'secteur_niche', 'offre_description', 'client_ideal', 'probleme_client', 'objectif', 'plateformes'];
    const missingFields = requiredFields.filter(f => !profileData[f]);

    if (missingFields.length > 0) {
      return res.status(400).json(formatError(
        `Champs manquants : ${missingFields.join(', ')}`,
        'VALIDATION_ERROR'
      ));
    }

    console.log('[Onboarding] Generating suggestions for user:', req.user.id);

    // Générer les suggestions avec l'IA
    let suggestions = null;
    try {
      suggestions = await generateSearchSuggestions(profileData);
      console.log('[Onboarding] Suggestions generated successfully');
    } catch (error) {
      console.error('[Onboarding] Error generating suggestions:', error);
      // On continue sans suggestions, on les régénérera plus tard
    }

    // Préparer les données à sauvegarder
    const onboardingData = {
      ...profileData,
      suggestions_instagram: suggestions?.instagram || null,
      suggestions_tiktok: suggestions?.tiktok || null,
      suggestions_linkedin: suggestions?.linkedin || null,
      completed_at: new Date().toISOString(),
    };

    // Mettre à jour l'utilisateur
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_data: onboardingData,
      })
      .eq('id', req.user.id);

    if (userError) throw userError;

    res.json(formatResponse({
      completed: true,
      profile: profileData,
      suggestions: suggestions,
    }, 'Onboarding complété avec succès'));

  } catch (error) {
    console.error('Error completing enriched onboarding:', error);
    res.status(500).json(formatError('Erreur lors de la finalisation', 'COMPLETE_ERROR'));
  }
});

/**
 * POST /api/onboarding/reset
 * Réinitialise l'onboarding de l'utilisateur (garde les données pour pré-remplir)
 */
router.post('/reset', requireAuth, async (req, res) => {
  try {
    // Ne remet que onboarding_completed à false, garde les données pour pré-remplir
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        onboarding_completed: false,
        // On ne supprime PAS onboarding_data pour permettre de pré-remplir le formulaire
      })
      .eq('id', req.user.id);

    if (error) throw error;

    res.json(formatResponse({ reset: true }, 'Onboarding réinitialisé'));
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json(formatError('Erreur lors de la réinitialisation', 'RESET_ERROR'));
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

/**
 * GET /api/onboarding/suggestions
 * Récupère les suggestions de recherche de l'utilisateur
 */
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('onboarding_data')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    const onboardingData = user.onboarding_data || {};

    res.json(formatResponse({
      profile: {
        metier: onboardingData.metier,
        secteur_niche: onboardingData.secteur_niche,
        client_ideal: onboardingData.client_ideal,
        objectif: onboardingData.objectif,
        plateformes: onboardingData.plateformes,
      },
      suggestions: {
        instagram: onboardingData.suggestions_instagram || null,
        tiktok: onboardingData.suggestions_tiktok || null,
        linkedin: onboardingData.suggestions_linkedin || null,
      },
    }));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des suggestions', 'SUGGESTIONS_ERROR'));
  }
});

/**
 * POST /api/onboarding/regenerate-suggestions
 * Régénère les suggestions de recherche
 */
router.post('/regenerate-suggestions', requireAuth, async (req, res) => {
  try {
    // Récupérer le profil actuel
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('onboarding_data')
      .eq('id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const onboardingData = user.onboarding_data;

    // Vérifier que le profil contient les données nécessaires (supporte les deux formats)
    const hasRequiredData = onboardingData?.metier || onboardingData?.activite;
    if (!hasRequiredData) {
      return res.status(400).json(formatError(
        'Profil incomplet, veuillez compléter l\'onboarding',
        'INCOMPLETE_PROFILE'
      ));
    }

    console.log('[Onboarding] Regenerating suggestions for user:', req.user.id);

    // Générer les nouvelles suggestions
    const suggestions = await generateSearchSuggestions(onboardingData);

    // Mettre à jour les suggestions
    const updatedData = {
      ...onboardingData,
      suggestions_instagram: suggestions.instagram,
      suggestions_tiktok: suggestions.tiktok,
      suggestions_linkedin: suggestions.linkedin,
    };

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ onboarding_data: updatedData })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json(formatResponse({
      suggestions,
    }, 'Suggestions régénérées avec succès'));

  } catch (error) {
    console.error('Error regenerating suggestions:', error);
    res.status(500).json(formatError('Erreur lors de la régénération', 'REGENERATE_ERROR'));
  }
});

/**
 * POST /api/onboarding/update-profile
 * Met à jour le profil et régénère les suggestions si nécessaire
 */
router.post('/update-profile', requireAuth, async (req, res) => {
  try {
    const updates = req.body;

    // Récupérer le profil actuel
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('onboarding_data')
      .eq('id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const currentData = user.onboarding_data || {};

    // Fusionner les mises à jour
    const updatedProfile = {
      ...currentData,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Vérifier si les champs clés ont changé (nécessite régénération des suggestions)
    const keyFields = ['metier', 'secteur_niche', 'client_ideal', 'probleme_client', 'objectif'];
    const needsRegeneration = keyFields.some(f => updates[f] && updates[f] !== currentData[f]);

    if (needsRegeneration) {
      console.log('[Onboarding] Profile changed, regenerating suggestions...');
      try {
        const suggestions = await generateSearchSuggestions(updatedProfile);
        updatedProfile.suggestions_instagram = suggestions.instagram;
        updatedProfile.suggestions_tiktok = suggestions.tiktok;
        updatedProfile.suggestions_linkedin = suggestions.linkedin;
      } catch (error) {
        console.error('[Onboarding] Error regenerating suggestions:', error);
        // On continue avec les anciennes suggestions
      }
    }

    // Sauvegarder
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ onboarding_data: updatedProfile })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    res.json(formatResponse({
      profile: updatedProfile,
      suggestions_regenerated: needsRegeneration,
    }, 'Profil mis à jour'));

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour', 'UPDATE_ERROR'));
  }
});

/**
 * POST /api/onboarding/linkedin-message
 * Génère un message LinkedIn personnalisé (sans scraping)
 */
router.post('/linkedin-message', requireAuth, async (req, res) => {
  try {
    const { prospectDescription, recentPost, objective } = req.body;

    if (!prospectDescription) {
      return res.status(400).json(formatError(
        'Description du prospect requise',
        'MISSING_DESCRIPTION'
      ));
    }

    // Récupérer le profil vocal actif
    const { data: voiceProfile } = await supabaseAdmin
      .from('voice_profiles')
      .select('profil_json')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    const profile = voiceProfile?.profil_json;

    // Générer le message
    const result = await generateLinkedInMessage({
      prospectDescription,
      recentPost,
      objective: objective || 'network',
      voiceProfile: profile,
    });

    res.json(formatResponse({
      message: result.message,
      metadata: {
        hook_used: result.hook_used,
        why_it_works: result.why_it_works,
      },
    }));

  } catch (error) {
    console.error('Error generating LinkedIn message:', error);
    res.status(500).json(formatError('Erreur lors de la génération du message', 'GENERATION_ERROR'));
  }
});

export default router;
