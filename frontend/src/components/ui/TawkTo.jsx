import { useEffect } from 'react';

/**
 * Composant Tawk.to - Chat en direct
 * S'initialise une seule fois au montage
 */
export default function TawkTo() {
  useEffect(() => {
    // Éviter les doublons si déjà chargé
    if (window.Tawk_API) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/696ff92ff657ac197b7840eb/1jfemaonp';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

    // Cleanup au démontage (optionnel)
    return () => {
      // Tawk.to ne se démonte pas proprement, on laisse le script
    };
  }, []);

  return null; // Composant invisible, juste pour le side-effect
}
