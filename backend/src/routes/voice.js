import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import Anthropic from '@anthropic-ai/sdk';
import { generateVoiceAnalyzePrompt, calculateFidelityScore } from '../prompts/prompt-voice-analyze.js';

const router = Router();

// Initialiser le client Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * POST /api/voice/test
 * Génère un message de test avec le profil MA VOIX actif
 */
router.post('/test', requireAuth, async (req, res) => {
  try {
    const { prospect, voiceProfile } = req.body;

    if (!prospect?.username) {
      return res.status(400).json(formatError('Le nom d\'utilisateur est requis', 'MISSING_USERNAME'));
    }

    // Récupérer le profil vocal actif si non fourni
    let profile = voiceProfile;
    if (!profile) {
      const { data: voiceData } = await supabaseAdmin
        .from('voice_profiles')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('is_active', true)
        .single();

      profile = voiceData;
    }

    if (!profile) {
      return res.status(400).json(formatError('Aucun profil vocal actif', 'NO_VOICE_PROFILE'));
    }

    // Construire le prompt pour Claude
    const systemPrompt = buildVoiceSystemPrompt(profile);
    const userPrompt = buildTestMessagePrompt(prospect, profile);

    // Appeler Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const generatedMessage = message.content[0].text;

    res.json(formatResponse({ message: generatedMessage }));
  } catch (error) {
    console.error('Error generating test message:', error);
    res.status(500).json(formatError('Erreur lors de la génération', 'GENERATION_ERROR'));
  }
});

/**
 * Construit le prompt système basé sur le profil vocal
 */
function buildVoiceSystemPrompt(profile) {
  const toneMap = {
    decontracte: 'décontracté et amical',
    professionnel: 'professionnel mais chaleureux',
    direct: 'direct et efficace',
    enthousiaste: 'enthousiaste et énergique',
  };

  const tone = toneMap[profile.tone?.toLowerCase()] || profile.tone || 'décontracté';
  const tutoiement = profile.tutoiement === 'Toujours' ? 'tu tutoies toujours' :
                     profile.tutoiement === 'Jamais' ? 'tu vouvoies toujours' :
                     'tu adaptes le tutoiement selon le contexte';

  let prompt = `Tu es un assistant qui génère des messages de prospection personnalisés.
Tu dois écrire dans un style ${tone}.
${tutoiement}.

Règles importantes :
- Le message doit être court (3-5 phrases max)
- Il doit paraître naturel et authentique, pas commercial
- Il doit mentionner quelque chose de spécifique au prospect
- Il doit avoir un call-to-action clair mais pas agressif
- Ne jamais commencer par "J'espère que tu vas bien" ou "J'espère que vous allez bien"
`;

  if (profile.emojis && profile.emojis.length > 0 && profile.emojis[0] !== 'default') {
    prompt += `\nUtilise ces emojis avec parcimonie : ${profile.emojis.join(' ')}`;
  } else if (profile.use_emojis === false) {
    prompt += '\nN\'utilise pas d\'emojis.';
  }

  if (profile.expressions && profile.expressions.length > 0) {
    prompt += `\nTu peux utiliser ces expressions qui te ressemblent : ${profile.expressions.join(', ')}`;
  }

  if (profile.business_context) {
    prompt += `\n\nContexte business :
- Activité : ${profile.business_context.activity || 'Non spécifié'}
- Cible : ${profile.business_context.target || 'Non spécifié'}
- Cadeau/Offre : ${profile.business_context.gift || 'Non spécifié'}`;
  }

  return prompt;
}

/**
 * Construit le prompt utilisateur pour le message de test
 */
function buildTestMessagePrompt(prospect, profile) {
  let prompt = `Génère un message de prospection pour ce prospect fictif :

Nom d'utilisateur : @${prospect.username}
Plateforme : ${prospect.platform || 'Instagram'}`;

  if (prospect.bio) {
    prompt += `\nBio : ${prospect.bio}`;
  }

  if (prospect.followers) {
    prompt += `\nAbonnés : ${prospect.followers}`;
  }

  prompt += `

Écris uniquement le message, sans guillemets ni explications.`;

  return prompt;
}

