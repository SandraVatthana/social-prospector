import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, X, ArrowRight } from 'lucide-react';
import Modal from '../ui/Modal';

const ALERT_STORAGE_KEY = 'quota_alert_dismissed';

/**
 * Modal d'alerte qui s'affiche quand l'utilisateur approche du quota
 * - À 80% : warning orange
 * - À 100% : erreur rouge avec temps restant
 */
export default function QuotaAlertModal({ quota, limits, timeUntilUnlock, onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertLevel, setAlertLevel] = useState(null); // 'warning' | 'error'

  useEffect(() => {
    const hourlyPercent = (quota.hourly.sent / limits.hourly) * 100;
    const dailyPercent = (quota.daily.sent / limits.daily) * 100;
    const maxPercent = Math.max(hourlyPercent, dailyPercent);

    // Vérifier si on a déjà dismissé l'alerte récemment
    const dismissed = getDismissedState();

    if (maxPercent >= 100 && !dismissed.error) {
      setAlertLevel('error');
      setIsOpen(true);
    } else if (maxPercent >= 80 && maxPercent < 100 && !dismissed.warning) {
      setAlertLevel('warning');
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [quota, limits]);

  const getDismissedState = () => {
    try {
      const stored = localStorage.getItem(ALERT_STORAGE_KEY);
      if (!stored) return { warning: false, error: false };

      const data = JSON.parse(stored);
      const now = Date.now();

      // Les dismisses expirent après 1h pour warning, et au reset pour error
      return {
        warning: data.warning && (now - data.warningTime) < 3600000,
        error: data.error && (now - data.errorTime) < 3600000,
      };
    } catch {
      return { warning: false, error: false };
    }
  };

  const handleDismiss = () => {
    const stored = JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY) || '{}');
    const now = Date.now();

    if (alertLevel === 'warning') {
      stored.warning = true;
      stored.warningTime = now;
    } else {
      stored.error = true;
      stored.errorTime = now;
    }

    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(stored));
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  const isError = alertLevel === 'error';
  const hourlyRemaining = limits.hourly - quota.hourly.sent;
  const dailyRemaining = limits.daily - quota.daily.sent;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      title=""
      size="small"
    >
      <div className="text-center py-2">
        {/* Icône */}
        <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
          isError ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <AlertTriangle className={`w-8 h-8 ${isError ? 'text-red-600' : 'text-orange-500'}`} />
        </div>

        {/* Titre */}
        <h2 className={`font-display text-xl font-bold mb-2 ${
          isError ? 'text-red-700' : 'text-orange-700'
        }`}>
          {isError ? 'Limite de DMs atteinte !' : 'Tu approches de la limite'}
        </h2>

        {/* Message */}
        <p className="text-warm-600 mb-4">
          {isError ? (
            <>
              Pour protéger ton compte Instagram des restrictions,
              fais une pause avant d'envoyer d'autres messages.
            </>
          ) : (
            <>
              Il te reste <strong>{Math.max(hourlyRemaining, 0)} DM{hourlyRemaining > 1 ? 's' : ''}</strong> cette heure
              et <strong>{Math.max(dailyRemaining, 0)}</strong> aujourd'hui.
              Ralentis pour éviter les restrictions Instagram.
            </>
          )}
        </p>

        {/* Temps restant si bloqué */}
        {isError && timeUntilUnlock && (
          <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2 mb-4">
            <Clock className="w-4 h-4" />
            <span>
              {timeUntilUnlock.type === 'cooldown' && 'Cooldown : '}
              {timeUntilUnlock.type === 'hourly' && 'Reset horaire dans : '}
              {timeUntilUnlock.type === 'daily' && 'Reset quotidien dans : '}
              <strong>{timeUntilUnlock.formatted}</strong>
            </span>
          </div>
        )}

        {/* Conseils */}
        <div className={`text-left text-sm p-4 rounded-xl mb-4 ${
          isError ? 'bg-red-50 border border-red-100' : 'bg-orange-50 border border-orange-100'
        }`}>
          <p className="font-medium mb-2">Conseils pour éviter les restrictions :</p>
          <ul className="space-y-1 text-warm-600">
            <li>• Espace tes envois de 2-3 minutes minimum</li>
            <li>• Varie le contenu de tes messages</li>
            <li>• Fais une pause de 30 min toutes les heures</li>
            <li>• Ne dépasse jamais 40 DMs par jour</li>
          </ul>
        </div>

        {/* Bouton */}
        <button
          onClick={handleDismiss}
          className={`w-full py-3 px-6 rounded-xl font-semibold transition-colors ${
            isError
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isError ? 'J\'ai compris, je fais une pause' : 'OK, je ralentis'}
        </button>
      </div>
    </Modal>
  );
}
