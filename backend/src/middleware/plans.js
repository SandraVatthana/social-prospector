import { formatError } from '../utils/helpers.js';

/**
 * Middleware pour vérifier que l'utilisateur a un plan Agence ou Agency+
 */
export function requireAgencyPlan(req, res, next) {
  const userPlan = req.user?.plan;

  if (!['agence', 'agency_plus'].includes(userPlan)) {
    return res.status(403).json(formatError(
      'Cette fonctionnalité nécessite un plan Agence ou Agency+',
      'PLAN_REQUIRED'
    ));
  }

  next();
}

/**
 * Middleware pour vérifier que l'utilisateur a un plan Agency+
 */
export function requireAgencyPlusPlan(req, res, next) {
  const userPlan = req.user?.plan;

  if (userPlan !== 'agency_plus') {
    return res.status(403).json(formatError(
      'Cette fonctionnalité nécessite un plan Agency+',
      'PLAN_REQUIRED'
    ));
  }

  next();
}

/**
 * Récupère le nombre max de clients selon le plan
 */
export function getMaxClients(plan) {
  switch (plan) {
    case 'agence':
      return 10;
    case 'agency_plus':
      return Infinity;
    default:
      return 0;
  }
}

/**
 * Vérifie si l'utilisateur peut ajouter un nouveau client
 */
export async function canAddClient(supabase, userId, plan) {
  const maxClients = getMaxClients(plan);

  if (maxClients === 0) {
    return { allowed: false, reason: 'Plan Solo - clients non supportés' };
  }

  if (maxClients === Infinity) {
    return { allowed: true };
  }

  // Compter les clients existants
  const { count, error } = await supabase
    .from('agency_clients')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { allowed: false, reason: 'Erreur lors de la vérification' };
  }

  if (count >= maxClients) {
    return {
      allowed: false,
      reason: `Limite de ${maxClients} clients atteinte`,
      current: count,
      max: maxClients,
    };
  }

  return { allowed: true, current: count, max: maxClients };
}
