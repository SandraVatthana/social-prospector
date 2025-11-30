import { useState } from 'react';
import { Shield, Check, AlertCircle, Instagram, Music2 } from 'lucide-react';

export default function OptOut() {
  const [formData, setFormData] = useState({
    platform: 'instagram',
    username: '',
    email: '',
    deleteExisting: true,
    blockFuture: true,
    reason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/opt-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: formData.platform,
          username: formData.username.replace('@', ''),
          email: formData.email,
          delete_existing: formData.deleteExisting,
          block_future: formData.blockFuture,
          reason: formData.reason,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Une erreur est survenue');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-warm-900 mb-4">
            Demande enregistrée
          </h1>
          <p className="text-warm-600 mb-6">
            Votre demande de suppression a bien été reçue. Elle sera traitée dans un délai maximum de 72 heures.
          </p>
          {formData.email && (
            <p className="text-sm text-warm-500">
              Une confirmation sera envoyée à <strong>{formData.email}</strong> une fois le traitement effectué.
            </p>
          )}
          <a
            href="/"
            className="inline-block mt-8 text-brand-600 hover:text-brand-700 font-medium"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-display font-bold text-warm-900 mb-2">
            Demande de suppression de données
          </h1>
          <p className="text-warm-600">
            Social Prospector respecte votre vie privée. Si vous souhaitez que vos données soient supprimées, remplissez ce formulaire.
          </p>
        </div>

        {/* Formulaire */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plateforme */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-3">
                Plateforme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: 'instagram' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    formData.platform === 'instagram'
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-warm-200 text-warm-600 hover:border-warm-300'
                  }`}
                >
                  <Instagram className="w-5 h-5" />
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, platform: 'tiktok' })}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    formData.platform === 'tiktok'
                      ? 'border-black bg-gray-50 text-gray-900'
                      : 'border-warm-200 text-warm-600 hover:border-warm-300'
                  }`}
                >
                  <Music2 className="w-5 h-5" />
                  TikTok
                </button>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-warm-700 mb-1.5">
                Votre nom d'utilisateur
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400">@</span>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="votre_username"
                  required
                  className="w-full pl-8 pr-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-warm-700 mb-1.5">
                Email <span className="text-warm-400">(pour confirmation)</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.deleteExisting}
                  onChange={(e) => setFormData({ ...formData, deleteExisting: e.target.checked })}
                  className="w-5 h-5 rounded border-warm-300 text-brand-600 focus:ring-brand-500 mt-0.5"
                />
                <span className="text-warm-700">
                  Supprimer mes données existantes
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.blockFuture}
                  onChange={(e) => setFormData({ ...formData, blockFuture: e.target.checked })}
                  className="w-5 h-5 rounded border-warm-300 text-brand-600 focus:ring-brand-500 mt-0.5"
                />
                <span className="text-warm-700">
                  M'opposer à toute collecte future
                </span>
              </label>
            </div>

            {/* Raison (optionnel) */}
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-warm-700 mb-1.5">
                Raison <span className="text-warm-400">(optionnel)</span>
              </label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Dites-nous pourquoi vous souhaitez être supprimé..."
                rows={3}
                className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !formData.username}
              className="w-full py-3 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer ma demande'}
            </button>

            {/* Info */}
            <p className="text-xs text-warm-500 text-center">
              Traitement sous 72h maximum. Vous recevrez une confirmation par email si renseigné.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-warm-500">
          <p>
            Pour toute question, contactez-nous à{' '}
            <a href="mailto:privacy@myinnerquest.fr" className="text-brand-600 hover:underline">
              privacy@myinnerquest.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
