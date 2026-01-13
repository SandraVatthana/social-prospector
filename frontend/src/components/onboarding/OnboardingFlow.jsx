import { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Instagram,
  Linkedin,
  Sparkles,
  Target,
  Users,
  Briefcase,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react';

// Icône TikTok custom
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

/**
 * Objectifs disponibles
 */
const OBJECTIFS = [
  { id: 'clients', label: 'Trouver des clients', icon: Target },
  { id: 'reseau', label: 'Développer mon réseau / ma communauté', icon: Users },
  { id: 'partenaires', label: 'Trouver des partenaires / collaborations', icon: Briefcase },
  { id: 'affilies', label: 'Recruter des affiliés / ambassadeurs', icon: Sparkles },
];

/**
 * Plateformes disponibles
 */
const PLATEFORMES = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'from-pink-500 to-purple-600',
    description: 'Analyse automatique des profils publics',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: TikTokIcon,
    color: 'from-black to-gray-800',
    description: 'Analyse automatique des profils publics',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'from-blue-600 to-blue-800',
    description: 'Suggestions uniquement (pas de scraping)',
    note: true,
  },
];

/**
 * Onboarding enrichi en 4 étapes
 */
export default function OnboardingFlow({ onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    // Étape 1 : Activité
    metier: '',
    secteur_niche: '',
    offre_description: '',
    // Étape 2 : Client idéal
    client_ideal: '',
    probleme_client: '',
    zone_geo: 'France',
    // Étape 3 : Objectif
    objectif: '',
    objectif_autre: '',
    // Étape 4 : Plateformes
    plateformes: ['instagram'],
  });

  const updateField = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const togglePlateforme = (id) => {
    setData(prev => {
      const current = prev.plateformes;
      if (current.includes(id)) {
        // Ne pas permettre de tout désélectionner
        if (current.length === 1) return prev;
        return { ...prev, plateformes: current.filter(p => p !== id) };
      }
      return { ...prev, plateformes: [...current, id] };
    });
  };

  // Validation par étape
  const isStepValid = () => {
    switch (step) {
      case 1:
        return data.metier.trim() && data.secteur_niche.trim() && data.offre_description.trim();
      case 2:
        return data.client_ideal.trim() && data.probleme_client.trim();
      case 3:
        return data.objectif || data.objectif_autre.trim();
      case 4:
        return data.plateformes.length > 0;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep(s => s + 1);
    } else {
      // Dernière étape : soumettre et générer les suggestions
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        const finalData = {
          ...data,
          objectif: data.objectif || data.objectif_autre,
        };

        const response = await fetch(`${API_BASE_URL}/onboarding/complete-enriched`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(finalData),
        });

        if (!response.ok) {
          throw new Error('Erreur lors de la sauvegarde');
        }

        const result = await response.json();
        onComplete(result.data);
      } catch (err) {
        console.error('Onboarding error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-brand-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
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
          <div className="p-8 md:p-10">
            {/* Étape 1 : Ton activité */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-4">
                    📍 ÉTAPE 1/4
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                    Ton activité
                  </h1>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Quel est ton métier ? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.metier}
                      onChange={(e) => updateField('metier', e.target.value)}
                      placeholder="Ex: Coach, formatrice, freelance, agence..."
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Ton secteur / ta niche ? <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.secteur_niche}
                      onChange={(e) => updateField('secteur_niche', e.target.value)}
                      placeholder="Ex: Bien-être, business en ligne, artisanat..."
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Tu vends quoi ? (en 1 phrase) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={data.offre_description}
                      onChange={(e) => updateField('offre_description', e.target.value)}
                      placeholder="Ex: Accompagnement pour entrepreneures qui veulent développer leur activité sans s'épuiser"
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Étape 2 : Ton client idéal */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-4">
                    📍 ÉTAPE 2/4
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                    Ton client idéal
                  </h1>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Qui est ton client idéal ? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={data.client_ideal}
                      onChange={(e) => updateField('client_ideal', e.target.value)}
                      placeholder="Ex: Femmes entrepreneures 30-45 ans, coachs qui débutent, artisans qui veulent vendre en ligne..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Quel problème principal a-t-il/elle ? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={data.probleme_client}
                      onChange={(e) => updateField('probleme_client', e.target.value)}
                      placeholder="Ex: Pas assez de clients, manque de visibilité, charge mentale, ne sait pas se vendre..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Où se trouve-t-il/elle géographiquement ?
                    </label>
                    <input
                      type="text"
                      value={data.zone_geo}
                      onChange={(e) => updateField('zone_geo', e.target.value)}
                      placeholder="Ex: France, francophone, monde entier..."
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Étape 3 : Ton objectif */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-4">
                    📍 ÉTAPE 3/4
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                    Ton objectif
                  </h1>
                  <p className="text-warm-500 mt-2">
                    Tu veux quoi avec la Prospection par DM ?
                  </p>
                </div>

                <div className="space-y-3">
                  {OBJECTIFS.map((obj) => (
                    <button
                      key={obj.id}
                      onClick={() => {
                        updateField('objectif', obj.id);
                        updateField('objectif_autre', '');
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        data.objectif === obj.id
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        data.objectif === obj.id ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-500'
                      }`}>
                        <obj.icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-warm-900">{obj.label}</span>
                      {data.objectif === obj.id && (
                        <Check className="w-5 h-5 text-brand-500 ml-auto" />
                      )}
                    </button>
                  ))}

                  {/* Option "Autre" */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${
                    data.objectif_autre.trim()
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-warm-200'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        data.objectif_autre.trim() ? 'bg-brand-500 text-white' : 'bg-warm-100 text-warm-500'
                      }`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        value={data.objectif_autre}
                        onChange={(e) => {
                          updateField('objectif_autre', e.target.value);
                          if (e.target.value.trim()) {
                            updateField('objectif', '');
                          }
                        }}
                        placeholder="Autre : décris ton objectif..."
                        className="flex-1 bg-transparent border-none outline-none text-warm-900 placeholder-warm-400"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Étape 4 : Tes plateformes */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium mb-4">
                    📍 ÉTAPE 4/4
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-warm-900">
                    Tes plateformes
                  </h1>
                  <p className="text-warm-500 mt-2">
                    Sur quelles plateformes veux-tu prospecter ?
                  </p>
                </div>

                <div className="space-y-3">
                  {PLATEFORMES.map((plat) => (
                    <button
                      key={plat.id}
                      onClick={() => togglePlateforme(plat.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                        data.plateformes.includes(plat.id)
                          ? 'border-brand-500 bg-brand-50'
                          : 'border-warm-200 hover:border-warm-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plat.color} flex items-center justify-center`}>
                        <plat.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-warm-900">{plat.label}</p>
                        <p className="text-sm text-warm-500">{plat.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                        data.plateformes.includes(plat.id)
                          ? 'border-brand-500 bg-brand-500'
                          : 'border-warm-300'
                      }`}>
                        {data.plateformes.includes(plat.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Note LinkedIn */}
                {data.plateformes.includes('linkedin') && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Note LinkedIn</p>
                        <p>
                          Pour respecter leurs règles, Prospection par DM ne peut pas analyser
                          les profils automatiquement. On te suggère des mots-clés et des messages,
                          tu fais la recherche toi-même.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 md:px-10 py-6 bg-warm-50 border-t border-warm-100 flex items-center justify-between">
            <div>
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors disabled:opacity-50"
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
              disabled={!isStepValid() || isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Génération...
                </>
              ) : step === 4 ? (
                <>
                  <Check className="w-4 h-4" />
                  Terminer
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
