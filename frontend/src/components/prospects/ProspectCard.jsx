import { ChevronRight } from 'lucide-react';
import PlatformIcon from './PlatformIcon';

const statusConfig = {
  nouveau: {
    label: 'Nouveau',
    classes: 'bg-warm-100 text-warm-600',
  },
  a_contacter: {
    label: 'A contacter',
    classes: 'bg-amber-100 text-amber-700',
  },
  message_genere: {
    label: 'Message generé',
    classes: 'bg-accent-100 text-accent-700',
  },
  envoye: {
    label: 'Message envoyé',
    classes: 'bg-blue-100 text-blue-700',
  },
  repondu: {
    label: 'A répondu',
    classes: 'bg-green-100 text-green-700',
    icon: '✓',
  },
  converti: {
    label: 'Converti',
    classes: 'bg-brand-100 text-brand-700',
    icon: '★',
  },
  ignore: {
    label: 'Ignoré',
    classes: 'bg-warm-200 text-warm-500',
  },
};

/**
 * Carte prospect avec icône plateforme bien visible
 * Hiérarchie visuelle: Plateforme > Statut > Score
 */
export default function ProspectCard({
  prospect,
  onClick,
  onGenerateMessage,
  compact = false,
}) {
  const status = statusConfig[prospect.status] || statusConfig.nouveau;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className="px-6 py-4 flex items-center gap-4 hover:bg-warm-50 transition-colors cursor-pointer"
      >
        {/* Avatar avec icône plateforme */}
        <div className="relative">
          <img
            src={prospect.avatar || `https://i.pravatar.cc/100?u=${prospect.username}`}
            alt={prospect.username}
            className="w-12 h-12 rounded-full object-cover"
          />
          {/* Icône plateforme positionnée à côté de l'avatar */}
          <div className="absolute -right-1 -bottom-1">
            <PlatformIcon platform={prospect.platform} size="small" />
          </div>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-warm-900 truncate">@{prospect.username}</p>
          </div>
          <p className="text-sm text-warm-500 truncate">
            {prospect.bio || prospect.description || 'Pas de bio'}
            {prospect.followers && ` • ${formatFollowers(prospect.followers)} abonnés`}
          </p>
        </div>

        {/* Statut */}
        <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${status.classes}`}>
          {status.icon && <span className="mr-1">{status.icon}</span>}
          {status.label}
        </span>

        {/* Chevron */}
        <button className="p-2 hover:bg-warm-100 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5 text-warm-400" />
        </button>
      </div>
    );
  }

  // Version complète
  return (
    <div
      onClick={onClick}
      className="px-6 py-4 flex items-center gap-4 hover:bg-warm-50 transition-colors cursor-pointer"
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-warm-300 text-brand-600 focus:ring-brand-500"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Avatar avec icône plateforme à côté */}
      <div className="flex items-center gap-2">
        <img
          src={prospect.avatar || `https://i.pravatar.cc/100?u=${prospect.username}`}
          alt={prospect.username}
          className="w-12 h-12 rounded-full object-cover"
        />
        <PlatformIcon platform={prospect.platform} size="default" />
      </div>

      {/* Infos principales */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-warm-900 truncate">@{prospect.username}</p>
        <p className="text-sm text-warm-500 truncate">
          {prospect.bio || prospect.description}
          {prospect.followers && ` • ${formatFollowers(prospect.followers)} abonnés`}
        </p>
      </div>

      {/* Score (discret) */}
      <div className="text-right hidden sm:block">
        <p className="text-sm text-warm-500">
          Score: <span className="font-medium text-warm-700">{prospect.score || 0}%</span>
        </p>
        {prospect.added_at && (
          <p className="text-xs text-warm-400">
            Ajouté {formatRelativeTime(prospect.added_at)}
          </p>
        )}
      </div>

      {/* Statut */}
      <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${status.classes}`}>
        {status.icon && <span className="mr-1">{status.icon}</span>}
        {status.label}
      </span>

      {/* Action */}
      {prospect.status === 'nouveau' || prospect.status === 'a_contacter' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onGenerateMessage?.(prospect);
          }}
          className="px-4 py-2 bg-brand-100 hover:bg-brand-200 text-brand-700 font-medium rounded-lg text-sm transition-colors whitespace-nowrap"
        >
          Générer message
        </button>
      ) : prospect.status === 'repondu' ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(prospect);
          }}
          className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg text-sm transition-colors"
        >
          Suivre
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.(prospect);
          }}
          className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-600 font-medium rounded-lg text-sm transition-colors"
        >
          Voir message
        </button>
      )}
    </div>
  );
}

// Helpers
function formatFollowers(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `il y a ${diffDays}j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)}sem`;
  return `il y a ${Math.floor(diffDays / 30)}mois`;
}
