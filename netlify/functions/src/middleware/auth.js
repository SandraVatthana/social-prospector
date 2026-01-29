import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../utils/supabase.js';
import { formatError } from '../utils/helpers.js';

/**
 * Middleware pour vérifier l'authentification JWT
 * Vérifie le token Supabase dans l'en-tête Authorization
 * Récupère aussi les infos d'abonnement pour vérifier le plan actif
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(formatError('Token manquant', 'UNAUTHORIZED'));
    }

    const token = authHeader.split(' ')[1];

    // Vérifier le token avec Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json(formatError('Token invalide', 'INVALID_TOKEN'));
    }

    // Récupérer les infos utilisateur avec abonnement
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('plan, subscription_status, subscription_ends_at, email')
      .eq('id', user.id)
      .single();

    // Déterminer le plan effectif en vérifiant l'abonnement
    let effectivePlan = 'free';

    if (userData) {
      const now = new Date();
      const subscriptionEndsAt = userData.subscription_ends_at
        ? new Date(userData.subscription_ends_at)
        : null;

      // Le plan est valide SEULEMENT si:
      // 1. subscription_status est 'active' OU
      // 2. subscription_ends_at est dans le futur (période de grâce après annulation)
      const isSubscriptionActive = userData.subscription_status === 'active';
      const isInGracePeriod = subscriptionEndsAt && subscriptionEndsAt > now;

      if (userData.plan && userData.plan !== 'free' && (isSubscriptionActive || isInGracePeriod)) {
        effectivePlan = userData.plan;
      } else if (userData.plan && userData.plan !== 'free') {
        // L'abonnement a expiré - on log pour debug
        console.log(`[Auth] User ${user.id} has plan "${userData.plan}" but subscription expired. Forcing to free.`);
      }
    }

    // Attacher l'utilisateur à la requête avec le plan effectif
    req.user = {
      ...user,
      email: userData?.email || user.email,
      plan: effectivePlan,
      subscription_status: userData?.subscription_status,
      subscription_ends_at: userData?.subscription_ends_at,
    };
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json(formatError('Erreur d\'authentification', 'AUTH_ERROR'));
  }
}

/**
 * Middleware optionnel - n'échoue pas si pas de token
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        // Récupérer les infos utilisateur avec abonnement
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('plan, subscription_status, subscription_ends_at, email')
          .eq('id', user.id)
          .single();

        // Déterminer le plan effectif
        let effectivePlan = 'free';

        if (userData) {
          const now = new Date();
          const subscriptionEndsAt = userData.subscription_ends_at
            ? new Date(userData.subscription_ends_at)
            : null;

          const isSubscriptionActive = userData.subscription_status === 'active';
          const isInGracePeriod = subscriptionEndsAt && subscriptionEndsAt > now;

          if (userData.plan && userData.plan !== 'free' && (isSubscriptionActive || isInGracePeriod)) {
            effectivePlan = userData.plan;
          }
        }

        req.user = {
          ...user,
          email: userData?.email || user.email,
          plan: effectivePlan,
          subscription_status: userData?.subscription_status,
          subscription_ends_at: userData?.subscription_ends_at,
        };
        req.token = token;
      }
    }

    next();
  } catch (error) {
    // Ignore errors - continue without auth
    next();
  }
}

/**
 * Middleware pour vérifier le plan de l'utilisateur
 * Utilise le plan effectif déjà calculé par requireAuth
 */
export function requirePlan(allowedPlans) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(formatError('Non authentifié', 'UNAUTHORIZED'));
      }

      // Utiliser le plan effectif déjà calculé par requireAuth
      const userPlan = req.user.plan || 'free';

      if (!allowedPlans.includes(userPlan)) {
        return res.status(403).json(
          formatError(
            'Cette fonctionnalité nécessite un plan supérieur',
            'PLAN_REQUIRED',
            { required: allowedPlans, current: userPlan }
          )
        );
      }

      req.userPlan = userPlan;
      next();
    } catch (error) {
      console.error('Plan check error:', error);
      return res.status(500).json(formatError('Erreur vérification plan', 'PLAN_ERROR'));
    }
  };
}
