/**
 * Routes pour la Catégorisation IA des Réponses
 * SOS Prospection - CRM Dashboard
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import {
  RESPONSE_CATEGORIES,
  categorizeResponse,
  categorizeResponses,
  getCategoryStats,
  suggestAction
} from '../services/responseCategorization.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/categorization/categories
 * Liste toutes les catégories disponibles
 */
router.get('/categories', (req, res) => {
  try {
    const categories = Object.values(RESPONSE_CATEGORIES).map(cat => ({
      id: cat.id,
      label: cat.label,
      emoji: cat.emoji,
      color: cat.color,
      description: cat.description,
      priority: cat.priority,
      suggestedAction: cat.suggestedAction
    }));

    res.json({
      success: true,
      categories: categories.sort((a, b) => a.priority - b.priority)
    });
  } catch (error) {
    console.error('[Categorization] Error getting categories:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categorization/analyze
 * Catégorise une réponse de prospect
 */
router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { response, context } = req.body;

    if (!response) {
      return res.status(400).json({ error: 'Response text is required' });
    }

    const result = await categorizeResponse(response, context || {});
    const action = suggestAction(result);

    res.json({
      success: true,
      categorization: result,
      suggestedAction: action
    });
  } catch (error) {
    console.error('[Categorization] Error analyzing response:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categorization/analyze-batch
 * Catégorise plusieurs réponses en batch
 */
router.post('/analyze-batch', requireAuth, async (req, res) => {
  try {
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array is required' });
    }

    const results = await categorizeResponses(responses);
    const stats = getCategoryStats(results);

    res.json({
      success: true,
      results,
      stats
    });
  } catch (error) {
    console.error('[Categorization] Error batch analyzing:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categorization/prospect/:prospectId
 * Catégorise et sauvegarde la catégorie d'un prospect
 */
router.post('/prospect/:prospectId', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { response } = req.body;
    const userId = req.user.id;

    if (!response) {
      return res.status(400).json({ error: 'Response is required' });
    }

    // Récupérer le contexte du prospect
    const { data: prospect, error: prospectError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .eq('user_id', userId)
      .single();

    if (prospectError || !prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Récupérer l'historique de conversation
    const { data: history } = await supabase
      .from('conversation_history')
      .select('direction, content')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: true })
      .limit(5);

    // Catégoriser
    const context = {
      prospectName: prospect.full_name || prospect.username,
      prospectBio: prospect.bio,
      previousMessages: history || []
    };

    const result = await categorizeResponse(response, context);
    const action = suggestAction(result);

    // Sauvegarder dans prospects
    const { error: updateError } = await supabase
      .from('prospects')
      .update({
        response_category: result.category.id,
        response_category_confidence: result.confidence,
        response_category_reasoning: result.reasoning,
        response_signals: result.signals,
        response_categorized_at: new Date().toISOString(),
        last_prospect_response: response,
        last_prospect_response_at: new Date().toISOString()
      })
      .eq('id', prospectId);

    if (updateError) {
      console.error('[Categorization] Error updating prospect:', updateError);
    }

    // Sauvegarder dans l'historique
    await supabase
      .from('response_categorization_history')
      .insert({
        prospect_id: prospectId,
        user_id: userId,
        response_text: response,
        category: result.category.id,
        confidence: result.confidence,
        reasoning: result.reasoning,
        signals: result.signals,
        objection_type: result.objectionType,
        question_type: result.questionType,
        suggested_tone: result.suggestedTone
      });

    res.json({
      success: true,
      categorization: result,
      suggestedAction: action,
      prospect: {
        id: prospectId,
        name: prospect.full_name || prospect.username
      }
    });
  } catch (error) {
    console.error('[Categorization] Error categorizing prospect:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/categorization/prospect/:prospectId/override
 * Permet de corriger manuellement une catégorie
 */
router.put('/prospect/:prospectId/override', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const { newCategory, reason } = req.body;
    const userId = req.user.id;

    if (!newCategory) {
      return res.status(400).json({ error: 'newCategory is required' });
    }

    // Vérifier que la catégorie existe
    const validCategory = Object.values(RESPONSE_CATEGORIES).find(c => c.id === newCategory);
    if (!validCategory) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    // Récupérer l'ancienne catégorie et vérifier la propriété
    const { data: prospect, error: fetchError } = await supabase
      .from('prospects')
      .select('response_category')
      .eq('id', prospectId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    // Mettre à jour
    const { error: updateError } = await supabase
      .from('prospects')
      .update({
        response_category: newCategory,
        response_category_confidence: 1.0,
        response_category_reasoning: `Corrigé manuellement: ${reason || 'Pas de raison fournie'}`
      })
      .eq('id', prospectId);

    if (updateError) {
      throw updateError;
    }

    // Logger l'override dans l'historique
    await supabase
      .from('response_categorization_history')
      .insert({
        prospect_id: prospectId,
        user_id: userId,
        response_text: '[Override manuel]',
        category: newCategory,
        confidence: 1.0,
        reasoning: reason || 'Correction manuelle',
        was_overridden: true,
        override_category: prospect?.response_category,
        override_reason: reason
      });

    res.json({
      success: true,
      newCategory: validCategory,
      message: 'Catégorie mise à jour'
    });
  } catch (error) {
    console.error('[Categorization] Error overriding category:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/categorization/dashboard/me
 * Récupère les données du dashboard CRM pour l'utilisateur connecté
 * Inclut TOUS les prospects (catégorisés et non-catégorisés)
 */
router.get('/dashboard/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform } = req.query;

    // Récupérer TOUS les prospects de l'utilisateur
    let query = supabase
      .from('prospects')
      .select('*')
      .eq('user_id', userId);

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: prospects, error } = await query;

    if (error) {
      throw error;
    }

    // Calculer les stats
    const stats = {
      total: prospects.length,
      byCategory: {},
      needsAttention: 0,
      hotLeads: 0,
      archived: 0,
      uncategorized: 0
    };

    // Ajouter une catégorie "new" pour les prospects non catégorisés
    stats.byCategory['new'] = {
      id: 'new',
      label: 'Nouveaux',
      emoji: '🆕',
      color: 'bg-blue-100 text-blue-700',
      description: 'Prospects importés, pas encore de réponse',
      priority: 0,
      suggestedAction: 'Envoyer un premier message',
      count: 0,
      prospects: []
    };

    Object.values(RESPONSE_CATEGORIES).forEach(cat => {
      stats.byCategory[cat.id] = {
        ...cat,
        count: 0,
        prospects: []
      };
    });

    prospects.forEach(p => {
      const prospectData = {
        id: p.id,
        name: p.full_name || p.username,
        username: p.username,
        avatar: p.avatar_url,
        platform: p.platform,
        bio: p.bio,
        followers: p.followers,
        lastResponse: p.last_prospect_response,
        lastResponseAt: p.last_prospect_response_at || p.created_at,
        confidence: p.response_category_confidence,
        notes: p.notes,
        icpScore: p.icp_score
      };

      // Si pas de catégorie, mettre dans "new"
      if (!p.response_category) {
        stats.byCategory['new'].count++;
        stats.byCategory['new'].prospects.push(prospectData);
        stats.uncategorized++;
      } else if (stats.byCategory[p.response_category]) {
        stats.byCategory[p.response_category].count++;
        stats.byCategory[p.response_category].prospects.push(prospectData);
      }

      if (p.needs_attention) stats.needsAttention++;
      if (['hot_lead', 'meeting_request'].includes(p.response_category)) stats.hotLeads++;
      if (['not_interested', 'negative'].includes(p.response_category)) stats.archived++;
    });

    // Trier les prospects par date dans chaque catégorie
    Object.keys(stats.byCategory).forEach(key => {
      stats.byCategory[key].prospects.sort((a, b) =>
        new Date(b.lastResponseAt || 0) - new Date(a.lastResponseAt || 0)
      );
    });

    res.json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Categorization] Error getting dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/categorization/prospects/me
 * Liste les prospects avec leur catégorie pour l'utilisateur connecté
 */
router.get('/prospects/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, needsAttention, platform, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('prospects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (category) {
      query = query.eq('response_category', category);
    }

    if (needsAttention === 'true') {
      query = query.eq('needs_attention', true);
    }

    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: prospects, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      prospects: prospects.map(p => ({
        ...p,
        categoryInfo: RESPONSE_CATEGORIES[
          Object.keys(RESPONSE_CATEGORIES).find(k => RESPONSE_CATEGORIES[k].id === p.response_category)
        ] || null
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: prospects.length === parseInt(limit)
      }
    });
  } catch (error) {
    console.error('[Categorization] Error getting prospects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/categorization/mark-handled/:prospectId
 * Marque un prospect comme traité (retire de "needs attention")
 */
router.post('/mark-handled/:prospectId', requireAuth, async (req, res) => {
  try {
    const { prospectId } = req.params;
    const userId = req.user.id;

    // Vérifier que le prospect appartient à l'utilisateur
    const { data: prospect, error: fetchError } = await supabase
      .from('prospects')
      .select('id')
      .eq('id', prospectId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !prospect) {
      return res.status(404).json({ error: 'Prospect not found' });
    }

    const { error } = await supabase
      .from('prospects')
      .update({
        needs_attention: false,
        attention_reason: null
      })
      .eq('id', prospectId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: 'Prospect marqué comme traité'
    });
  } catch (error) {
    console.error('[Categorization] Error marking as handled:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
