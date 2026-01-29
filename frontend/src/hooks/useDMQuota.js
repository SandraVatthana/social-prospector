import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_LIMITS, UNLIMITED_EMAILS, getUserLimits, isUnlimitedUser } from '../config/planLimits';

const STORAGE_KEY = 'dm_quota_tracking';
const COOLDOWN_MINUTES = 30;

/**
 * Hook pour tracker les envois de DMs et protéger contre les bans
 * Les limites varient selon le plan de l'utilisateur
 */
export function useDMQuota() {
  const { user } = useAuth();

  // Utiliser la config centralisée
  const isUnlimited = isUnlimitedUser(user);
  const userPlan = user?.plan || 'free';
  const limits = getUserLimits(user);

  // Limites pour les messages (DMs)
  const HOURLY_LIMIT = limits.messages_per_hour;
  const DAILY_LIMIT = limits.messages_per_day;

  const [quota, setQuota] = useState({
    hourly: { sent: 0, resetAt: null },
    daily: { sent: 0, resetAt: null },
    cooldownUntil: null,
    lastSentAt: null,
  });

  const [warning, setWarning] = useState(null);

  // Charger les données depuis localStorage
  useEffect(() => {
    loadQuotaFromStorage();

    // Vérifier toutes les minutes pour les resets
    const interval = setInterval(() => {
      loadQuotaFromStorage();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const loadQuotaFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        initializeQuota();
        return;
      }

      const data = JSON.parse(stored);
      const now = Date.now();

      // Reset horaire si nécessaire
      if (data.hourly.resetAt && now >= data.hourly.resetAt) {
        data.hourly.sent = 0;
        data.hourly.resetAt = getNextHourReset();
      }

      // Reset quotidien si nécessaire (à minuit)
      if (data.daily.resetAt && now >= data.daily.resetAt) {
        data.daily.sent = 0;
        data.daily.resetAt = getMidnightReset();
      }

      // Vérifier si le cooldown est terminé
      if (data.cooldownUntil && now >= data.cooldownUntil) {
        data.cooldownUntil = null;
      }

      setQuota(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error loading quota:', error);
      initializeQuota();
    }
  }, []);

  const initializeQuota = () => {
    const initial = {
      hourly: { sent: 0, resetAt: getNextHourReset() },
      daily: { sent: 0, resetAt: getMidnightReset() },
      cooldownUntil: null,
      lastSentAt: null,
    };
    setQuota(initial);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  };

  // Enregistrer un envoi de DM
  const recordSend = useCallback(() => {
    setQuota(prev => {
      const now = Date.now();
      const newQuota = {
        ...prev,
        hourly: {
          sent: prev.hourly.sent + 1,
          resetAt: prev.hourly.resetAt,
        },
        daily: {
          sent: prev.daily.sent + 1,
          resetAt: prev.daily.resetAt,
        },
        lastSentAt: now,
      };

      // Vérifier si on atteint la limite horaire
      if (newQuota.hourly.sent >= HOURLY_LIMIT) {
        newQuota.cooldownUntil = now + COOLDOWN_MINUTES * 60 * 1000;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuota));

      // Déclencher les warnings appropriés
      checkAndTriggerWarnings(newQuota);

      return newQuota;
    });
  }, [HOURLY_LIMIT]);

  // Vérifier et déclencher les warnings
  const checkAndTriggerWarnings = (quotaData) => {
    const { hourly, daily } = quotaData;

    // Limite horaire atteinte
    if (hourly.sent >= HOURLY_LIMIT) {
      setWarning({
        type: 'error',
        title: 'Limite horaire atteinte !',
        message: 'Attends avant d\'envoyer d\'autres DMs pour éviter les restrictions Instagram.',
        icon: 'stop',
      });
      return;
    }

    // Limite quotidienne atteinte
    if (daily.sent >= DAILY_LIMIT) {
      setWarning({
        type: 'error',
        title: 'Limite quotidienne atteinte !',
        message: 'Reviens demain pour éviter un ban.',
        icon: 'stop',
      });
      return;
    }

    // Approche limite horaire (4/5)
    if (hourly.sent === HOURLY_LIMIT - 1) {
      setWarning({
        type: 'warning',
        title: 'Plus qu\'1 DM cette heure',
        message: 'Fais une pause de 20 min après pour éviter les restrictions Instagram.',
        icon: 'alert',
      });
      return;
    }

    // Approche limite quotidienne (35/40)
    if (daily.sent >= DAILY_LIMIT - 5 && daily.sent < DAILY_LIMIT) {
      setWarning({
        type: 'warning',
        title: 'Tu approches de la limite quotidienne',
        message: `Plus que ${DAILY_LIMIT - daily.sent} DMs aujourd'hui. Garde-en pour demain !`,
        icon: 'alert',
      });
      return;
    }

    setWarning(null);
  };

  // Effacer le warning
  const clearWarning = useCallback(() => {
    setWarning(null);
  }, []);

  // Vérifier si l'envoi est autorisé
  const canSend = useCallback(() => {
    const now = Date.now();

    // En cooldown
    if (quota.cooldownUntil && now < quota.cooldownUntil) {
      return false;
    }

    // Limite horaire atteinte
    if (quota.hourly.sent >= HOURLY_LIMIT) {
      return false;
    }

    // Limite quotidienne atteinte
    if (quota.daily.sent >= DAILY_LIMIT) {
      return false;
    }

    return true;
  }, [quota]);

  // Calculer le temps restant avant déblocage
  const getTimeUntilUnlock = useCallback(() => {
    const now = Date.now();

    // Si en cooldown horaire
    if (quota.cooldownUntil && now < quota.cooldownUntil) {
      return {
        type: 'cooldown',
        remaining: quota.cooldownUntil - now,
        formatted: formatTimeRemaining(quota.cooldownUntil - now),
      };
    }

    // Si limite horaire atteinte, attendre le reset
    if (quota.hourly.sent >= HOURLY_LIMIT && quota.hourly.resetAt) {
      return {
        type: 'hourly',
        remaining: quota.hourly.resetAt - now,
        formatted: formatTimeRemaining(quota.hourly.resetAt - now),
      };
    }

    // Si limite quotidienne atteinte
    if (quota.daily.sent >= DAILY_LIMIT && quota.daily.resetAt) {
      return {
        type: 'daily',
        remaining: quota.daily.resetAt - now,
        formatted: formatTimeRemaining(quota.daily.resetAt - now),
      };
    }

    return null;
  }, [quota]);

  // Calculer le statut (couleur)
  const getStatus = useCallback(() => {
    const hourlyPercent = (quota.hourly.sent / HOURLY_LIMIT) * 100;
    const dailyPercent = (quota.daily.sent / DAILY_LIMIT) * 100;
    const maxPercent = Math.max(hourlyPercent, dailyPercent);

    if (maxPercent >= 100) return 'red';
    if (maxPercent >= 80) return 'orange';
    return 'green';
  }, [quota]);

  // Calculer le temps avant le prochain envoi autorisé (pour la file d'attente)
  const calculateNextSendTime = useCallback((queuePosition = 0) => {
    const now = Date.now();
    const spacingMs = (60 * 60 * 1000) / HOURLY_LIMIT; // Temps entre chaque DM

    // Si pas de dernier envoi, on peut envoyer maintenant
    if (!quota.lastSentAt) {
      return now + (queuePosition * spacingMs);
    }

    // Calculer le prochain slot disponible
    const nextSlot = quota.lastSentAt + spacingMs;
    const baseTime = Math.max(now, nextSlot);

    // Ajouter le délai pour la position dans la queue
    return baseTime + (queuePosition * spacingMs);
  }, [quota.lastSentAt, HOURLY_LIMIT]);

  // Obtenir l'espacement recommandé entre les DMs (en ms)
  const getSpacingMs = useCallback(() => {
    return (60 * 60 * 1000) / HOURLY_LIMIT;
  }, [HOURLY_LIMIT]);

  return {
    quota,
    warning,
    clearWarning,
    recordSend,
    canSend: canSend(),
    timeUntilUnlock: getTimeUntilUnlock(),
    status: getStatus(),
    isUnlimited,
    userPlan,
    limits: {
      hourly: HOURLY_LIMIT,
      daily: DAILY_LIMIT,
    },
    // Nouveaux exports pour la file d'attente
    calculateNextSendTime,
    getSpacingMs,
    lastSentAt: quota.lastSentAt,
  };
}

// Helpers
function getNextHourReset() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 1);
  return now.getTime();
}

function getMidnightReset() {
  const now = new Date();
  now.setHours(24, 0, 0, 0);
  return now.getTime();
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default useDMQuota;
