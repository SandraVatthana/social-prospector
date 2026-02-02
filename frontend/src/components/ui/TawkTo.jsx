import { useEffect, useRef } from 'react';

/**
 * Composant Tawk.to - Chat en direct
 * S'initialise une seule fois au montage
 */
export default function TawkTo() {
  const scriptRef = useRef(null);

  useEffect(() => {
    // Éviter les doublons si déjà chargé
    if (window.Tawk_API && window.Tawk_API.onLoaded) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/696ff92ff657ac197b7840eb/1jfemaonp';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    script.id = 'tawk-script';
    scriptRef.current = script;

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    // Cleanup au démontage
    return () => {
      // Masquer le widget Tawk au démontage
      if (window.Tawk_API && window.Tawk_API.hideWidget) {
        window.Tawk_API.hideWidget();
      }
      // Retirer le script si on veut un cleanup complet
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
    };
  }, []);

  return null; // Composant invisible, juste pour le side-effect
}
