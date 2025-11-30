import { useState } from 'react';
import { Send, Clock, AlertTriangle, Info, X } from 'lucide-react';
import { useDMQuota } from '../../hooks/useDMQuota';
import QuotaAlertModal from './QuotaAlertModal';

/**
 * Widget affichant le quota de DMs pour protection anti-ban
 * S'affiche dans la sidebar (theme clair)
 */
export default function QuotaWidget() {
  const { quota, warning, clearWarning, canSend, timeUntilUnlock, status, limits } = useDMQuota();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'red':
        return 'text-red-600';
      case 'orange':
        return 'text-orange-500';
      default:
        return 'text-green-600';
    }
  };

  const getStatusBg = () => {
    switch (status) {
      case 'red':
        return 'bg-red-50 border-red-200';
      case 'orange':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getProgressColor = (current, max) => {
    const percent = (current / max) * 100;
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="relative">
      {/* Widget principal */}
      <div className={`rounded-xl border p-3 ${getStatusBg()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Send className={`w-4 h-4 ${getStatusColor()}`} />
            <span className="text-sm font-medium text-warm-900">Quota DMs</span>
          </div>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="text-warm-400 hover:text-warm-600 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Barres de progression */}
        <div className="space-y-2">
          {/* Quota horaire */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-warm-500">Cette heure</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {quota.hourly.sent}/{limits.hourly}
              </span>
            </div>
            <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor(quota.hourly.sent, limits.hourly)}`}
                style={{ width: `${Math.min(100, (quota.hourly.sent / limits.hourly) * 100)}%` }}
              />
            </div>
          </div>

          {/* Quota quotidien */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-warm-500">Aujourd'hui</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {quota.daily.sent}/{limits.daily}
              </span>
            </div>
            <div className="h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor(quota.daily.sent, limits.daily)}`}
                style={{ width: `${Math.min(100, (quota.daily.sent / limits.daily) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Afficher le temps restant si bloqué */}
        {!canSend && timeUntilUnlock && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <Clock className="w-3 h-3" />
            <span>
              {timeUntilUnlock.type === 'cooldown' && 'Cooldown : '}
              {timeUntilUnlock.type === 'hourly' && 'Reset horaire : '}
              {timeUntilUnlock.type === 'daily' && 'Reset quotidien : '}
              {timeUntilUnlock.formatted}
            </span>
          </div>
        )}
      </div>

      {/* Tooltip explicatif */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white border border-warm-200 rounded-xl shadow-lg z-50">
          <button
            onClick={() => setShowTooltip(false)}
            className="absolute top-2 right-2 text-warm-400 hover:text-warm-600"
          >
            <X className="w-4 h-4" />
          </button>
          <h4 className="font-medium text-warm-900 text-sm mb-2">Protection Anti-Ban</h4>
          <p className="text-xs text-warm-600 mb-2">
            Instagram limite le nombre de DMs que tu peux envoyer pour eviter les spammeurs.
            Pour proteger ton compte :
          </p>
          <ul className="text-xs text-warm-600 space-y-1">
            <li>• Max {limits.hourly} DMs par heure</li>
            <li>• Max {limits.daily} DMs par jour</li>
            <li>• Pause automatique de 30 min apres 5 envois</li>
          </ul>
          <p className="text-xs text-warm-400 mt-2 italic">
            Ces limites sont recommandees, pas garanties contre les restrictions.
          </p>
        </div>
      )}

      {/* Warning toast */}
      {warning && (
        <QuotaWarningToast warning={warning} onClose={clearWarning} />
      )}

      {/* Modal d'alerte proactif */}
      <QuotaAlertModal
        quota={quota}
        limits={limits}
        timeUntilUnlock={timeUntilUnlock}
      />
    </div>
  );
}

/**
 * Toast de warning pour les quotas
 */
function QuotaWarningToast({ warning, onClose }) {
  const getBgColor = () => {
    return warning.type === 'error'
      ? 'bg-red-50 border-red-200'
      : 'bg-orange-50 border-orange-200';
  };

  const getIconColor = () => {
    return warning.type === 'error' ? 'text-red-600' : 'text-orange-500';
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-xl border shadow-lg z-50 ${getBgColor()}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${getIconColor()}`} />
        <div className="flex-1">
          <h4 className={`font-medium text-sm ${getIconColor()}`}>{warning.title}</h4>
          <p className="text-xs text-warm-600 mt-1">{warning.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-warm-400 hover:text-warm-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
