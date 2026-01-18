import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import multer from 'multer';
import { generateVoiceAnalyzePrompt, calculateFidelityScore } from '../prompts/prompt-voice-analyze.js';

const router = Router();

// Configurer multer pour les uploads audio (en mémoire, pas de sauvegarde)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter les formats audio courants
    const allowedMimes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/m4a'];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Format audio non supporté'), false);
    }
  },
});

// Initialiser le client OpenAI pour Whisper (optionnel)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

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

    // Mapper le profil vers les colonnes existantes de voice_profiles
    const voiceData = {
      user_id: req.user.id,
      name: profile.nom || profile.name || 'Mon style',
      tone: profile.ton_dominant || profile.tone || null,
      style: profile.style_redaction?.style || profile.style || null,
      signature: profile.signature || null,
      examples: profile.examples || null,
      keywords: profile.expressions_cles || profile.keywords || null,
      avoid_words: profile.mots_a_eviter || profile.avoid_words || null,
      target_audience: profile.contexte_business?.cible || profile.target_audience || null,
      offer_description: profile.contexte_business?.proposition_valeur || profile.offer_description || null,
      is_active: profile.isActive !== false,
    };

    const { data: newProfile, error } = await supabaseAdmin
      .from('voice_profiles')
      .insert(voiceData)
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
 * GET /api/voice/training-texts
 * Récupère les textes d'entraînement sauvegardés
 */
router.get('/training-texts', requireAuth, async (req, res) => {
  try {
    // Récupérer le profil actif de l'utilisateur
    const { data: profile, error } = await supabaseAdmin
      .from('voice_profiles')
      .select('id, training_texts')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    res.json(formatResponse({
      texts: profile?.training_texts || [],
      profile_id: profile?.id || null,
    }));
  } catch (error) {
    console.error('Error fetching training texts:', error);
    res.status(500).json(formatError('Erreur lors de la récupération', 'FETCH_ERROR'));
  }
});

/**
 * POST /api/voice/training-texts
 * Sauvegarde les textes d'entraînement
 */
