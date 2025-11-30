/**
 * Middleware de vérification des limites par plan
 * Vérifie les quotas horaires, quotidiens et mensuels
 */

import { getUserLimits, isUnlimitedUser } from '../config/planLimits.js';
import { supabase } from '../utils/supabase.js';

/**
 * Compter les prospects créés dans une période
 */
async function countProspects(userId, startDate) {
  const { count, error } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('Error counting prospects:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Compter les messages créés dans une période
 */
async function countMessages(userId, startDate) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('Error counting messages:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Obtenir les dates de début pour chaque période
 */
function getPeriodStartDates() {
  const now = new Date();

  // Début de l'heure courante
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  // Début du jour (minuit)
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  // Début du mois
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return { hourStart, dayStart, monthStart };
}

/**
 * Calculer le temps restant avant le reset
 */
function getTimeUntilReset(type) {
  const now = new Date();

  switch (type) {
    case 'hourly':
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      return Math.ceil((nextHour - now) / 60000); // minutes

    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return Math.ceil((tomorrow - now) / 3600000); // heures

    case 'monthly':
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return Math.ceil((nextMonth - now) / 86400000); // jours

    default:
      return 0;
  }
}

/**
 * Middleware pour vérifier les limites de prospects
 */
export const checkProspectLimits = async (req, res, next) => {
  try {
    const user = req.user;

    // Utilisateurs illimités : bypass
    if (isUnlimitedUser(user)) {
      return next();
    }

    const limits = getUserLimits(user);
    const { hourStart, dayStart, monthStart } = getPeriodStartDates();

    // 1. Vérifier limite horaire
    const hourlyCount = await countProspects(user.id, hourStart);
    if (hourlyCount >= limits.prospects_per_hour) {
      return res.status(429).json({
        error: 'HOURLY_LIMIT',
        message: `Limite horaire atteinte (${limits.prospects_per_hour}/h)`,
        limit: limits.prospects_per_hour,
        current: hourlyCount,
        retry_after_minutes: getTimeUntilReset('hourly'),
      });
    }

    // 2. Vérifier limite quotidienne
    const dailyCount = await countProspects(user.id, dayStart);
    if (dailyCount >= limits.prospects_per_day) {
      return res.status(429).json({
        error: 'DAILY_LIMIT',
        message: `Limite quotidienne atteinte (${limits.prospects_per_day}/jour)`,
        limit: limits.prospects_per_day,
        current: dailyCount,
        retry_after_hours: getTimeUntilReset('daily'),
      });
    }

    // 3. Vérifier limite mensuelle
    const monthlyCount = await countProspects(user.id, monthStart);
    if (monthlyCount >= limits.prospects_per_month) {
      return res.status(429).json({
        error: 'MONTHLY_LIMIT',
        message: `Limite mensuelle atteinte (${limits.prospects_per_month}/mois)`,
        limit: limits.prospects_per_month,
        current: monthlyCount,
        retry_after_days: getTimeUntilReset('monthly'),
        upgrade_available: user.plan !== 'agency_plus',
      });
    }

    // Ajouter les infos de quota à la requête pour utilisation ultérieure
    req.quotaInfo = {
      prospects: {
        hourly: { used: hourlyCount, limit: limits.prospects_per_hour },
        daily: { used: dailyCount, limit: limits.prospects_per_day },
        monthly: { used: monthlyCount, limit: limits.prospects_per_month },
      },
    };

    next();
  } catch (error) {
    console.error('Error checking prospect limits:', error);
    // En cas d'erreur, on laisse passer (fail open)
    next();
  }
};

/**
 * Middleware pour vérifier les limites de messages
 */
export const checkMessageLimits = async (req, res, next) => {
  try {
    const user = req.user;

    // Utilisateurs illimités : bypass
    if (isUnlimitedUser(user)) {
      return next();
    }

    const limits = getUserLimits(user);
    const { hourStart, dayStart, monthStart } = getPeriodStartDates();

    // 1. Vérifier limite horaire
    const hourlyCount = await countMessages(user.id, hourStart);
    if (hourlyCount >= limits.messages_per_hour) {
      return res.status(429).json({
        error: 'HOURLY_LIMIT',
        message: `Limite horaire de messages atteinte (${limits.messages_per_hour}/h)`,
        limit: limits.messages_per_hour,
        current: hourlyCount,
        retry_after_minutes: getTimeUntilReset('hourly'),
      });
    }

    // 2. Vérifier limite quotidienne
    const dailyCount = await countMessages(user.id, dayStart);
    if (dailyCount >= limits.messages_per_day) {
      return res.status(429).json({
        error: 'DAILY_LIMIT',
        message: `Limite quotidienne de messages atteinte (${limits.messages_per_day}/jour)`,
        limit: limits.messages_per_day,
        current: dailyCount,
        retry_after_hours: getTimeUntilReset('daily'),
      });
    }

    // 3. Vérifier limite mensuelle
    const monthlyCount = await countMessages(user.id, monthStart);
    if (monthlyCount >= limits.messages_per_month) {
      return res.status(429).json({
        error: 'MONTHLY_LIMIT',
        message: `Limite mensuelle de messages atteinte (${limits.messages_per_month}/mois)`,
        limit: limits.messages_per_month,
        current: monthlyCount,
        retry_after_days: getTimeUntilReset('monthly'),
        upgrade_available: user.plan !== 'agency_plus',
      });
    }

    // Ajouter les infos de quota à la requête
    req.quotaInfo = {
      ...req.quotaInfo,
      messages: {
        hourly: { used: hourlyCount, limit: limits.messages_per_hour },
        daily: { used: dailyCount, limit: limits.messages_per_day },
        monthly: { used: monthlyCount, limit: limits.messages_per_month },
      },
    };

    next();
  } catch (error) {
    console.error('Error checking message limits:', error);
    next();
  }
};

/**
 * Endpoint pour récupérer le statut des quotas
 */
export const getQuotaStatus = async (req, res) => {
  try {
    const user = req.user;
    const limits = getUserLimits(user);
    const { hourStart, dayStart, monthStart } = getPeriodStartDates();

    const [prospectsHourly, prospectsDaily, prospectsMonthly, messagesHourly, messagesDaily, messagesMonthly] =
      await Promise.all([
        countProspects(user.id, hourStart),
        countProspects(user.id, dayStart),
        countProspects(user.id, monthStart),
        countMessages(user.id, hourStart),
        countMessages(user.id, dayStart),
        countMessages(user.id, monthStart),
      ]);

    res.json({
      data: {
        plan: user.plan || 'free',
        is_unlimited: isUnlimitedUser(user),
        prospects: {
          hourly: { used: prospectsHourly, limit: limits.prospects_per_hour },
          daily: { used: prospectsDaily, limit: limits.prospects_per_day },
          monthly: { used: prospectsMonthly, limit: limits.prospects_per_month },
        },
        messages: {
          hourly: { used: messagesHourly, limit: limits.messages_per_hour },
          daily: { used: messagesDaily, limit: limits.messages_per_day },
          monthly: { used: messagesMonthly, limit: limits.messages_per_month },
        },
        limits: {
          clients: limits.clients,
          voice_profiles: limits.voice_profiles,
        },
        reset_times: {
          hourly: getTimeUntilReset('hourly'),
          daily: getTimeUntilReset('daily'),
          monthly: getTimeUntilReset('monthly'),
        },
      },
    });
  } catch (error) {
    console.error('Error getting quota status:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des quotas' });
  }
};

export default { checkProspectLimits, checkMessageLimits, getQuotaStatus };
