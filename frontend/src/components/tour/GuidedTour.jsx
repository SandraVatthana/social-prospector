import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Mic, Search, Users, MessageSquare, AlertTriangle, PartyPopper } from 'lucide-react';

const STORAGE_KEY = 'social_prospector_tour_completed';

/**
 * Configuration des étapes du tour guidé
 */
const TOUR_STEPS = [
  {
    id: 'voice',
    target: '[data-tour="voice"]',
    title: 'MA VOIX',
    content: 'Commence par configurer ta voix ! Colle 2-10 textes que tu as écrits et l\'IA analysera ton style. Tous tes messages sonneront comme TOI.',
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
    id: 'prospects',
    target: '[data-tour="prospects"]',
    title: 'Prospects',
    content: 'Tous tes prospects sauvegardés. Génère des messages personnalisés basés sur leurs posts récents.',
    icon: Users,
    position: 'right',
  },
  {
    id: 'status',
    target: '[data-tour="status"]',
    title: 'Statuts',
    content: 'Les statuts se mettent à jour automatiquement quand tu génères un message. MAIS quand le prospect répond, c\'est à toi de changer le statut manuellement (on n\'a pas accès à tes DMs 😉).',
    icon: AlertTriangle,
    position: 'bottom',
    important: true,
  },
  {
    id: 'quota',
    target: '[data-tour="quota"]',
    title: 'Quota DMs',
    content: 'Pour protéger ton compte, on track tes envois. Instagram recommande max 5 DMs/heure et 40/jour. On t\'alerte avant les limites !',
    icon: AlertTriangle,
    position: 'top',
  },
  {
    id: 'messages',
    target: '[data-tour="messages"]',
    title: 'Messages',
    content: 'Tous tes messages générés. Copie-les, envoie-les manuellement sur Instagram/TikTok, puis reviens cliquer \'Envoyé\'.',
    icon: MessageSquare,
    position: 'right',
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
      className="fixed z-[10002] w-80 bg-white rounded-2xl shadow-2xl border border-warm-200 animate-fade-in"
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
    <div className="fixed inset-0 z-[10003] flex items-center justify-center p-4">
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
          Commence par configurer <strong>MA VOIX</strong> pour des messages qui sonnent vraiment comme toi.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfigureVoice}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Mic className="w-5 h-5" />
            Configurer MA VOIX
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
      <div className="fixed inset-0 z-[10000]">
        {/* Overlay principal */}
        <div className="absolute inset-0 bg-black/70" />

        {/* Zone découpée pour l'élément actif */}
        {targetRect && !showCompletion && (
          <div
            className="absolute bg-transparent rounded-xl ring-4 ring-brand-400 ring-offset-4 ring-offset-transparent"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            }}
          />
        )}
      </div>

      {/* Bouton fermer */}
      <button
        onClick={handleSkip}
        className="fixed top-4 right-4 z-[10003] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
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
