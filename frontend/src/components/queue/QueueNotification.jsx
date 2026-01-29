import { useState, useEffect } from 'react';
import { Copy, ExternalLink, SkipForward, Clock, Check, X, Instagram, MessageSquare } from 'lucide-react';
import { useDMQueue } from '../../hooks/useDMQueue';

// Icône TikTok
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

/**
 * Modal/notification qui apparaît quand un DM est prêt à envoyer
 */
export default function QueueNotification() {
  const {
    queue,
    currentReady,
    copyAndOpen,
    markAsSent,
    skip,
    postpone,
  } = useDMQueue();

  const [isVisible, setIsVisible] = useState(false);
  const [copyStatus, setCopyStatus] = useState('idle'); // idle | copying | success | error
  const [showPostponeOptions, setShowPostponeOptions] = useState(false);

  const nextItem = queue[0];

  // Afficher la notification quand un message est prêt
  useEffect(() => {
    if (currentReady && nextItem) {
      setIsVisible(true);
      setCopyStatus('idle');
    }
  }, [currentReady, nextItem?.id]);

  // Masquer si plus rien dans la queue ou plus prêt
  useEffect(() => {
    if (!currentReady || !nextItem) {
      setIsVisible(false);
    }
  }, [currentReady, nextItem]);

  const handleCopyAndOpen = async () => {
    if (!nextItem) return;

    setCopyStatus('copying');

    const success = await copyAndOpen(nextItem);

    if (success) {
      setCopyStatus('success');
      // On laisse le temps à l'utilisateur de voir le succès
      // Il cliquera sur "Marquer envoyé" après avoir envoyé manuellement
    } else {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleMarkAsSent = () => {
    markAsSent();
    setIsVisible(false);
    setCopyStatus('idle');
  };

  const handleSkip = () => {
    skip();
    setIsVisible(false);
    setCopyStatus('idle');
  };

  const handlePostpone = (minutes) => {
    postpone(minutes);
    setIsVisible(false);
    setShowPostponeOptions(false);
    setCopyStatus('idle');
  };

  const handleClose = () => {
    setIsVisible(false);
    setCopyStatus('idle');
    setShowPostponeOptions(false);
  };

  // Obtenir l'icône de la plateforme
  const getPlatformIcon = () => {
    switch (nextItem?.platform?.toLowerCase()) {
      case 'instagram':
        return Instagram;
      case 'tiktok':
        return TikTokIcon;
      default:
        return MessageSquare;
    }
  };

  const getPlatformName = () => {
    switch (nextItem?.platform?.toLowerCase()) {
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      case 'linkedin':
        return 'LinkedIn';
      default:
        return 'le profil';
    }
  };

  if (!isVisible || !nextItem) {
    return null;
  }

  const PlatformIcon = getPlatformIcon();

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header avec animation */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">DM prêt à envoyer !</h3>
                  <p className="text-green-100 text-sm">Le moment est venu</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu */}
          <div className="p-4 space-y-4">
            {/* Info prospect */}
            <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
              {nextItem.prospectAvatar ? (
                <img
                  src={nextItem.prospectAvatar}
                  alt={nextItem.prospectUsername}
                  className="w-12 h-12 rounded-xl object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nextItem.prospectUsername)}&background=f15a24&color=fff&size=100`;
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-accent-400 flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {nextItem.prospectUsername?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-warm-900">@{nextItem.prospectUsername}</p>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    nextItem.platform === 'instagram'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : 'bg-black'
                  }`}>
                    <PlatformIcon className="w-3 h-3 text-white" />
                  </div>
                </div>
                <p className="text-sm text-warm-500">{getPlatformName()}</p>
              </div>
            </div>

            {/* Aperçu du message */}
            <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
              <p className="text-xs text-brand-600 font-medium mb-1">Message :</p>
              <p className="text-warm-700 text-sm leading-relaxed line-clamp-4">
                {nextItem.content}
              </p>
            </div>

            {/* Bouton principal */}
            {copyStatus !== 'success' ? (
              <button
                onClick={handleCopyAndOpen}
                disabled={copyStatus === 'copying'}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/25 disabled:opacity-70"
              >
                {copyStatus === 'copying' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Copie en cours...
                  </>
                ) : copyStatus === 'error' ? (
                  <>
                    <X className="w-5 h-5" />
                    Erreur - Réessayer
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copier & Ouvrir {getPlatformName()}
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Message copié ! {getPlatformName()} s'est ouvert.</span>
                </div>
                <button
                  onClick={handleMarkAsSent}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25"
                >
                  <Check className="w-5 h-5" />
                  J'ai envoyé le message
                </button>
              </div>
            )}

            {/* Actions secondaires */}
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
              >
                <SkipForward className="w-4 h-4" />
                Passer
              </button>

              {!showPostponeOptions ? (
                <button
                  onClick={() => setShowPostponeOptions(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Reporter
                </button>
              ) : (
                <div className="flex-1 flex gap-1">
                  <button
                    onClick={() => handlePostpone(5)}
                    className="flex-1 px-2 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    5 min
                  </button>
                  <button
                    onClick={() => handlePostpone(15)}
                    className="flex-1 px-2 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    15 min
                  </button>
                  <button
                    onClick={() => handlePostpone(30)}
                    className="flex-1 px-2 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors"
                  >
                    30 min
                  </button>
                </div>
              )}
            </div>

            {/* Aide */}
            <p className="text-xs text-warm-400 text-center">
              Colle le message (Ctrl+V / Cmd+V) dans la conversation {getPlatformName()}, puis clique sur "J'ai envoyé".
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
