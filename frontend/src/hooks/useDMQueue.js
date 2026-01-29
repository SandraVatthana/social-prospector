import { useState, useEffect, useCallback, useRef } from 'react';
import { useDMQuota } from './useDMQuota';

const STORAGE_KEY = 'dm_queue';
const NOTIFICATION_SOUND_URL = '/notification.mp3'; // Son optionnel

/**
 * Hook pour gérer la file d'attente de DMs
 * Permet d'espacer les envois selon les quotas pour éviter les bans
 */
export function useDMQueue() {
  const { calculateNextSendTime, getSpacingMs, recordSend, canSend, limits } = useDMQuota();

  const [queue, setQueue] = useState([]);
  const [isActive, setIsActive] = useState(true);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    browserNotifEnabled: true,
    autoAdvance: true,
  });
  const [currentReady, setCurrentReady] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState(null);

  const audioRef = useRef(null);
  const timerRef = useRef(null);

  // Charger depuis localStorage au mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    saveToStorage();
  }, [queue, isActive, settings]);

  // Timer pour mettre à jour le countdown et déclencher les notifications
  useEffect(() => {
    if (queue.length === 0 || !isActive) {
      setTimeUntilNext(null);
      setCurrentReady(false);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const firstItem = queue[0];
      const nextSendTime = calculateNextSendTime(0);
      const remaining = nextSendTime - now;

      if (remaining <= 0) {
        setCurrentReady(true);
        setTimeUntilNext(0);

        // Déclencher notification si pas déjà prêt
        if (!currentReady) {
          triggerNotification(firstItem);
        }
      } else {
        setCurrentReady(false);
        setTimeUntilNext(remaining);
      }
    };

    // Update immédiat puis toutes les secondes
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [queue, isActive, calculateNextSendTime, currentReady]);

  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        setQueue(data.queue || []);
        setIsActive(data.isActive !== false);
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.error('Error loading queue from storage:', error);
    }
  };

  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        queue,
        isActive,
        settings,
      }));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
    }
  };

  // Déclencher les notifications (son + browser)
  const triggerNotification = useCallback((item) => {
    // Son
    if (settings.soundEnabled) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
        }
        audioRef.current.play().catch(() => {
          // Ignorer les erreurs audio (autoplay bloqué, fichier manquant, etc.)
        });
      } catch {
        // Ignorer
      }
    }

    // Notification browser
    if (settings.browserNotifEnabled && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('DM prêt à envoyer !', {
          body: `Message pour @${item.prospectUsername}`,
          icon: '/logofinal.png',
          tag: 'dm-queue',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, [settings.soundEnabled, settings.browserNotifEnabled]);

  // Ajouter un message à la queue
  const addToQueue = useCallback((item) => {
    const newItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      messageId: item.messageId,
      prospectId: item.prospectId,
      prospectUsername: item.prospectUsername,
      prospectAvatar: item.prospectAvatar,
      platform: item.platform || 'instagram',
      content: item.content,
      addedAt: Date.now(),
    };

    setQueue(prev => {
      const newQueue = [...prev, newItem];
      // Calculer l'heure estimée d'envoi
      const position = newQueue.length - 1;
      const estimatedTime = calculateNextSendTime(position);
      const waitMinutes = Math.ceil((estimatedTime - Date.now()) / 60000);

      return newQueue;
    });

    // Retourner l'info pour le toast
    const position = queue.length + 1;
    const estimatedTime = calculateNextSendTime(queue.length);
    const waitMinutes = Math.max(0, Math.ceil((estimatedTime - Date.now()) / 60000));

    return {
      position,
      waitMinutes,
      estimatedTime,
    };
  }, [queue.length, calculateNextSendTime]);

  // Retirer un item de la queue
  const removeFromQueue = useCallback((itemId) => {
    setQueue(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Réordonner la queue (drag & drop)
  const reorderQueue = useCallback((fromIndex, toIndex) => {
    setQueue(prev => {
      const newQueue = [...prev];
      const [removed] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, removed);
      return newQueue;
    });
  }, []);

  // Passer au suivant (skip)
  const skip = useCallback(() => {
    setQueue(prev => prev.slice(1));
    setCurrentReady(false);
  }, []);

  // Reporter de X minutes
  const postpone = useCallback((minutes = 5) => {
    // On ajoute un délai en mettant à jour le lastSentAt virtuellement
    // En pratique, on déplace juste l'item à la fin de la queue
    setQueue(prev => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return [...rest, { ...first, postponedAt: Date.now() }];
    });
    setCurrentReady(false);
  }, []);

  // Marquer comme envoyé et passer au suivant
  const markAsSent = useCallback(() => {
    recordSend(); // Enregistrer dans le quota
    setQueue(prev => prev.slice(1));
    setCurrentReady(false);
  }, [recordSend]);

  // Construire l'URL du profil selon la plateforme
  const getProfileUrl = useCallback((item) => {
    const username = item.prospectUsername?.replace('@', '');

    switch (item.platform?.toLowerCase()) {
      case 'instagram':
        return `https://ig.me/m/${username}`;
      case 'tiktok':
        return `https://tiktok.com/@${username}`;
      case 'linkedin':
        return `https://linkedin.com/in/${username}`;
      case 'twitter':
      case 'x':
        return `https://twitter.com/messages/compose?recipient_id=${username}`;
      default:
        return `https://instagram.com/${username}`;
    }
  }, []);

  // Copier le message et ouvrir le profil
  const copyAndOpen = useCallback(async (item) => {
    try {
      await navigator.clipboard.writeText(item.content);
      const url = getProfileUrl(item);
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    } catch (error) {
      console.error('Error copying message:', error);
      // Fallback
      try {
        const textarea = document.createElement('textarea');
        textarea.value = item.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        const url = getProfileUrl(item);
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
      } catch {
        return false;
      }
    }
  }, [getProfileUrl]);

  // Toggle pause/play
  const toggleActive = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // Mettre à jour les settings
  const updateSettings = useCallback((newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Demander la permission de notification
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  // Calculer les heures estimées pour chaque item
  const queueWithEstimates = queue.map((item, index) => ({
    ...item,
    estimatedTime: calculateNextSendTime(index),
    waitMinutes: Math.max(0, Math.ceil((calculateNextSendTime(index) - Date.now()) / 60000)),
  }));

  // Formater le temps restant
  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Maintenant';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return {
    // State
    queue: queueWithEstimates,
    queueCount: queue.length,
    isActive,
    settings,
    currentReady,
    timeUntilNext,
    timeUntilNextFormatted: timeUntilNext !== null ? formatTimeRemaining(timeUntilNext) : null,

    // Actions
    addToQueue,
    removeFromQueue,
    reorderQueue,
    skip,
    postpone,
    markAsSent,
    copyAndOpen,
    toggleActive,
    updateSettings,
    requestNotificationPermission,

    // Helpers
    getProfileUrl,
    spacingMinutes: Math.ceil(getSpacingMs() / 60000),
    canSend,
  };
}

export default useDMQueue;
