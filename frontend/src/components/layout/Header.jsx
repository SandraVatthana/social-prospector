import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';

/**
 * Header réutilisable pour les pages
 * Affiche un bouton retour sur les sous-pages (pas sur le dashboard)
 */
export default function Header({ title, subtitle, action, children, showBack, onStartTour }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Afficher le bouton retour si on n'est pas sur la page d'accueil
  const shouldShowBack = showBack !== undefined ? showBack : location.pathname !== '/';

  return (
    <header className="bg-white border-b border-warm-200 px-4 lg:px-8 py-4 lg:py-6">
      {/* Spacer pour le bouton hamburger sur mobile */}
      <div className="h-8 lg:hidden" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {shouldShowBack && (
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl hover:bg-warm-100 text-warm-500 hover:text-warm-700 transition-colors"
              title="Retour au dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-display text-xl lg:text-2xl font-bold text-warm-900">{title}</h1>
            {subtitle && <p className="text-warm-500 mt-1 text-sm lg:text-base">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Bouton d'aide pour relancer le tour guidé */}
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="p-2 rounded-xl hover:bg-brand-50 text-warm-400 hover:text-brand-600 transition-colors"
              title="Relancer le tour guidé"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          )}
          {action}
        </div>
      </div>
      {children}
    </header>
  );
}
