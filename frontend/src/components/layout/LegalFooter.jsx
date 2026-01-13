import { Link } from 'react-router-dom';

export default function LegalFooter() {
  return (
    <footer className="border-t border-warm-200 bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-warm-500">
              Prospection par DM — <span className="font-medium">SOS Storytelling</span>
            </span>
          </div>

          {/* Legal links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link
              to="/privacy"
              className="text-warm-500 hover:text-warm-700 transition-colors"
            >
              Politique de confidentialité
            </Link>
            <Link
              to="/terms"
              className="text-warm-500 hover:text-warm-700 transition-colors"
            >
              CGU
            </Link>
            <Link
              to="/legal"
              className="text-warm-500 hover:text-warm-700 transition-colors"
            >
              Mentions légales
            </Link>
            <Link
              to="/opt-out"
              className="text-warm-500 hover:text-warm-700 transition-colors"
            >
              Suppression de données
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-warm-400">
            © {new Date().getFullYear()} My Inner Quest. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
