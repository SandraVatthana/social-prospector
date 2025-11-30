import { useState } from 'react';
import { ArrowRight, Building2, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import OnboardingProfond from '../onboarding/OnboardingProfond';
import { useClient } from '../../contexts/ClientContext';

/**
 * Modal pour ajouter un nouveau client (Mode Agence)
 * Étape 1: Infos basiques du client
 * Étape 2: Configuration MA VOIX via l'onboarding
 */
export default function AddClientModal({ isOpen, onClose }) {
  const { addClient, switchClient } = useClient();
  const [step, setStep] = useState('info'); // 'info' | 'onboarding'
  const [clientInfo, setClientInfo] = useState({ name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    // Reset state
    setStep('info');
    setClientInfo({ name: '' });
    setError('');
    onClose();
  };

  const handleStartOnboarding = () => {
    if (!clientInfo.name.trim()) {
      setError('Le nom du client est requis');
      return;
    }
    setError('');
    setStep('onboarding');
  };

  const handleOnboardingComplete = async (onboardingData, voiceProfile) => {
    setSaving(true);
    try {
      const newClient = await addClient({
        name: clientInfo.name.trim(),
        onboarding_data: onboardingData,
        voice_profile: voiceProfile,
        status: 'active',
      });

      // Switcher vers le nouveau client
      if (newClient?.id) {
        switchClient(newClient.id);
      }

      handleClose();
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Erreur lors de la création du client');
    } finally {
      setSaving(false);
    }
  };

  const handleOnboardingSkip = async () => {
    // Créer le client sans MA VOIX configurée
    setSaving(true);
    try {
      const newClient = await addClient({
        name: clientInfo.name.trim(),
        onboarding_data: null,
        voice_profile: null,
        status: 'pending',
      });

      if (newClient?.id) {
        switchClient(newClient.id);
      }

      handleClose();
    } catch (err) {
      console.error('Error creating client:', err);
      setError('Erreur lors de la création du client');
    } finally {
      setSaving(false);
    }
  };

  // Étape 1 : Infos basiques
  if (step === 'info') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Nouveau client"
        description="Ajoutez un nouveau client à votre portefeuille"
        size="medium"
      >
        <div className="space-y-6">
          {/* Icône */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-100 to-accent-200 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-accent-600" />
            </div>
          </div>

          {/* Champ nom */}
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-2">
              Nom du client / marque *
            </label>
            <input
              type="text"
              value={clientInfo.name}
              onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
              placeholder="Ex: Marie Coaching, Studio Pilates Lyon..."
              className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleStartOnboarding()}
            />
            <p className="text-xs text-warm-400 mt-2">
              Ce nom sera affiché dans votre liste de clients
            </p>
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleStartOnboarding}
              disabled={!clientInfo.name.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              Configurer MA VOIX pour ce client
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-xs text-warm-400 text-center">
              Vous pourrez personnaliser la voix et le style de prospection de ce client
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  // Étape 2 : Onboarding MA VOIX
  return (
    <div className="fixed inset-0 z-50">
      {/* Header avec nom du client */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-warm-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-semibold">
              {clientInfo.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-warm-500">Configuration pour</p>
              <p className="font-semibold text-warm-900">{clientInfo.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-sm text-warm-500 hover:text-warm-700 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>

      {/* Onboarding */}
      <OnboardingProfond
        mode="client"
        clientName={clientInfo.name}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* Loading overlay */}
      {saving && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Création du client en cours...</p>
          </div>
        </div>
      )}
    </div>
  );
}
