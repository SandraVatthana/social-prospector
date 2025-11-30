import { useState } from 'react';
import { Copy, Loader2, Check, Instagram, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { useDMQuota } from '../../hooks/useDMQuota';

/**
 * Bouton d'envoi de message optimisé
 * En 1 clic : copie le message + ouvre le profil/DM + sauvegarde en base
 *
 * Props:
 * - message: { id, content, status }
 * - prospect: { id, username, platform }
 * - onSent: callback(messageId) appelé après envoi
 * - disabled: désactiver le bouton
 * - variant: 'primary' | 'secondary' (style du bouton)
 */
export default function SendMessageButton({
  message,
  prospect,
  onSent,
  disabled = false,
  variant = 'primary',
}) {
  const [status, setStatus] = useState('idle'); // idle | copying | success | error
  const { recordSend, canSend } = useDMQuota();

  // Construire l'URL selon la plateforme
  const getProfileUrl = () => {
    const username = prospect.username?.replace('@', '');

    switch (prospect.platform?.toLowerCase()) {
      case 'instagram':
        // ig.me/m/ ouvre directement les DM sur mobile et web
        return `https://ig.me/m/${username}`;
      case 'tiktok':
        // TikTok n'a pas de lien DM direct, on ouvre le profil
        return `https://tiktok.com/@${username}`;
      case 'linkedin':
        // LinkedIn messaging (si on a l'ID)
        return prospect.profile_url || `https://linkedin.com/in/${username}`;
      case 'twitter':
      case 'x':
        return `https://twitter.com/messages/compose?recipient_id=${username}`;
      default:
        return prospect.profile_url || `https://instagram.com/${username}`;
    }
  };

  // Obtenir le nom de la plateforme pour l'affichage
  const getPlatformName = () => {
    switch (prospect.platform?.toLowerCase()) {
      case 'instagram':
        return 'Instagram';
      case 'tiktok':
        return 'TikTok';
      case 'linkedin':
        return 'LinkedIn';
      case 'twitter':
      case 'x':
        return 'X';
      default:
        return 'le profil';
    }
  };

  // Obtenir l'icône de la plateforme
  const getPlatformIcon = () => {
    switch (prospect.platform?.toLowerCase()) {
      case 'instagram':
        return Instagram;
      default:
        return ExternalLink;
    }
  };

  const handleClick = async () => {
    if (disabled || status === 'copying') return;

    setStatus('copying');

    try {
      // 1. Copier dans le presse-papier
      await navigator.clipboard.writeText(message.content);

      // 2. Sauvegarder en base (marquer comme envoyé)
      try {
        await api.updateMessage(message.id, {
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      } catch (apiError) {
        // En mode démo, l'API peut échouer - on continue quand même
        console.log('API update skipped (demo mode)');
      }

      // 3. Enregistrer dans le quota
      recordSend();

      // 4. Ouvrir le profil/DM dans un nouvel onglet
      const url = getProfileUrl();
      window.open(url, '_blank', 'noopener,noreferrer');

      // 5. Feedback de succès
      setStatus('success');
      onSent?.(message.id);

      // Reset après 4 secondes (laisser le temps de voir le message de succès)
      setTimeout(() => setStatus('idle'), 4000);
    } catch (error) {
      console.error('Erreur lors de la copie:', error);
      setStatus('error');

      // Fallback si clipboard API ne fonctionne pas
      if (error.name === 'NotAllowedError') {
        // Essayer la méthode alternative
        try {
          const textarea = document.createElement('textarea');
          textarea.value = message.content;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          setStatus('success');
          window.open(getProfileUrl(), '_blank', 'noopener,noreferrer');
          onSent?.(message.id);
          setTimeout(() => setStatus('idle'), 4000);
        } catch {
          setTimeout(() => setStatus('idle'), 3000);
        }
      } else {
        setTimeout(() => setStatus('idle'), 3000);
      }
    }
  };

  const PlatformIcon = getPlatformIcon();
  const platformName = getPlatformName();

  // Désactiver si quota atteint
  const isQuotaBlocked = !canSend;
  const isDisabled = disabled || isQuotaBlocked;

  // Styles selon le variant
  const baseStyles = 'w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200';
  const variantStyles = {
    primary: {
      idle: 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25',
      copying: 'bg-brand-500 text-white cursor-wait',
      success: 'bg-green-500 hover:bg-green-600 text-white',
      error: 'bg-red-500 text-white',
      disabled: 'bg-warm-300 text-warm-500 cursor-not-allowed',
    },
    secondary: {
      idle: 'bg-warm-100 hover:bg-warm-200 text-warm-700',
      copying: 'bg-warm-100 text-warm-500 cursor-wait',
      success: 'bg-green-100 text-green-700',
      error: 'bg-red-100 text-red-700',
      disabled: 'bg-warm-100 text-warm-400 cursor-not-allowed',
    },
  };

  const currentStyles = isDisabled
    ? variantStyles[variant].disabled
    : variantStyles[variant][status];

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`${baseStyles} ${currentStyles}`}
      >
        {status === 'idle' && (
          <>
            <Copy className="w-4 h-4" />
            Copier & ouvrir {platformName}
          </>
        )}
        {status === 'copying' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Copie en cours...
          </>
        )}
        {status === 'success' && (
          <>
            <Check className="w-4 h-4" />
            Copié ! Collez dans la conversation
          </>
        )}
        {status === 'error' && (
          <>
            <Copy className="w-4 h-4" />
            Erreur - Réessayer
          </>
        )}
      </button>

      {/* Message d'aide */}
      {status === 'idle' && !isDisabled && (
        <p className="text-xs text-warm-400 text-center">
          Le message sera copié et {platformName} s'ouvrira.
          Il ne reste plus qu'à coller (Ctrl+V) et envoyer !
        </p>
      )}

      {/* Avertissement quota */}
      {isQuotaBlocked && (
        <p className="text-xs text-red-500 text-center">
          Limite de DMs atteinte. Fais une pause pour protéger ton compte.
        </p>
      )}
    </div>
  );
}
