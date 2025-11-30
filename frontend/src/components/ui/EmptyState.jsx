import { 
  Search, 
  Users, 
  MessageSquare, 
  Mic2, 
  BarChart3,
  Inbox,
  FileQuestion,
  Sparkles
} from 'lucide-react';

/**
 * Configurations prédéfinies pour les empty states
 */
const PRESETS = {
  prospects: {
    icon: Users,
    title: 'Aucun prospect',
    description: 'Lancez une recherche pour trouver vos premiers prospects à contacter.',
    actionLabel: 'Nouvelle recherche',
    actionTo: '/search',
  },
  messages: {
    icon: MessageSquare,
    title: 'Aucun message',
    description: 'Générez votre premier message personnalisé à partir d\'un prospect analysé.',
    actionLabel: 'Voir les prospects',
    actionTo: '/prospects',
  },
  searches: {
    icon: Search,
    title: 'Aucune recherche',
    description: 'Créez votre première recherche pour trouver des prospects qualifiés.',
    actionLabel: 'Nouvelle recherche',
    actionTo: '/search',
  },
  voice: {
    icon: Mic2,
    title: 'Aucun profil MA VOIX',
    description: 'Créez votre premier profil pour générer des messages qui vous ressemblent.',
    actionLabel: 'Créer mon profil',
    actionTo: '/voice',
  },
  analytics: {
    icon: BarChart3,
    title: 'Pas encore de données',
    description: 'Envoyez vos premiers messages pour voir apparaître vos statistiques.',
    actionLabel: 'Voir les messages',
    actionTo: '/messages',
  },
  results: {
    icon: FileQuestion,
    title: 'Aucun résultat',
    description: 'Essayez avec d\'autres critères de recherche.',
  },
  inbox: {
    icon: Inbox,
    title: 'Boîte vide',
    description: 'Vous n\'avez rien ici pour le moment.',
  },
};

/**
 * Composant Empty State réutilisable
 */
export default function EmptyState({
  preset,
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
  className = '',
  size = 'default', // 'small' | 'default' | 'large'
}) {
  // Utiliser le preset si fourni
  const config = preset ? { ...PRESETS[preset] } : {};
  
  const Icon = CustomIcon || config.icon || Sparkles;
  const finalTitle = title || config.title || 'Rien à afficher';
  const finalDescription = description || config.description;
  const finalActionLabel = actionLabel || config.actionLabel;
  const finalActionTo = actionTo || config.actionTo;

  const sizeClasses = {
    small: {
      container: 'py-6',
      icon: 'w-10 h-10',
      iconWrapper: 'w-14 h-14',
      title: 'text-base',
      description: 'text-sm',
    },
    default: {
      container: 'py-12',
      icon: 'w-12 h-12',
      iconWrapper: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-sm',
    },
    large: {
      container: 'py-16',
      icon: 'w-16 h-16',
      iconWrapper: 'w-24 h-24',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  const ActionButton = () => {
    if (!finalActionLabel) return null;

    const buttonClasses = "inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors";

    if (finalActionTo) {
      return (
        <a href={finalActionTo} className={buttonClasses}>
          <Sparkles className="w-4 h-4" />
          {finalActionLabel}
        </a>
      );
    }

    if (onAction) {
      return (
        <button onClick={onAction} className={buttonClasses}>
          <Sparkles className="w-4 h-4" />
          {finalActionLabel}
        </button>
      );
    }

    return null;
  };

  return (
    <div className={`flex flex-col items-center justify-center text-center ${sizes.container} ${className}`}>
      <div className={`${sizes.iconWrapper} rounded-2xl bg-warm-100 flex items-center justify-center mb-4`}>
        <Icon className={`${sizes.icon} text-warm-400`} />
      </div>
      
      <h3 className={`font-display font-semibold text-warm-900 mb-2 ${sizes.title}`}>
        {finalTitle}
      </h3>
      
      {finalDescription && (
        <p className={`text-warm-500 max-w-md mb-6 ${sizes.description}`}>
          {finalDescription}
        </p>
      )}

      <ActionButton />
    </div>
  );
}

// Export des presets pour référence
EmptyState.presets = Object.keys(PRESETS);
