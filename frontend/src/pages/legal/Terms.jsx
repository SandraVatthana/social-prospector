import { useEffect } from 'react';

export default function Terms() {
  useEffect(() => {
    window.location.href = 'https://sosstorytelling.fr/terms.html';
  }, []);

  return (
    <div className="min-h-screen bg-warm-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-warm-500">Redirection vers SOS Storytelling...</p>
      </div>
    </div>
  );
}