router.post('/training-texts', requireAuth, async (req, res) => {
  try {
    const { texts } = req.body;

    if (!Array.isArray(texts)) {
      return res.status(400).json(formatError('Format invalide', 'INVALID_FORMAT'));
    }

    // Chercher le profil actif ou en créer un
    let { data: profile, error: fetchError } = await supabaseAdmin
      .from('voice_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('is_active', true)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Pas de profil actif, en créer un
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('voice_profiles')
        .insert({
          user_id: req.user.id,
          name: 'MA VOIX',
          is_active: true,
          training_texts: texts,
        })
        .select()
        .single();

      if (createError) throw createError;
      profile = newProfile;
    } else if (fetchError) {
      throw fetchError;
    } else {
      // Mettre à jour le profil existant
      const { error: updateError } = await supabaseAdmin
        .from('voice_profiles')
        .update({ training_texts: texts })
        .eq('id', profile.id);

      if (updateError) throw updateError;
    }

    res.json(formatResponse({ saved: true, count: texts.length }));
  } catch (error) {
    console.error('Error saving training texts:', error);
    res.status(500).json(formatError('Erreur lors de la sauvegarde', 'SAVE_ERROR'));
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

/**
 * POST /api/voice/analyze-recording
 * Analyse un enregistrement vocal et fournit un feedback IA
 * - Transcription via Whisper API
 * - Analyse par Claude avec scoring sur 6 critères
 */
router.post('/analyze-recording', requireAuth, upload.single('audio'), async (req, res) => {
  try {
    const { original_script, voice_profile } = req.body;

    // Vérifier que l'audio est présent
    if (!req.file) {
      return res.status(400).json(formatError('Fichier audio requis', 'NO_AUDIO'));
    }

    // Vérifier que le script original est présent
    if (!original_script) {
      return res.status(400).json(formatError('Script original requis', 'NO_SCRIPT'));
    }

    // Vérifier les limites du plan (optionnel selon config)
    const dailyLimit = await checkVocalTrainingLimit(req.user.id);
    if (!dailyLimit.allowed) {
      return res.status(429).json(formatError(
        `Limite quotidienne atteinte (${dailyLimit.used}/${dailyLimit.max}). Passez à un plan supérieur pour plus d'entraînements.`,
        'LIMIT_EXCEEDED'
      ));
    }

    // Parser le voice_profile s'il est en string
    let voiceData = voice_profile;
    if (typeof voice_profile === 'string') {
      try {
        voiceData = JSON.parse(voice_profile);
      } catch (e) {
        voiceData = null;
      }
    }

    // Étape 1 : Transcription via Whisper (ou mode démo si pas configuré)
    console.log('Transcribing audio with Whisper...');
    let transcription;

    if (!openai) {
      // Mode démo : simuler une transcription
      console.log('OpenAI not configured, using demo mode');
      // On utilise le script original comme "transcription" en mode démo
      // avec quelques variations pour simuler une vraie dictée
      transcription = original_script
        .replace(/\.\.\./g, ', euh,')
        .replace(/!/g, '.')
        .trim();
    } else {
      try {
        // Créer un File-like object pour l'API OpenAI
        const audioFile = new File([req.file.buffer], 'recording.webm', { type: req.file.mimetype });

        const whisperResponse = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          language: 'fr',
          response_format: 'text',
        });

        transcription = whisperResponse;
      } catch (whisperError) {
        console.error('Whisper transcription error:', whisperError);
        return res.status(500).json(formatError('Erreur lors de la transcription audio', 'TRANSCRIPTION_ERROR'));
      }
    }

    if (!transcription || transcription.trim().length === 0) {
      return res.status(400).json(formatError('Aucune parole détectée dans l\'enregistrement', 'NO_SPEECH'));
    }

    // Étape 2 : Analyse par Claude
    console.log('Analyzing with Claude...');
    const analysisPrompt = buildVocalAnalysisPrompt(original_script, transcription, voiceData);

    const analysisResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      temperature: 0.3,
      system: `Tu es un coach vocal expert qui analyse les performances de prospection vocale.
Tu dois évaluer l'enregistrement d'un utilisateur qui dicte un script de prospection.
Sois bienveillant mais honnête dans tes retours. L'objectif est d'aider à progresser.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`,
      messages: [
        { role: 'user', content: analysisPrompt }
      ],
    });

    // Parser la réponse JSON de Claude
    let analysis;
    try {
      const responseText = analysisResponse.content[0].text;
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      analysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing Claude analysis:', parseError);
      console.error('Response was:', analysisResponse.content[0].text);
      return res.status(500).json(formatError('Erreur lors de l\'analyse', 'PARSE_ERROR'));
    }

    // Incrémenter le compteur d'entraînements
    await incrementVocalTrainingCount(req.user.id);

    // Retourner l'analyse (sans sauvegarder l'audio pour la privacy)
    res.json(formatResponse({
      transcription,
      analysis: {
        score_global: analysis.score_global || 0,
        scores: analysis.scores || {},
        point_fort: analysis.point_fort || '',
        axe_prioritaire: analysis.axe_prioritaire || '',
        encouragement: analysis.encouragement || '',
        details: analysis.details || {},
      },
      word_count: transcription.split(/\s+/).length,
    }));

  } catch (error) {
    console.error('Error analyzing recording:', error);
    res.status(500).json(formatError('Erreur lors de l\'analyse de l\'enregistrement', 'ANALYSIS_ERROR'));
  }
});

/**
 * GET /api/voice/training-stats
 * Récupère les statistiques d'entraînement vocal de l'utilisateur
 */
router.get('/training-stats', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Récupérer le compteur du jour
    const { data: dailyData } = await supabaseAdmin
      .from('vocal_training_stats')
      .select('count')
      .eq('user_id', req.user.id)
      .eq('date', today)
      .single();

    // Récupérer le plan de l'utilisateur
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', req.user.id)
      .single();

    const plan = userData?.plan || 'solo';
    const limits = {
      solo: 10,
      agence: 50,
      'agency+': -1, // illimité
    };

    res.json(formatResponse({
      today_count: dailyData?.count || 0,
      daily_limit: limits[plan] || 10,
      plan,
    }));
  } catch (error) {
    console.error('Error fetching training stats:', error);
    res.status(500).json(formatError('Erreur', 'FETCH_ERROR'));
  }
});

