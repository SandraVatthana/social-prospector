import { useState } from 'react';
import { Mic, FlaskConical, Settings2 } from 'lucide-react';
import TestVoiceModal from './TestVoiceModal';
import ConfigureVoiceModal from './ConfigureVoiceModal';

/**
 * Widget MA VOIX pour le dashboard
 * Affiche le profil vocal actif avec les boutons "Tester" et "Configurer"
 */
export default function VoiceWidget({ voiceProfile, onEditProfile, onProfileUpdated }) {
  const [showTestModal, setShowTestModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);

  // Profil par défaut si non configuré
  const profile = voiceProfile || {
    name: 'MA VOIX',
    tone: 'Décontracté',
    tutoiement: 'Toujours',
    emojis: ['default'],
    isActive: false,
  };

  const handleConfigureComplete = (newProfile) => {
    onProfileUpdated?.(newProfile);
  };

  return (
    <>
      <div className="card p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <Mic className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-warm-900">MA VOIX</h3>
            <p className="text-sm text-warm-500">
              {profile.isActive ? 'Profil actif' : 'Non configuré'}
            </p>
          </div>
          {profile.isActive && (
            <span className="w-3 h-3 rounded-full bg-green-500" />
          )}
        </div>

        {/* Infos du profil */}
        {profile.isActive ? (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-500">Ton</span>
              <span className="font-medium text-warm-700">{profile.tone}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-500">Tutoiement</span>
              <span className="font-medium text-warm-700">{profile.tutoiement}</span>
            </div>
            {profile.emojis && profile.emojis.length > 0 && profile.emojis[0] !== 'default' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-500">Emojis</span>
                <span className="font-medium text-warm-700">
                  {profile.emojis.slice(0, 4).join(' ')}
                </span>
              </div>
            )}
            {profile.fidelityScore && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-500">Fidélité</span>
                <span className="font-semibold text-brand-600">
                  {profile.fidelityScore}%
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-warm-50 rounded-xl mb-4">
            <p className="text-sm text-warm-600">
              Configure ton profil vocal pour générer des messages qui te ressemblent !
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {/* Bouton Configurer ma voix */}
          <button
            onClick={() => setShowConfigureModal(true)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-all ${
              profile.isActive
                ? 'text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-brand-200'
                : 'text-white bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 shadow-lg shadow-brand-500/25'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            {profile.isActive ? 'Reconfigurer ma voix' : 'Configurer ma voix'}
          </button>

          {/* Bouton Tester ma voix - seulement si profil actif */}
          {profile.isActive && (
            <button
              onClick={() => setShowTestModal(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 rounded-xl transition-all shadow-lg shadow-brand-500/25"
            >
              <FlaskConical className="w-4 h-4" />
              Tester ma voix
            </button>
          )}

          {/* Modifier / Voir le profil complet */}
          {profile.isActive && (
            <button
              onClick={onEditProfile}
              className="w-full py-2 text-sm font-medium text-warm-500 hover:text-warm-700 hover:bg-warm-50 rounded-lg transition-colors"
            >
              Voir le profil complet →
            </button>
          )}
        </div>
      </div>

      {/* Modal de test */}
      <TestVoiceModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        voiceProfile={profile}
      />

      {/* Modal de configuration */}
      <ConfigureVoiceModal
        isOpen={showConfigureModal}
        onClose={() => setShowConfigureModal(false)}
        onComplete={handleConfigureComplete}
      />
    </>
  );
}
