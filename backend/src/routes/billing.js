import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { formatResponse, formatError } from '../utils/helpers.js';
import { supabaseAdmin } from '../utils/supabase.js';
import lemonSqueezy, { PLANS } from '../services/lemonSqueezy.js';

const router = Router();

/**
 * GET /api/billing/plans
 * Liste des plans disponibles (public)
 */
router.get('/plans', optionalAuth, (req, res) => {
  const plans = Object.values(PLANS).map(plan => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    limits: plan.limits,
    features: plan.features,
    popular: plan.popular || false,
  }));

  res.json(formatResponse(plans));
});

/**
 * GET /api/billing/status
 * Statut d'abonnement de l'utilisateur
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('plan, subscription_id, subscription_status, subscription_ends_at, lemon_customer_id')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    const plan = PLANS[user.plan] || PLANS.free;
    
    res.json(formatResponse({
      plan: {
        id: plan.id,
        name: plan.name,
        price: plan.price,
        limits: plan.limits,
        features: plan.features,
      },
      subscription: {
        id: user.subscription_id,
        status: user.subscription_status || 'none',
        ends_at: user.subscription_ends_at,
        is_active: ['active', 'on_trial'].includes(user.subscription_status),
        is_cancelled: user.subscription_status === 'cancelled',
      },
      has_customer_id: !!user.lemon_customer_id,
    }));
  } catch (error) {
    console.error('Error fetching billing status:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du statut', 'BILLING_ERROR'));
  }
});

/**
 * GET /api/billing/usage
 * Usage actuel vs limites du plan
 */
router.get('/usage', requireAuth, async (req, res) => {
  try {
    // Récupérer le plan de l'utilisateur
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    const plan = PLANS[user.plan] || PLANS.free;
    const limits = plan.limits;

    // Compter l'usage actuel
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Prospects ce mois
    const { count: monthlyProspects } = await supabaseAdmin
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', startOfMonth);

    // Prospects aujourd'hui
    const { count: dailyProspects } = await supabaseAdmin
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', startOfDay);

    // Prospects cette heure
    const { count: hourlyProspects } = await supabaseAdmin
      .from('prospects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', oneHourAgo);

    // Profils voix
    const { count: voiceProfiles } = await supabaseAdmin
      .from('voice_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Comptes sociaux
    const { count: socialAccounts } = await supabaseAdmin
      .from('social_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Recherches sauvegardées
    const { count: savedSearches } = await supabaseAdmin
      .from('searches')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    res.json(formatResponse({
      plan: plan.id,
      usage: {
        prospects_ce_mois: {
          used: monthlyProspects || 0,
          limit: limits.prospects_par_mois,
          percentage: limits.prospects_par_mois > 0 
            ? Math.round(((monthlyProspects || 0) / limits.prospects_par_mois) * 100)
            : 0,
        },
        prospects_aujourdhui: {
          used: dailyProspects || 0,
          limit: limits.prospects_par_jour,
          percentage: limits.prospects_par_jour > 0
            ? Math.round(((dailyProspects || 0) / limits.prospects_par_jour) * 100)
            : 0,
        },
        prospects_cette_heure: {
          used: hourlyProspects || 0,
          limit: limits.prospects_par_heure,
          percentage: limits.prospects_par_heure > 0
            ? Math.round(((hourlyProspects || 0) / limits.prospects_par_heure) * 100)
            : 0,
        },
        profils_voix: {
          used: voiceProfiles || 0,
          limit: limits.voix,
          percentage: limits.voix > 0
            ? Math.round(((voiceProfiles || 0) / limits.voix) * 100)
            : 0,
        },
        comptes_sociaux: {
          used: socialAccounts || 0,
          limit: limits.comptes_sociaux,
          percentage: limits.comptes_sociaux > 0
            ? Math.round(((socialAccounts || 0) / limits.comptes_sociaux) * 100)
            : 0,
        },
        recherches: {
          used: savedSearches || 0,
          limit: limits.recherches_sauvegardees,
          percentage: limits.recherches_sauvegardees > 0
            ? Math.round(((savedSearches || 0) / limits.recherches_sauvegardees) * 100)
            : 0,
        },
      },
    }));
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json(formatError('Erreur lors de la récupération de l\'usage', 'BILLING_ERROR'));
  }
});

/**
 * POST /api/billing/checkout
 * Crée une session de checkout Lemon Squeezy
 */
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { plan_id } = req.body;

    if (!plan_id || !PLANS[plan_id]) {
      return res.status(400).json(formatError('Plan invalide', 'VALIDATION_ERROR'));
    }

    const plan = PLANS[plan_id];
    
    if (!plan.variant_id) {
      return res.status(400).json(formatError('Ce plan ne nécessite pas de paiement', 'VALIDATION_ERROR'));
    }

    // Récupérer les infos user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    // Créer le checkout
    const checkoutUrl = await lemonSqueezy.createCheckout(
      plan.variant_id,
      req.user.id,
      user.email,
      user.full_name
    );

    res.json(formatResponse({ checkout_url: checkoutUrl }));
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json(formatError('Erreur lors de la création du checkout', 'CHECKOUT_ERROR'));
  }
});

