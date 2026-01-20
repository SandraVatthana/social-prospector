import { Monitor, Smartphone } from 'lucide-react';

/**
 * Composant qui bloque l'accès sur mobile/tablette
 * Affiché uniquement sur les petits écrans
 */
export default function MobileBlocker() {
  return (
    <div className="lg:hidden fixed inset-0 z-[9999] bg-gradient-to-br from-brand-500 via-brand-600 to-accent-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-2xl">
        {/* Icône */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 bg-brand-100 rounded-2xl flex items-center justify-center">
            <Monitor className="w-10 h-10 text-brand-600" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-red-500" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-0.5 bg-red-500 rotate-45 rounded-full" />
            </div>
          </div>
        </div>

        {/* Titre */}
        <h1 className="font-display text-2xl font-bold text-warm-900 mb-3">
          Disponible sur ordinateur uniquement
        </h1>

        {/* Message */}
        <p className="text-warm-600 mb-6 leading-relaxed">
          Prospection par DM est optimisé pour une utilisation sur ordinateur.
          Connecte-toi depuis ton PC ou Mac pour profiter de toutes les fonctionnalités.
        </p>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 text-brand-600">
          <img
            src="/logofinal.png"
            alt="Prospection par DM"
            className="w-8 h-8 rounded-lg"
          />
          <span className="font-display font-bold">Prospection par DM</span>
        </div>

        {/* Note */}
        <p className="mt-6 text-xs text-warm-400">
          Une version mobile est prévue pour bientôt !
        </p>
      </div>
    </div>
  );
}
