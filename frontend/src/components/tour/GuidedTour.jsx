import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Mic, Search, Users, MessageSquare, AlertTriangle, PartyPopper, Reply, Sparkles, Lock, Instagram, Inbox, Target, BarChart3 } from 'lucide-react';

const STORAGE_KEY = 'social_prospector_tour_completed';

/**
 * Configuration des étapes du tour guidé
 */
const TOUR_STEPS = [
  {
    id: 'voice',
    target: '[data-tour="voice"]',
    title: 'MA VOIX',
    content: 'Ton profil stylistique ! Clique sur "Reconfigurer ma voix" pour répondre à quelques questions, ou "Analyser mes textes" pour que l\'IA analyse ton style à partir de tes écrits. Tu peux modifier ton profil à tout moment.',
    icon: Mic,
    position: 'right',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Recherche',
    content: 'Trouve des prospects en tapant un hashtag (#coaching), un lieu (Paris) ou un compte similaire (@concurrent). L\'IA analyse et score chaque profil.',
    icon: Search,
    position: 'right',
  },
  {
    id: 'private-public',
    target: '[data-tour="search"]',
    title: 'Comptes privés/publics',
    content: 'Chaque prospect affiche un badge 🔒 (privé) ou 🌐 (public). Pour les comptes privés, pense à follow avant d\'envoyer un DM ! Le bouton "Voir le profil" t\'ouvre directement Instagram.',
    icon: Lock,
    position: 'right',
    important: true,
  },
  {
    id: 'prospects',
    target: '[data-tour="prospects"]',
    title: 'Prospects',
    content: 'Tous tes prospects sauvegardés. Génère des messages personnalisés basés sur leurs posts récents.',
    icon: Users,
    position: 'right',
  },
  {
    id: 'double-generation',
    target: '[data-tour="prospects"]',
    title: 'Double génération',
    content: 'Quand tu génères un message, tu obtiens 2 versions : un message écrit (DM texte) ET un script vocal (~30 sec) adapté à ta voix. Utilise l\'onglet "Script vocal" pour les vocaux !',
    icon: Sparkles,
    position: 'right',
  },
  {
    id: 'vocal-training',
    target: '[data-tour="voice"]',
    title: 'Entraînement vocal',
    content: 'Clique sur "M\'entraîner à le dire" sous le script vocal. Enregistre-toi, et l\'IA te donne un feedback détaillé avec des scores sur 6 critères (naturel, énergie, clarté...). Parfait pour progresser !',
    icon: Mic,
    position: 'right',
    important: true,
  },
  {
    id: 'crm-dashboard',
    target: '[data-tour="crm"]',
    title: 'CRM Dashboard',
    content: 'Ta vue Kanban pour gérer tes prospects ! Organise-les par catégorie : 🔥 Lead chaud, 🟡 Lead tiède, 📅 Demande RDV, ❓ Question... Glisse-dépose pour changer de statut rapidement.',
    icon: Inbox,
    position: 'right',
    important: true,
  },
  {
    id: 'icp-scoring',
    target: '[data-tour="icp"]',
    title: 'ICP & Scoring',
    content: 'L\'IA analyse tes meilleurs clients pour créer ton Profil Client Idéal (ICP). Chaque prospect reçoit un score de compatibilité. Concentre-toi sur les prospects avec le meilleur score !',
    icon: Target,
    position: 'right',
    important: true,
  },
  {
    id: 'status',
    target: '[data-tour="status"]',
    title: 'Statuts',
    content: 'Les statuts se mettent à jour automatiquement quand tu génères un message. MAIS quand le prospect répond, c\'est à toi de changer le statut manuellement (on n\'a pas accès à tes DMs 😉).',
    icon: AlertTriangle,
    position: 'right',
    important: true,
  },
  {
    id: 'quota',
    target: '[data-tour="quota"]',
    title: 'Quota DMs',
    content: 'Pour protéger ton compte, on track tes envois. Instagram recommande max 5 DMs/heure et 40/jour. On t\'alerte avant les limites !',
    icon: AlertTriangle,
    position: 'right',
  },
  {
    id: 'messages',
    target: '[data-tour="messages"]',
    title: 'Messages',
    content: 'Tous tes messages générés. Utilise le bouton "Copier & ouvrir Instagram" pour copier le message et ouvrir directement les DMs du prospect !',
    icon: MessageSquare,
    position: 'right',
  },
  {
    id: 'analytics',
    target: '[data-tour="analytics"]',
    title: 'Analytics',
    content: 'Suis tes performances : taux de réponse, messages envoyés, conversions... Identifie ce qui fonctionne le mieux pour optimiser ta prospection !',
    icon: BarChart3,
    position: 'right',
  },
  {
    id: 'response',
    target: '[data-tour="prospects"]',
    title: 'Quand le prospect répond',
    content: 'Clique sur "Le prospect a répondu", colle sa réponse, puis appuie sur "Analyser". L\'IA analysera son message et te proposera des relances que tu peux modifier avant d\'envoyer.',
    icon: Reply,
    position: 'right',
    important: true,
  },
];

/**
 * Composant du tooltip avec flèche
 */
