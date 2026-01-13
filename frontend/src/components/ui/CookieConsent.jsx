import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, Check, Settings } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Petit délai pour ne pas afficher immédiatement
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      >
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-warm-200 overflow-hidden">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-6 h-6 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg text-warm-900 mb-1">
                  Nous respectons votre vie privée
                </h3>
                <p className="text-warm-600 text-sm">
                  Nous utilisons des cookies pour améliorer votre expérience et analyser notre trafic.
                  Vous pouvez choisir les cookies que vous acceptez.
                </p>
              </div>
            </div>

            {/* Détails (optionnel) */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="bg-warm-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-warm-900">Cookies nécessaires</p>
                        <p className="text-xs text-warm-500">Requis pour le fonctionnement du site</p>
                      </div>
                      <div className="w-10 h-6 bg-brand-500 rounded-full flex items-center justify-end px-1">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-warm-900">Cookies analytiques</p>
                        <p className="text-xs text-warm-500">Nous aident à améliorer le site</p>
                      </div>
                      <div className="w-10 h-6 bg-warm-300 rounded-full flex items-center px-1">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-warm-900">Cookies marketing</p>
                        <p className="text-xs text-warm-500">Personnalisent votre expérience</p>
                      </div>
                      <div className="w-10 h-6 bg-warm-300 rounded-full flex items-center px-1">
                        <div className="w-4 h-4 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-sm text-warm-600 hover:text-warm-900 flex items-center gap-1 order-3 sm:order-1"
              >
                <Settings className="w-4 h-4" />
                {showDetails ? 'Masquer' : 'Personnaliser'}
              </button>

              <div className="flex-1" />

              <button
                onClick={handleReject}
                className="w-full sm:w-auto px-5 py-2.5 text-warm-600 hover:text-warm-900 hover:bg-warm-100 rounded-xl transition-colors order-2 sm:order-2"
              >
                Refuser
              </button>

              <button
                onClick={handleAcceptNecessary}
                className="w-full sm:w-auto px-5 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 rounded-xl transition-colors order-1 sm:order-3"
              >
                Essentiels uniquement
              </button>

              <button
                onClick={handleAcceptAll}
                className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 order-0 sm:order-4"
              >
                <Check className="w-4 h-4" />
                Tout accepter
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook pour vérifier le consentement cookies
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      setConsent(JSON.parse(stored));
    }
  }, []);

  return consent;
}
