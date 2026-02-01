import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// SIGNAL WEIGHTS & THRESHOLDS
// ============================================

const DEFAULT_WEIGHTS = {
  newPosition: 25,      // Nouveau poste / lancement récent
  painPost: 25,         // A posté sur une douleur
  competitorEngagement: 20, // Engagement avec concurrent
  smallAudience: 15,    // Petite audience (< 1000)
  sameLocation: 15      // Même localisation
};

const SCORE_THRESHOLDS = {
  hot: 60,   // Score >= 60
  warm: 30,  // Score >= 30
  cold: 0    // Score < 30
};

// Keywords for detection
const NEW_POSITION_KEYWORDS = [
  'depuis 2024', 'depuis 2025', 'depuis 2026', 'just launched', 'je me lance',
  'nouvelle aventure', 'nouveau chapitre', 'fondatrice depuis', 'fondateur depuis',
  'entrepreneur depuis', 'freelance depuis', 'je viens de', 'je lance',
  'nouvelle étape', 'nouveau projet', 'je démarre', 'lancement'
];

const PAIN_KEYWORDS = [
  'je galère', 'je ne sais pas', "c'est dur", "j'ai du mal",
  'comment faire pour', 'qui peut m\'aider', 'je suis perdue', 'je suis perdu',
  'trouver des clients', 'pas assez de visibilité', 'personne ne répond',
  'je n\'arrive pas', 'besoin de conseils', 'sos', 'à l\'aide', 'help',
  'difficile de', 'problème avec', 'galère avec', 'besoin d\'aide'
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate prospect score based on detected signals
 */
function calculateScore(signals, weights = DEFAULT_WEIGHTS) {
  let score = 0;
  const detectedSignals = [];

  // Signal 1: Nouveau poste / lancement récent
  if (signals.isNewPosition) {
    score += weights.newPosition;
    detectedSignals.push({
      type: 'newPosition',
      label: 'Poste récent (< 6 mois)',
      points: weights.newPosition,
      evidence: signals.newPositionEvidence
    });
  }

  // Signal 2: A posté sur une douleur
  if (signals.hasPainPost) {
    score += weights.painPost;
    detectedSignals.push({
      type: 'painPost',
      label: 'A exprimé une douleur',
      points: weights.painPost,
      evidence: signals.painPostContent?.substring(0, 150),
      topic: signals.painTopic
    });
  }

  // Signal 3: Engagement avec concurrent
  if (signals.engagedWithCompetitor) {
    score += weights.competitorEngagement;
    detectedSignals.push({
      type: 'competitorEngagement',
      label: `Engagé avec ${signals.competitorName || 'concurrent'}`,
      points: weights.competitorEngagement
    });
  }

  // Signal 4: Petite audience
  if (signals.isSmallAudience || (signals.audienceSize && signals.audienceSize < 1000)) {
    score += weights.smallAudience;
    detectedSignals.push({
      type: 'smallAudience',
      label: `Petite audience (${signals.audienceSize || '< 1000'})`,
      points: weights.smallAudience
    });
  }

  // Signal 5: Même localisation
  if (signals.isSameLocation) {
    score += weights.sameLocation;
    detectedSignals.push({
      type: 'sameLocation',
      label: `Même zone (${signals.location})`,
      points: weights.sameLocation
    });
  }

  // Determine badge
  let badge = 'cold';
  if (score >= SCORE_THRESHOLDS.hot) {
    badge = 'hot';
  } else if (score >= SCORE_THRESHOLDS.warm) {
    badge = 'warm';
  }

  return { score, badge, signals: detectedSignals };
}

/**
 * Detect signals from profile data
 */
function detectSignalsFromProfile(profileData, userConfig = {}) {
  const signals = {
    isNewPosition: false,
    newPositionEvidence: null,
    hasPainPost: false,
    painPostContent: null,
    painTopic: null,
    engagedWithCompetitor: false,
    competitorName: null,
    audienceSize: profileData.followers_count || profileData.followers || 0,
    isSmallAudience: false,
    isSameLocation: false,
    location: profileData.location || null
  };

  const bioText = (profileData.bio || '').toLowerCase();
  const fullName = (profileData.full_name || '').toLowerCase();

  // Signal 1: Nouveau poste / lancement récent
  for (const keyword of NEW_POSITION_KEYWORDS) {
    if (bioText.includes(keyword.toLowerCase())) {
      signals.isNewPosition = true;
      signals.newPositionEvidence = `Bio contient: "${keyword}"`;
      break;
    }
  }

  // Signal 2: Pain detection from bio
  for (const keyword of PAIN_KEYWORDS) {
    if (bioText.includes(keyword.toLowerCase())) {
      signals.hasPainPost = true;
      signals.painPostContent = profileData.bio;
      signals.painTopic = keyword;
      break;
    }
  }

  // Signal 4: Small audience
  if (signals.audienceSize && signals.audienceSize < 1000) {
    signals.isSmallAudience = true;
  }

  // Signal 5: Same location
  if (userConfig.userLocation && profileData.location) {
    const userLoc = userConfig.userLocation.toLowerCase();
    const prospectLoc = profileData.location.toLowerCase();

    if (prospectLoc.includes(userLoc) || userLoc.includes(prospectLoc)) {
      signals.isSameLocation = true;
    }
  }

  // Signal 3: Competitor engagement (needs more data, will be done via AI or manual)
  if (userConfig.competitors && userConfig.competitors.length > 0) {
    // This would require engagement data which we may not have
    // Left for future implementation with real engagement tracking
  }

  return signals;
}

/**
 * Use AI to detect signals from posts
 */
async function detectSignalsWithAI(posts, bio = '') {
  if (!posts || posts.length === 0) {
    return null;
  }

  const postsText = posts.map((p, i) => `Post ${i + 1}: "${p.text || p.caption || p}"`).join('\n');

  const prompt = `Analyse ces posts et cette bio pour détecter des signaux d'achat.

BIO:
"${bio}"

POSTS:
${postsText}

SIGNAUX À DÉTECTER:
1. Nouveau poste / lancement récent (vient de se lancer, nouvelle aventure, nouveau projet...)
2. Douleur exprimée (galère, besoin d'aide, problème mentionné, recherche de solution...)
3. Intérêt pour le business (visibilité, clients, prospection, marketing, ventes...)

Réponds UNIQUEMENT en JSON valide:
{
  "isNewPosition": true/false,
  "newPositionEvidence": "citation exacte du post/bio ou null",
  "hasPainPost": true/false,
  "painEvidence": "citation exacte du post ou null",
  "painTopic": "sujet de la douleur (ex: trouver clients, visibilité...) ou null",
  "businessInterest": true/false,
  "interestTopics": ["topic1", "topic2"] ou []
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('[Scoring] AI detection error:', error);
    return null;
  }
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/scoring/config
 * Get user's scoring configuration
 */
router.get('/config', requireAuth, async (req, res) => {
  try {
    let { data: config, error } = await supabaseAdmin
      .from('user_scoring_config')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No config exists, return defaults
      config = {
        competitors: [],
        user_location: null,
        custom_weights: null
      };
    } else if (error) {
      throw error;
    }

    res.json(formatResponse({
      ...config,
      default_weights: DEFAULT_WEIGHTS,
      thresholds: SCORE_THRESHOLDS
    }));
  } catch (error) {
    console.error('[Scoring] Get config error:', error);
    res.status(500).json(formatError('Erreur lors de la récupération de la config'));
  }
});

/**
 * PUT /api/scoring/config
 * Update user's scoring configuration
 */
router.put('/config', requireAuth, async (req, res) => {
  try {
    const { competitors, user_location, custom_weights } = req.body;

    const { data, error } = await supabaseAdmin
      .from('user_scoring_config')
      .upsert({
        user_id: req.user.id,
        competitors: competitors || [],
        user_location: user_location || null,
        custom_weights: custom_weights || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    res.json(formatResponse(data, 'Configuration mise à jour'));
  } catch (error) {
    console.error('[Scoring] Update config error:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour'));
  }
});

/**
 * POST /api/scoring/calculate/:prospectId
 * Calculate and update score for a single prospect
 */
router.post('/calculate/:prospectId', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { forceAI = false } = req.body;

    // Get prospect data
    const { data: prospect, error: prospectError } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    if (prospectError || !prospect) {
      return res.status(404).json(formatError('Prospect non trouvé'));
    }

    // Get user config
    const { data: config } = await supabaseAdmin
      .from('user_scoring_config')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    // Detect signals from profile
    let signals = detectSignalsFromProfile(prospect, config || {});

    // If forceAI and we have posts/bio, use AI detection
    if (forceAI && (prospect.bio || prospect.recent_posts)) {
      const aiSignals = await detectSignalsWithAI(
        prospect.recent_posts || [],
        prospect.bio || ''
      );

      if (aiSignals) {
        // Merge AI signals with profile signals
        if (aiSignals.isNewPosition) {
          signals.isNewPosition = true;
          signals.newPositionEvidence = aiSignals.newPositionEvidence;
        }
        if (aiSignals.hasPainPost) {
          signals.hasPainPost = true;
          signals.painPostContent = aiSignals.painEvidence;
          signals.painTopic = aiSignals.painTopic;
        }
      }
    }

    // Calculate score
    const weights = config?.custom_weights || DEFAULT_WEIGHTS;
    const scoreData = calculateScore(signals, weights);

    // Update prospect
    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({
        score_total: scoreData.score,
        score_badge: scoreData.badge,
        score_signals: scoreData.signals,
        last_scored_at: new Date().toISOString()
      })
      .eq('id', prospectId);

    if (updateError) throw updateError;

    // Upsert signals record
    await supabaseAdmin
      .from('prospect_signals')
      .upsert({
        prospect_id: prospectId,
        user_id: req.user.id,
        is_new_position: signals.isNewPosition,
        new_position_evidence: signals.newPositionEvidence,
        has_pain_post: signals.hasPainPost,
        pain_post_content: signals.painPostContent,
        pain_topic: signals.painTopic,
        engaged_with_competitor: signals.engagedWithCompetitor,
        competitor_name: signals.competitorName,
        audience_size: signals.audienceSize,
        is_small_audience: signals.isSmallAudience,
        location: signals.location,
        is_same_location: signals.isSameLocation,
        score_total: scoreData.score,
        score_badge: scoreData.badge,
        updated_at: new Date().toISOString()
      }, { onConflict: 'prospect_id' });

    res.json(formatResponse({
      prospect_id: prospectId,
      ...scoreData,
      raw_signals: signals
    }));
  } catch (error) {
    console.error('[Scoring] Calculate error:', error);
    res.status(500).json(formatError('Erreur lors du calcul du score'));
  }
});

/**
 * POST /api/scoring/calculate-batch
 * Calculate scores for multiple prospects
 */
router.post('/calculate-batch', requireAuth, async (req, res) => {
  try {
    const { prospect_ids, forceAI = false } = req.body;

    if (!prospect_ids || !Array.isArray(prospect_ids)) {
      return res.status(400).json(formatError('prospect_ids requis'));
    }

    // Get prospects
    const { data: prospects, error } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .in('id', prospect_ids)
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Get user config
    const { data: config } = await supabaseAdmin
      .from('user_scoring_config')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    const weights = config?.custom_weights || DEFAULT_WEIGHTS;
    const results = [];

    for (const prospect of prospects) {
      const signals = detectSignalsFromProfile(prospect, config || {});
      const scoreData = calculateScore(signals, weights);

      // Update prospect
      await supabaseAdmin
        .from('prospects')
        .update({
          score_total: scoreData.score,
          score_badge: scoreData.badge,
          score_signals: scoreData.signals,
          last_scored_at: new Date().toISOString()
        })
        .eq('id', prospect.id);

      results.push({
        prospect_id: prospect.id,
        username: prospect.username,
        ...scoreData
      });
    }

    res.json(formatResponse({
      calculated: results.length,
      results
    }));
  } catch (error) {
    console.error('[Scoring] Batch calculate error:', error);
    res.status(500).json(formatError('Erreur lors du calcul'));
  }
});

/**
 * POST /api/scoring/manual-signal/:prospectId
 * Manually add or update a signal
 */
router.post('/manual-signal/:prospectId', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { signalType, value, evidence } = req.body;

    // Verify prospect ownership
    const { data: prospect, error: prospectError } = await supabaseAdmin
      .from('prospects')
      .select('id')
      .eq('id', prospectId)
      .eq('user_id', req.user.id)
      .single();

    if (prospectError || !prospect) {
      return res.status(404).json(formatError('Prospect non trouvé'));
    }

    // Get or create signals record
    let { data: signals } = await supabaseAdmin
      .from('prospect_signals')
      .select('*')
      .eq('prospect_id', prospectId)
      .single();

    if (!signals) {
      const { data: newSignals } = await supabaseAdmin
        .from('prospect_signals')
        .insert({
          prospect_id: prospectId,
          user_id: req.user.id
        })
        .select()
        .single();
      signals = newSignals;
    }

    // Update specific signal
    const updates = { updated_at: new Date().toISOString() };

    switch (signalType) {
      case 'newPosition':
        updates.is_new_position = value;
        updates.new_position_evidence = evidence;
        updates.new_position_source = 'manual';
        break;
      case 'painPost':
        updates.has_pain_post = value;
        updates.pain_post_content = evidence;
        break;
      case 'competitorEngagement':
        updates.engaged_with_competitor = value;
        updates.competitor_name = evidence;
        break;
      case 'sameLocation':
        updates.is_same_location = value;
        updates.location = evidence;
        break;
      default:
        return res.status(400).json(formatError('Signal type invalide'));
    }

    await supabaseAdmin
      .from('prospect_signals')
      .update(updates)
      .eq('prospect_id', prospectId);

    // Recalculate score
    const { data: config } = await supabaseAdmin
      .from('user_scoring_config')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    const { data: updatedSignals } = await supabaseAdmin
      .from('prospect_signals')
      .select('*')
      .eq('prospect_id', prospectId)
      .single();

    const signalsForCalc = {
      isNewPosition: updatedSignals.is_new_position,
      newPositionEvidence: updatedSignals.new_position_evidence,
      hasPainPost: updatedSignals.has_pain_post,
      painPostContent: updatedSignals.pain_post_content,
      engagedWithCompetitor: updatedSignals.engaged_with_competitor,
      competitorName: updatedSignals.competitor_name,
      audienceSize: updatedSignals.audience_size,
      isSmallAudience: updatedSignals.is_small_audience,
      isSameLocation: updatedSignals.is_same_location,
      location: updatedSignals.location
    };

    const weights = config?.custom_weights || DEFAULT_WEIGHTS;
    const scoreData = calculateScore(signalsForCalc, weights);

    // Update both tables
    await supabaseAdmin
      .from('prospects')
      .update({
        score_total: scoreData.score,
        score_badge: scoreData.badge,
        score_signals: scoreData.signals,
        last_scored_at: new Date().toISOString()
      })
      .eq('id', prospectId);

    await supabaseAdmin
      .from('prospect_signals')
      .update({
        score_total: scoreData.score,
        score_badge: scoreData.badge
      })
      .eq('prospect_id', prospectId);

    res.json(formatResponse({
      prospect_id: prospectId,
      ...scoreData
    }, 'Signal mis à jour'));
  } catch (error) {
    console.error('[Scoring] Manual signal error:', error);
    res.status(500).json(formatError('Erreur lors de la mise à jour'));
  }
});

/**
 * GET /api/scoring/stats
 * Get scoring statistics for user's prospects
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { data: prospects, error } = await supabaseAdmin
      .from('prospects')
      .select('score_total, score_badge')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const stats = {
      total: prospects.length,
      hot: prospects.filter(p => p.score_badge === 'hot').length,
      warm: prospects.filter(p => p.score_badge === 'warm').length,
      cold: prospects.filter(p => p.score_badge === 'cold').length,
      unscored: prospects.filter(p => !p.score_badge || p.score_total === 0).length,
      average_score: prospects.length > 0
        ? Math.round(prospects.reduce((sum, p) => sum + (p.score_total || 0), 0) / prospects.length)
        : 0
    };

    res.json(formatResponse(stats));
  } catch (error) {
    console.error('[Scoring] Stats error:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des stats'));
  }
});

/**
 * GET /api/scoring/prospects/:prospectId/signals
 * Get detailed signals for a prospect
 */
router.get('/prospects/:prospectId/signals', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;

    const { data: signals, error } = await supabaseAdmin
      .from('prospect_signals')
      .select('*')
      .eq('prospect_id', prospectId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json(formatResponse(signals || {
      is_new_position: false,
      has_pain_post: false,
      engaged_with_competitor: false,
      is_small_audience: false,
      is_same_location: false,
      score_total: 0,
      score_badge: 'cold'
    }));
  } catch (error) {
    console.error('[Scoring] Get signals error:', error);
    res.status(500).json(formatError('Erreur lors de la récupération des signaux'));
  }
});

export default router;
