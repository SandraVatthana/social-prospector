import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../utils/supabase.js';
import { formatError } from '../utils/helpers.js';

/**
 * Middleware pour vérifier l'authentification JWT
 * Vérifie le token Supabase dans l'en-tête Authorization
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

    // Attacher l'utilisateur à la requête
    req.user = user;
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
        req.user = user;
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
 */
export function requirePlan(allowedPlans) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(formatError('Non authentifié', 'UNAUTHORIZED'));
      }

      // Récupérer le plan de l'utilisateur
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('plan')
        .eq('id', req.user.id)
        .single();

      if (error || !userData) {
        return res.status(403).json(formatError('Utilisateur non trouvé', 'USER_NOT_FOUND'));
      }

      const userPlan = userData.plan || 'free';

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
