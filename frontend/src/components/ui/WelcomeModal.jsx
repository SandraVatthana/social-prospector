import { useState, useEffect } from 'react';
import { X, HelpCircle, Sparkles, Mic, Search, Inbox, Target, MessageSquare, BarChart3 } from 'lucide-react';

const STORAGE_KEY = 'social-prospector-hide-welcome';

const FEATURES = [
  {
    icon: Mic,
    title: 'MA VOIX',
    description: 'L\'IA capture ton style unique pour des messages authentiques',
    color: 'bg-brand-100 text-brand-600',
  },
  {
    icon: Search,
    title: 'Recherche intelligente',
    description: 'Trouve des prospects par hashtag, lieu ou compte similaire',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: MessageSquare,
    title: 'Double génération',
    description: 'Message texte + script vocal personnalisés',
    color: 'bg-accent-100 text-accent-600',
  },
  {
    icon: Inbox,
    title: 'CRM Dashboard',
    description: 'Vue Kanban pour gérer tes leads (chaud, tiède, RDV...)',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Target,
    title: 'ICP & Scoring',
    description: 'Scoring automatique basé sur ton client idéal',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Suis tes performances et optimise ta prospection',
    color: 'bg-amber-100 text-amber-600',
  },
];

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a coché "ne plus montrer"
    const hideWelcome = localStorage.getItem(STORAGE_KEY);
    if (!hideWelcome) {
      // Petit délai pour que la page charge d'abord
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bienvenue sur Prospection par DM !</h2>
              <p className="text-white/80 text-sm">La prospection qui parle avec ta vraie voix</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <p className="text-warm-700 leading-relaxed mb-4">
            Découvre les fonctionnalités qui vont transformer ta prospection :
          </p>

          {/* Grille des features */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-2 p-3 bg-warm-50 rounded-xl"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-warm-900 text-sm">{feature.title}</p>
                  <p className="text-xs text-warm-500 leading-tight">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Astuce tour guidé */}
          <div className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100 mb-5">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-warm-700">
                <strong>Astuce :</strong> Clique sur{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-warm-200">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                </span>
                {' '}en haut à droite pour lancer le tour guidé interactif !
              </p>
            </div>
          </div>

          {/* Checkbox ne plus montrer */}
          <label className="flex items-center gap-3 cursor-pointer group mb-5">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-brand-600 border-warm-300 rounded focus:ring-brand-500"
            />
            <span className="text-sm text-warm-500 group-hover:text-warm-700 transition-colors">
              Ne plus afficher ce message
            </span>
          </label>

          {/* Bouton fermer */}
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25"
          >
            C'est parti !
          </button>
        </div>

        {/* Bouton X en haut à droite */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