// ============ Helper Functions for Vocal Training ============

/**
 * Construit le prompt d'analyse vocale pour Claude
 */
function buildVocalAnalysisPrompt(originalScript, transcription, voiceProfile) {
  const tone = voiceProfile?.tone || 'Décontracté';

  return `Analyse cet enregistrement vocal de prospection.

SCRIPT ORIGINAL À DICTER :
"""
${originalScript}
"""

TRANSCRIPTION DE L'UTILISATEUR :
"""
${transcription}
"""

STYLE ATTENDU : ${tone}

Évalue sur ces 6 critères (note sur 10 chacun) :

1. **Fidélité au script** (fidelite_script)
   - L'utilisateur a-t-il dit les éléments clés du script ?
   - A-t-il gardé la structure (accroche → connexion → valeur → CTA) ?
   - Adaptations mineures OK, mais le fond doit être respecté

2. **Naturel/Fluidité** (naturel)
   - Ça sonne comme une vraie conversation ou c'est récité ?
   - Y a-t-il des hésitations naturelles (bien) ou des blancs gênants (moins bien) ?
   - Le rythme est-il agréable ?

3. **Énergie/Enthousiasme** (energie)
   - L'utilisateur semble-t-il engagé et convaincu ?
   - L'énergie correspond-elle au style "${tone}" ?
   - Est-ce monotone ou vivant ?

4. **Clarté/Articulation** (clarte)
   - Les mots sont-ils bien articulés ?
   - Le débit est-il correct (ni trop rapide, ni trop lent) ?
   - Le message est-il compréhensible ?

5. **Personnalisation** (personnalisation)
   - L'utilisateur a-t-il bien intégré les éléments personnalisés du script ?
   - Le message semble-t-il adapté au prospect fictif ?

6. **Impact/Conviction** (impact)
   - Le CTA est-il convaincant ?
   - Donnerait-on envie de répondre à ce message ?
   - La proposition de valeur est-elle claire ?

Réponds en JSON avec cette structure EXACTE :
{
  "score_global": <moyenne des 6 scores, arrondie>,
  "scores": {
    "fidelite_script": <0-10>,
    "naturel": <0-10>,
    "energie": <0-10>,
    "clarte": <0-10>,
    "personnalisation": <0-10>,
    "impact": <0-10>
  },
  "details": {
    "fidelite_script": "<feedback court>",
    "naturel": "<feedback court>",
    "energie": "<feedback court>",
    "clarte": "<feedback court>",
    "personnalisation": "<feedback court>",
    "impact": "<feedback court>"
  },
  "point_fort": "<Le critère où l'utilisateur excelle - 1 phrase>",
  "axe_prioritaire": "<Le critère à améliorer en priorité - 1 phrase avec conseil actionnable>",
  "encouragement": "<Message positif et motivant - 1-2 phrases>"
}`;
}

/**
 * Vérifie la limite quotidienne d'entraînements vocaux
 */
async function checkVocalTrainingLimit(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Récupérer le plan de l'utilisateur
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();

  const plan = userData?.plan || 'solo';
  const limits = {
    solo: 10,
    agence: 50,
    'agency+': -1, // illimité
  };

  const maxLimit = limits[plan] || 10;

  // Plan illimité
  if (maxLimit === -1) {
    return { allowed: true, used: 0, max: -1 };
  }

  // Récupérer le compteur du jour
  const { data: statsData } = await supabaseAdmin
    .from('vocal_training_stats')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  const usedCount = statsData?.count || 0;

  return {
    allowed: usedCount < maxLimit,
    used: usedCount,
    max: maxLimit,
  };
}

/**
 * Incrémente le compteur d'entraînements vocaux du jour
 */
async function incrementVocalTrainingCount(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Upsert le compteur
  const { data: existing } = await supabaseAdmin
    .from('vocal_training_stats')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('vocal_training_stats')
      .update({ count: existing.count + 1 })
      .eq('user_id', userId)
      .eq('date', today);
  } else {
    await supabaseAdmin
      .from('vocal_training_stats')
      .insert({
        user_id: userId,
        date: today,
        count: 1,
      });
  }
}

export default router;
