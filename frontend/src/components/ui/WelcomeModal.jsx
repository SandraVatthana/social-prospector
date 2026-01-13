import { useState, useEffect } from 'react';
import { X, HelpCircle, Sparkles } from 'lucide-react';

const STORAGE_KEY = 'social-prospector-hide-welcome';

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
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header gradient */}
        <div className="bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bienvenue !</h2>
              <p className="text-white/80 text-sm">Version Bêta</p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6">
          <p className="text-warm-700 leading-relaxed mb-4">
            Merci de tester <strong>Prospection par DM</strong> ! Vos retours nous aideront à améliorer cette plateforme.
          </p>

          <div className="flex items-start gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
              <HelpCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-warm-700">
                <strong>Pour commencer</strong>, cliquez sur le{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-warm-200">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                </span>
                {' '}en haut à droite de l'écran pour découvrir le tour guidé.
              </p>
            </div>
          </div>

          {/* Checkbox ne plus montrer */}
          <label className="flex items-center gap-3 cursor-pointer group mb-6">
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