function TourTooltip({ step, position, targetRect, onNext, onPrev, onSkip, currentStep, totalSteps }) {
  const [tooltipStyle, setTooltipStyle] = useState({});
  const [arrowStyle, setArrowStyle] = useState({});

  useEffect(() => {
    if (!targetRect) return;

    const padding = 16;
    const arrowSize = 10;
    let style = {};
    let arrow = {};

    switch (position) {
      case 'right':
        style = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translateY(-50%)',
        };
        arrow = {
          top: '50%',
          left: -arrowSize,
          transform: 'translateY(-50%) rotate(45deg)',
          borderLeft: '1px solid #e5e0dc',
          borderBottom: '1px solid #e5e0dc',
        };
        break;
      case 'left':
        style = {
          top: targetRect.top + targetRect.height / 2,
          right: window.innerWidth - targetRect.left + padding,
          transform: 'translateY(-50%)',
        };
        arrow = {
          top: '50%',
          right: -arrowSize,
          transform: 'translateY(-50%) rotate(-135deg)',
          borderLeft: '1px solid #e5e0dc',
          borderBottom: '1px solid #e5e0dc',
        };
        break;
      case 'bottom':
        style = {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        arrow = {
          top: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%) rotate(135deg)',
          borderLeft: '1px solid #e5e0dc',
          borderBottom: '1px solid #e5e0dc',
        };
        break;
      case 'top':
        style = {
          bottom: window.innerHeight - targetRect.top + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
        arrow = {
          bottom: -arrowSize,
          left: '50%',
          transform: 'translateX(-50%) rotate(-45deg)',
          borderLeft: '1px solid #e5e0dc',
          borderBottom: '1px solid #e5e0dc',
        };
        break;
      default:
        break;
    }

    setTooltipStyle(style);
    setArrowStyle(arrow);
  }, [targetRect, position]);

  const Icon = step.icon;

  return (
    <div
      className="fixed z-[10002] w-80 bg-white rounded-2xl shadow-2xl border border-warm-200 animate-fade-in pointer-events-auto"
      style={tooltipStyle}
    >
      {/* Flèche */}
      <div
        className="absolute w-4 h-4 bg-white"
        style={arrowStyle}
      />

      {/* Contenu */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            step.important
              ? 'bg-amber-100 text-amber-600'
              : 'bg-gradient-to-br from-brand-100 to-accent-100 text-brand-600'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-900">{step.title}</h3>
            <p className="text-xs text-warm-400">Étape {currentStep + 1} sur {totalSteps}</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-warm-600 text-sm leading-relaxed mb-4">
          {step.content}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep
                  ? 'bg-brand-500'
                  : i < currentStep
                  ? 'bg-brand-200'
                  : 'bg-warm-200'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-sm text-warm-400 hover:text-warm-600 transition-colors"
          >
            Passer le tour
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-warm-600 hover:bg-warm-50 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>
            )}
            <button
              onClick={onNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              {currentStep < totalSteps - 1 ? (
                <>
                  Suivant
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                'Terminer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de fin du tour
 */
function TourCompletionModal({ onConfigureVoice, onExplore }) {
  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-warm-200 max-w-md w-full p-8 text-center animate-scale-in">
        {/* Icône */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
          <PartyPopper className="w-10 h-10 text-brand-600" />
        </div>

        {/* Titre */}
        <h2 className="text-2xl font-display font-bold text-warm-900 mb-3">
          Tu es prêt !
        </h2>

        {/* Message */}
        <p className="text-warm-600 mb-8">
          Va dans <strong>MA VOIX</strong> et clique sur "Reconfigurer ma voix" pour créer ton profil stylistique. Tous tes messages sonneront vraiment comme toi !
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfigureVoice}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Mic className="w-5 h-5" />
            Aller vers MA VOIX
          </button>
          <button
            onClick={onExplore}
            className="w-full px-6 py-3 text-warm-600 hover:bg-warm-50 font-medium rounded-xl transition-colors"
          >
            Explorer seul
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Composant principal du tour guidé
 */
export default function GuidedTour({ isOpen, onClose, onNavigate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);

  const step = TOUR_STEPS[currentStep];

  // Trouver et mettre en surbrillance l'élément cible
  const updateTargetRect = useCallback(() => {
    if (!step?.target) return;

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    updateTargetRect();

    // Mettre à jour lors du scroll ou resize
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect);
    };
  }, [isOpen, currentStep, updateTargetRect]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Dernière étape -> afficher le modal de fin
      setShowCompletion(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    markTourCompleted();
    onClose();
  };

  const handleConfigureVoice = () => {
    markTourCompleted();
    onClose();
    onNavigate?.('/voice');
  };

  const handleExplore = () => {
    markTourCompleted();
    onClose();
  };

  const markTourCompleted = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Overlay sombre avec découpe pour l'élément actif */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {/* Overlay principal */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Zone découpée pour l'élément actif */}
        {targetRect && !showCompletion && (
          <div
            className="absolute bg-transparent rounded-xl ring-4 ring-brand-400 ring-offset-4 ring-offset-transparent pointer-events-auto cursor-pointer"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            }}
            onClick={() => {
              // Permettre le clic sur l'élément mis en surbrillance
              const element = document.querySelector(step.target);
              if (element) element.click();
            }}
          />
        )}
      </div>

      {/* Bouton fermer */}
      <button
        onClick={handleSkip}
        className="fixed top-4 right-4 z-[10003] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors pointer-events-auto"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Tooltip ou Modal de fin */}
      {showCompletion ? (
        <TourCompletionModal
          onConfigureVoice={handleConfigureVoice}
          onExplore={handleExplore}
        />
      ) : (
        step && targetRect && (
          <TourTooltip
            step={step}
            position={step.position}
            targetRect={targetRect}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={handleSkip}
            currentStep={currentStep}
            totalSteps={TOUR_STEPS.length}
          />
        )
      )}
    </>,
    document.body
  );
}

/**
 * Hook pour gérer le tour guidé
 */
export function useTour() {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const isTourCompleted = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    isOpen,
    startTour,
    closeTour,
    isTourCompleted,
    resetTour,
  };
}

// Export du storage key pour utilisation externe
export { STORAGE_KEY };