/**
 * POST /api/voice/analyze
 * Analyse des textes pour créer un profil stylistique
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { texts } = req.body;

    // Validation
    if (!texts || !Array.isArray(texts) || texts.length < 2) {
      return res.status(400).json(formatError('Minimum 2 textes requis', 'MIN_TEXTS_REQUIRED'));
    }

    if (texts.length > 10) {
      return res.status(400).json(formatError('Maximum 10 textes autorisés', 'MAX_TEXTS_EXCEEDED'));
    }

    // Valider chaque texte
    for (const text of texts) {
      if (typeof text !== 'string' || text.length < 50) {
        return res.status(400).json(formatError('Chaque texte doit faire au moins 50 caractères', 'TEXT_TOO_SHORT'));
      }
      if (text.length > 5000) {
        return res.status(400).json(formatError('Chaque texte ne doit pas dépasser 5000 caractères', 'TEXT_TOO_LONG'));
      }
    }

    // Générer le prompt
    const { system, user } = generateVoiceAnalyzePrompt(texts);

    // Appeler Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      system,
      messages: [
        {
          role: 'user',
          content: user,
        },
      ],
    });

    // Parser la réponse JSON
    const responseText = message.content[0].text;
    let profile;

    try {
      // Nettoyer la réponse si elle contient des backticks markdown
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      profile = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError);
      console.error('Response was:', responseText);
      return res.status(500).json(formatError('Erreur lors de l\'analyse', 'PARSE_ERROR'));
    }

    // Calculer le score de fidélité
    const fidelityScore = calculateFidelityScore(profile, texts.length);

    // Ajouter les métadonnées
    profile.source = 'text_analysis';
    profile.texts_count = texts.length;
    profile.isActive = true;

    res.json(formatResponse({
      fidelityScore,
      profile,
      textsAnalyzed: texts.length,
    }));
  } catch (error) {
    console.error('Error analyzing voice:', error);
    res.status(500).json(formatError('Erreur lors de l\'analyse', 'ANALYSIS_ERROR'));
  }
});

/**
 * GET /api/voice/profiles
 * Liste les profils vocaux de l'utilisateur
 */
router.get('/profiles', requireAuth, async (req, res) => {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(formatResponse(profiles || []));
  } catch (error) {
    console.error('Error fetching voice profiles:', error);
    res.status(500).json(formatError('Erreur lors de la récupération', 'FETCH_ERROR'));
  }
});

/**
 * POST /api/voice/profiles
 * Crée un nouveau profil vocal
 */
router.post('/profiles', requireAuth, async (req, res) => {
  try {
    const profile = req.body;

    // Désactiver les autres profils si celui-ci est actif
    if (profile.isActive) {
      await supabaseAdmin
        .from('voice_profiles')
        .update({ is_active: false })
        .eq('user_id', req.user.id);
    }

    // Créer le nouveau profil
    const { data: newProfile, error } = await supabaseAdmin
      .from('voice_profiles')
      .insert({
        user_id: req.user.id,
        nom: profile.nom || 'MA VOIX',
        description: profile.description,
        profil_json: profile,
        is_active: profile.isActive || true,
        source: profile.source || 'manual',
      })
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(newProfile, 'Profil créé avec succès'));
  } catch (error) {
    console.error('Error creating voice profile:', error);
    res.status(500).json(formatError('Erreur lors de la création', 'CREATE_ERROR'));
  }
});

/**
 * DELETE /api/voice/profiles/:id
 * Supprime un profil vocal
 */
router.delete('/profiles/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('voice_profiles')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json(formatResponse({ deleted: true }, 'Profil supprimé avec succès'));
  } catch (error) {
    console.error('Error deleting voice profile:', error);
    res.status(500).json(formatError('Erreur lors de la suppression', 'DELETE_ERROR'));
  }
});

export default router;
