import { useState } from 'react';
import { Clock, Play, Pause, SkipForward, MessageSquare, ChevronRight, Bell, BellOff } from 'lucide-react';
import { useDMQueue } from '../../hooks/useDMQueue';

/**
 * Widget compact pour afficher la file d'attente DM dans la sidebar
 */
export default function DMQueueWidget({ onExpand }) {
  const {
    queue,
    queueCount,
    isActive,
    currentReady,
    timeUntilNextFormatted,
    timeUntilNext,
    toggleActive,
    skip,
    spacingMinutes,
    settings,
    updateSettings,
  } = useDMQueue();

  const [showSettings, setShowSettings] = useState(false);

  // Si la queue est vide, afficher un état minimal
  if (queueCount === 0) {
    return (
      <div className="rounded-xl border border-warm-200 bg-warm-50 p-3">
        <div className="flex items-center gap-2 text-warm-500">
          <MessageSquare className="w-4 h-4" />
          <span className="text-sm">File d'attente vide</span>
        </div>
        <p className="text-xs text-warm-400 mt-1">
          Ajoute des messages depuis la modal de génération
        </p>
      </div>
    );
  }

  const nextItem = queue[0];

  // Calculer le pourcentage pour le cercle de progression
  const totalTime = spacingMinutes * 60 * 1000; // en ms
  const elapsed = totalTime - (timeUntilNext || 0);
  const progressPercent = currentReady ? 100 : Math.min(100, (elapsed / totalTime) * 100);

  // Couleur selon l'état
  const getStatusColor = () => {
    if (currentReady) return 'text-green-600';
    if (!isActive) return 'text-warm-400';
    return 'text-brand-600';
  };

  const getStatusBg = () => {
    if (currentReady) return 'bg-green-50 border-green-200';
    if (!isActive) return 'bg-warm-100 border-warm-200';
    return 'bg-brand-50 border-brand-200';
  };

  return (
    <div className={`rounded-xl border p-3 transition-colors ${getStatusBg()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            {/* Cercle de progression */}
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-warm-200"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progressPercent * 0.88} 88`}
                strokeLinecap="round"
                className={getStatusColor()}
              />
            </svg>
            <Clock className={`w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${getStatusColor()}`} />
          </div>
          <div>
            <span className="text-sm font-medium text-warm-900">
              {queueCount} DM{queueCount > 1 ? 's' : ''} en attente
            </span>
            <p className={`text-xs ${getStatusColor()}`}>
              {currentReady ? (
                <span className="font-semibold animate-pulse">Prêt à envoyer !</span>
              ) : !isActive ? (
                'En pause'
              ) : (
                `Dans ${timeUntilNextFormatted}`
              )}
            </p>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleActive}
            className={`p-1.5 rounded-lg transition-colors ${
              isActive
                ? 'bg-warm-200 text-warm-600 hover:bg-warm-300'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            title={isActive ? 'Mettre en pause' : 'Reprendre'}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={skip}
            className="p-1.5 rounded-lg bg-warm-200 text-warm-600 hover:bg-warm-300 transition-colors"
            title="Passer ce message"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-1.5 rounded-lg transition-colors ${
              settings.soundEnabled
                ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                : 'bg-warm-200 text-warm-400 hover:bg-warm-300'
            }`}
            title={settings.soundEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            {settings.soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Aperçu du prochain message */}
      {nextItem && (
        <div className="mt-2 p-2 bg-white/70 rounded-lg">
          <div className="flex items-center gap-2">
            {nextItem.prospectAvatar ? (
              <img
                src={nextItem.prospectAvatar}
                alt={nextItem.prospectUsername}
                className="w-6 h-6 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nextItem.prospectUsername)}&background=f15a24&color=fff&size=50`;
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-xs font-medium text-brand-600">
                  {nextItem.prospectUsername?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-warm-800 truncate">
                @{nextItem.prospectUsername}
              </p>
              <p className="text-xs text-warm-500 truncate">
                {nextItem.content?.substring(0, 40)}...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bouton pour voir la liste complète */}
      {queueCount > 1 && onExpand && (
        <button
          onClick={onExpand}
          className="mt-2 w-full flex items-center justify-center gap-1 text-xs text-brand-600 hover:text-brand-700 py-1"
        >
          Voir les {queueCount} messages
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