/**
 * POST /api/billing/portal
 * Récupère l'URL du portail client Lemon Squeezy
 */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('lemon_customer_id')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    if (!user.lemon_customer_id) {
      return res.status(400).json(formatError('Aucun abonnement actif', 'NO_SUBSCRIPTION'));
    }

    const portalUrl = await lemonSqueezy.getCustomerPortalUrl(user.lemon_customer_id);
    
    res.json(formatResponse({ portal_url: portalUrl }));
  } catch (error) {
    console.error('Error getting portal URL:', error);
    res.status(500).json(formatError('Erreur lors de la récupération du portail', 'PORTAL_ERROR'));
  }
});

/**
 * POST /api/billing/cancel
 * Annule l'abonnement (reste actif jusqu'à fin de période)
 */
router.post('/cancel', requireAuth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_id')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    if (!user.subscription_id) {
      return res.status(400).json(formatError('Aucun abonnement à annuler', 'NO_SUBSCRIPTION'));
    }

    await lemonSqueezy.cancelSubscription(user.subscription_id);

    // Mettre à jour le statut en base
    await supabaseAdmin
      .from('users')
      .update({ subscription_status: 'cancelled' })
      .eq('id', req.user.id);

    res.json(formatResponse({ cancelled: true }, 'Abonnement annulé. Il restera actif jusqu\'à la fin de la période.'));
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json(formatError('Erreur lors de l\'annulation', 'CANCEL_ERROR'));
  }
});

/**
 * POST /api/billing/resume
 * Réactive un abonnement annulé
 */
router.post('/resume', requireAuth, async (req, res) => {
  try {
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription_id, subscription_status')
      .eq('id', req.user.id)
      .single();

    if (userError) throw userError;

    if (!user.subscription_id || user.subscription_status !== 'cancelled') {
      return res.status(400).json(formatError('Aucun abonnement annulé à réactiver', 'NO_CANCELLED_SUBSCRIPTION'));
    }

    await lemonSqueezy.resumeSubscription(user.subscription_id);

    // Mettre à jour le statut en base
    await supabaseAdmin
      .from('users')
      .update({ subscription_status: 'active' })
      .eq('id', req.user.id);

    res.json(formatResponse({ resumed: true }, 'Abonnement réactivé !'));
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json(formatError('Erreur lors de la réactivation', 'RESUME_ERROR'));
  }
});

/**
 * POST /api/billing/webhook
 * Webhook Lemon Squeezy (sans auth, vérifié par signature)
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-signature'];
    const rawBody = JSON.stringify(req.body);

    // Vérifier la signature
    if (!lemonSqueezy.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventName = event.meta?.event_name;
    const data = event.data;

    console.log(`Lemon Squeezy webhook: ${eventName}`);

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated': {
        const userId = event.meta?.custom_data?.user_id;
        const subscriptionId = data.id;
        const status = data.attributes.status;
        const variantId = data.attributes.variant_id?.toString();
        const customerId = data.attributes.customer_id?.toString();
        const endsAt = data.attributes.ends_at;

        // Trouver le plan correspondant
        const plan = lemonSqueezy.getPlanByVariantId(variantId);

        if (userId) {
          await supabaseAdmin
            .from('users')
            .update({
              plan: plan?.id || 'solo',
              subscription_id: subscriptionId,
              subscription_status: status,
              subscription_ends_at: endsAt,
              lemon_customer_id: customerId,
            })
            .eq('id', userId);

          console.log(`Updated user ${userId} to plan ${plan?.id || 'solo'}`);
        }
        break;
      }

      case 'subscription_cancelled': {
        const subscriptionId = data.id;
        
        // Trouver l'utilisateur par subscription_id
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'cancelled',
            })
            .eq('id', user.id);

          console.log(`Subscription cancelled for user ${user.id}`);
        }
        break;
      }

      case 'subscription_expired': {
        const subscriptionId = data.id;
        
        // Trouver l'utilisateur et le repasser en free
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({
              plan: 'free',
              subscription_id: null,
              subscription_status: 'expired',
              subscription_ends_at: null,
            })
            .eq('id', user.id);

          console.log(`Subscription expired for user ${user.id}, reverted to free`);
        }
        break;
      }

      case 'subscription_payment_failed': {
        const subscriptionId = data.id;
        
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('subscription_id', subscriptionId)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', user.id);

          console.log(`Payment failed for user ${user.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventName}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
