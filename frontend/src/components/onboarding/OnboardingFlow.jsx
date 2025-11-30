import { useState } from 'react';
import {
  Mic2,
  Search,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Instagram,
  Music2,
  Target,
  Zap
} from 'lucide-react';

/**
 * Onboarding flow pour les nouveaux utilisateurs
 */
export default function OnboardingFlow({ onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    objectif: null,
    plateforme: null,
    niche: '',
    style: null,
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Bienvenue sur Social Prospector ! 🎯',
      subtitle: 'Trouvez et contactez vos clients idéaux sur Instagram et TikTok',
    },
    {
      id: 'objectif',
      title: 'Quel est votre objectif principal ?',
      subtitle: 'Cela nous aidera à personnaliser votre expérience',
    },
    {
      id: 'plateforme',
      title: 'Sur quelle plateforme souhaitez-vous prospecter ?',
      subtitle: 'Vous pourrez en ajouter d\'autres plus tard',
    },
    {
      id: 'niche',
      title: 'Quelle est votre niche ou audience cible ?',
      subtitle: 'Ex: coachs business, mamans entrepreneures, développeurs...',
    },
    {
      id: 'ready',
      title: 'Vous êtes prêt(e) ! 🚀',
      subtitle: 'Commencez par créer votre profil MA VOIX pour des messages authentiques',
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canContinue = step === 0 || step === steps.length - 1 || 
    (step === 1 && data.objectif) ||
    (step === 2 && data.plateforme) ||
    (step === 3 && data.niche.trim());

  const handleNext = () => {
    if (isLastStep) {
      onComplete(data);
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(0, s - 1));
  };

  const objectifs = [
    { id: 'clients', label: 'Trouver des clients', icon: Target, description: 'Développer mon activité' },
    { id: 'collab', label: 'Trouver des partenaires', icon: Sparkles, description: 'Collaborations & co-créations' },
    { id: 'influence', label: 'Contacter des influenceurs', icon: Zap, description: 'Partenariats & ambassadeurs' },
  ];

  const plateformes = [
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
    { id: 'tiktok', label: 'TikTok', icon: Music2, color: 'from-black to-gray-800' },
    { id: 'both', label: 'Les deux', icon: Sparkles, color: 'from-brand-500 to-accent-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-brand-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step
                  ? 'w-8 bg-brand-500'
                  : i < step
                  ? 'w-2 bg-brand-300'
                  : 'w-2 bg-warm-200'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-brand-500/10 overflow-hidden">
          <div className="p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900 mb-2">
                {currentStep.title}
              </h1>
              <p className="text-warm-500">{currentStep.subtitle}</p>
            </div>

            {/* Content par étape */}
            <div className="min-h-[200px]">
              {/* Welcome */}
              {step === 0 && (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center">
                      <Mic2 className="w-8 h-8 text-brand-600" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-warm-300" />
                    <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center">
                      <Search className="w-8 h-8 text-accent-600" />
                    </div>
                    <ArrowRight className="w-6 h-6 text-warm-300" />
                    <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="font-medium text-warm-900">1. MA VOIX</p>
                      <p className="text-warm-500">Créez votre style</p>
                    </div>
                    <div>
                      <p className="font-medium text-warm-900">2. Recherche</p>
                      <p className="text-warm-500">Trouvez des prospects</p>
                    </div>
                    <div>
                      <p className="font-medium text-warm-900">3. Contact</p>
                      <p className="text-warm-500">Envoyez des messages</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Objectif */}
              {step === 1 && (
                <div className="grid gap-3">
                  {objectifs.map(obj => (
                    <button
                      key={obj.id}
                      onClick={() => setData(d => ({ ...d, objectif: obj.id }))}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        data.objectif === obj.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        data.objectif === obj.id ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-500'
                      }`}>
                        <obj.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-warm-900">{obj.label}</p>
                        <p className="text-sm text-warm-500">{obj.description}</p>
                      </div>
                      {data.objectif === obj.id && (
                        <Check className="w-5 h-5 text-brand-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Plateforme */}
              {step === 2 && (
                <div className="grid grid-cols-3 gap-4">
                  {plateformes.map(plat => (
                    <button
                      key={plat.id}
                      onClick={() => setData(d => ({ ...d, plateforme: plat.id }))}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        data.plateforme === plat.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${plat.color} flex items-center justify-center mx-auto mb-3`}>
                        <plat.icon className="w-7 h-7 text-white" />
                      </div>
                      <p className="font-medium text-warm-900">{plat.label}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Niche */}
              {step === 3 && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={data.niche}
                    onChange={(e) => setData(d => ({ ...d, niche: e.target.value }))}
                    placeholder="Décrivez votre audience cible..."
                    className="w-full px-4 py-4 text-lg border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-2">
                    {['Coachs', 'E-commerce', 'SaaS', 'Freelances', 'Créateurs', 'Agences'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setData(d => ({ ...d, niche: tag }))}
                        className="px-3 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-lg text-sm transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready */}
              {step === 4 && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-warm-700">
                      <strong>Objectif :</strong> {objectifs.find(o => o.id === data.objectif)?.label}
                    </p>
                    <p className="text-warm-700">
                      <strong>Plateforme :</strong> {plateformes.find(p => p.id === data.plateforme)?.label}
                    </p>
                    <p className="text-warm-700">
                      <strong>Niche :</strong> {data.niche}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 md:px-12 py-6 bg-warm-50 border-t border-warm-100 flex items-center justify-between">
            <div>
              {step > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </button>
              ) : (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-warm-500 hover:text-warm-700 text-sm transition-colors"
                >
                  Passer l'introduction
                </button>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={!canContinue}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              {isLastStep ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Créer mon profil MA VOIX
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
