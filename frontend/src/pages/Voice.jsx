import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  Edit3,
  Save,
  X,
  FlaskConical,
  Sparkles,
  Check,
  AlertCircle,
  Volume2,
  MessageSquare,
  Zap,
  Info,
  Settings,
  Smile,
  PenTool,
  Loader2,
} from 'lucide-react';
import Header from '../components/layout/Header';
import TestVoiceModal from '../components/dashboard/TestVoiceModal';
import ConfigureVoiceModal from '../components/dashboard/ConfigureVoiceModal';
import OnboardingProfond from '../components/onboarding/OnboardingProfond';
import { API_BASE_URL } from '../lib/api';

// Profil par défaut (utilisé seulement si aucune donnée n'existe)
const defaultVoiceProfile = {
  nom: 'MA VOIX',
  description: 'Configure ta voix pour des messages authentiques',

  ton_dominant: 'decontracte',
  tons_secondaires: [],
  niveau_energie: 5,

  tutoiement: 'parfois',
  longueur_messages: 'court',

  utilisation_emojis: {
    frequence: 'parfois',
    favoris: [],
    position: 'fin',
  },

  expressions_cles: [],
  mots_signature: [],

  structure_messages: {
    accroche_type: 'compliment',
    corps_type: 'direct',
    cta_type: 'question_ouverte',
  },

  a_eviter: [],

  contexte_business: {
    activite: '',
    cible: '',
    proposition_valeur: '',
    differentiation: '',
    lead_magnet: '',
    objectif_prospection: 'prise_rdv',
    premier_contact_type: 'dm_personnalise',
  },

  exemples_messages: [],

  isActive: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),

  settings: {
    reproduire_imperfections: true,
    utiliser_emojis: true,
    niveau_energie_override: null,
  },
};

const tonOptions = [
  { id: 'decontracte', label: 'Décontracté', emoji: '😎', description: 'Relax et accessible' },
  { id: 'pro', label: 'Pro', emoji: '💼', description: 'Professionnel mais pas froid' },
  { id: 'direct', label: 'Direct', emoji: '🎯', description: 'Droit au but, sans détour' },
  { id: 'inspirant', label: 'Inspirant', emoji: '✨', description: 'Motivant et positif' },
  { id: 'chaleureux', label: 'Chaleureux', emoji: '🤗', description: 'Accueillant et bienveillant' },
  { id: 'expert', label: 'Expert', emoji: '🧠', description: 'Autoritaire sur ton sujet' },
];

const tutoiementOptions = [
  { id: 'toujours', label: 'Toujours', description: 'Tu tutoies systématiquement' },
  { id: 'parfois', label: 'Parfois', description: 'Selon le contexte' },
  { id: 'jamais', label: 'Jamais', description: 'Tu vouvoies toujours' },
];

const emojiFrequencyOptions = [
  { id: 'jamais', label: 'Jamais', description: 'Pas d\'emojis' },
  { id: 'rarement', label: 'Rarement', description: '1 max par message' },
  { id: 'parfois', label: 'Parfois', description: '2-3 par message' },
  { id: 'souvent', label: 'Souvent', description: '4+ par message' },
];

const popularEmojis = ['🚀', '✨', '💪', '🔥', '💫', '🎯', '💜', '⚡', '🌟', '👋', '😊', '🙌', '💡', '🎉', '❤️', '👀'];

export default function Voice() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(defaultVoiceProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(defaultVoiceProfile);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger le profil depuis l'API au montage
  useEffect(() => {
    const fetchVoiceProfile = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        // Récupérer les données d'onboarding (contient le profil MA VOIX complet)
        const onboardingResponse = await fetch(`${API_BASE_URL}/onboarding/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (onboardingResponse.ok) {
          const onboardingResult = await onboardingResponse.json();
          const onboardingData = onboardingResult.data?.data;

          if (onboardingData) {
            // Mapper les données d'onboarding vers le format du profil
            const mappedProfile = {
              ...defaultVoiceProfile,
              nom: `MA VOIX — ${onboardingData.prenom || 'Moi'}`,
              description: onboardingData.activite ?
                `${onboardingData.type_activite || 'Professionnel'} en ${onboardingData.activite}` :
                defaultVoiceProfile.description,

              ton_dominant: Array.isArray(onboardingData.ton) ? onboardingData.ton[0] : (onboardingData.ton || 'decontracte'),
              tons_secondaires: Array.isArray(onboardingData.ton) ? onboardingData.ton.slice(1) : [],
              niveau_energie: onboardingData.niveau_energie || 5,

              tutoiement: onboardingData.tutoiement || 'parfois',

              utilisation_emojis: {
                frequence: onboardingData.utilisation_emojis || 'parfois',
                favoris: onboardingData.emojis_favoris || [],
                position: 'fin',
              },

              expressions_cles: onboardingData.expressions ?
                onboardingData.expressions.split(',').map(e => e.trim()).filter(Boolean) : [],
              mots_signature: onboardingData.mots_signature ?
                onboardingData.mots_signature.split(',').map(e => e.trim()).filter(Boolean) : [],

              a_eviter: onboardingData.a_eviter ?
                onboardingData.a_eviter.split(',').map(e => e.trim()).filter(Boolean) : [],

              contexte_business: {
                activite: onboardingData.activite || '',
                cible: onboardingData.cible_description || onboardingData.client_ideal || '',
                proposition_valeur: onboardingData.resultat_promis || onboardingData.offre_description || '',
                differentiation: onboardingData.differentiation || '',
                lead_magnet: onboardingData.lead_magnet || '',
                objectif_prospection: onboardingData.objectif_prospection || 'prise_rdv',
                premier_contact_type: onboardingData.premier_contact_type || 'dm_personnalise',
              },

              exemples_messages: onboardingData.exemples_messages || [],

              isActive: true,
              settings: {
                reproduire_imperfections: true,
                utiliser_emojis: onboardingData.utilisation_emojis !== 'jamais',
                niveau_energie_override: null,
              },
            };

            setProfile(mappedProfile);
            setEditedProfile(mappedProfile);
          }
        }

        // Récupérer aussi les profils vocaux de la base (pour les training texts, etc.)
        const voiceResponse = await fetch(`${API_BASE_URL}/voice/profiles`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (voiceResponse.ok) {
          const voiceResult = await voiceResponse.json();
          const activeVoiceProfile = voiceResult.data?.find(p => p.is_active) || voiceResult.data?.[0];

          if (activeVoiceProfile) {
            // Enrichir avec les données du profil vocal si disponibles
            setProfile(prev => ({
              ...prev,
              nom: activeVoiceProfile.name || prev.nom,
              ton_dominant: activeVoiceProfile.tone || prev.ton_dominant,
              expressions_cles: activeVoiceProfile.keywords || prev.expressions_cles,
              a_eviter: activeVoiceProfile.avoid_words || prev.a_eviter,
              contexte_business: {
                ...prev.contexte_business,
                cible: activeVoiceProfile.target_audience || prev.contexte_business.cible,
                proposition_valeur: activeVoiceProfile.offer_description || prev.contexte_business.proposition_valeur,
              },
            }));
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVoiceProfile();
  }, []);

  const handleEdit = () => {
    setEditedProfile({ ...profile });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedProfile({ ...profile });
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // Sauvegarder le profil vocal via l'API
      const response = await fetch(`${API_BASE_URL}/voice/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nom: editedProfile.nom,
          ton_dominant: editedProfile.ton_dominant,
          tons_secondaires: editedProfile.tons_secondaires,
          tutoiement: editedProfile.tutoiement,
          niveau_energie: editedProfile.niveau_energie,
          utilisation_emojis: editedProfile.utilisation_emojis,
          expressions_cles: editedProfile.expressions_cles,
          mots_signature: editedProfile.mots_signature,
          a_eviter: editedProfile.a_eviter,
          contexte_business: editedProfile.contexte_business,
          isActive: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      setProfile({ ...editedProfile });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde du profil');
    } finally {
      setSaving(false);
    }
  };

  const toggleTonSecondaire = (tonId) => {
    const current = editedProfile.tons_secondaires || [];
    if (current.includes(tonId)) {
      setEditedProfile({
        ...editedProfile,
        tons_secondaires: current.filter(t => t !== tonId),
      });
    } else if (current.length < 3) {
      setEditedProfile({
        ...editedProfile,
        tons_secondaires: [...current, tonId],
      });
    }
  };

  const toggleEmoji = (emoji) => {
    const current = editedProfile.utilisation_emojis?.favoris || [];
    if (current.includes(emoji)) {
      setEditedProfile({
        ...editedProfile,
        utilisation_emojis: {
          ...editedProfile.utilisation_emojis,
          favoris: current.filter(e => e !== emoji),
        },
      });
    } else if (current.length < 6) {
      setEditedProfile({
        ...editedProfile,
        utilisation_emojis: {
          ...editedProfile.utilisation_emojis,
          favoris: [...current, emoji],
        },
      });
    }
  };

  const voiceProfileForTest = {
    name: profile.nom,
    tone: tonOptions.find(t => t.id === profile.ton_dominant)?.label || 'Décontracté',
    tutoiement: tutoiementOptions.find(t => t.id === profile.tutoiement)?.label || 'Toujours',
    emojis: profile.utilisation_emojis?.favoris || [],
    isActive: profile.isActive,
  };

  // Gérer la completion de l'onboarding
  const handleOnboardingComplete = (data, voiceProfile, redirectTo) => {
    if (voiceProfile) {
      setProfile({
        ...profile,
        nom: voiceProfile.nom || `MA VOIX — ${data.prenom}`,
        ton_dominant: voiceProfile.ton_dominant || data.ton?.[0] || 'decontracte',
        tons_secondaires: voiceProfile.tons_secondaires || data.ton?.slice(1) || [],
        tutoiement: data.tutoiement || 'parfois',
        utilisation_emojis: voiceProfile.utilisation_emojis || {
          frequence: data.utilisation_emojis || 'parfois',
          favoris: data.emojis_favoris || [],
        },
        expressions_cles: voiceProfile.expressions_cles || (data.expressions ? data.expressions.split(',').map(e => e.trim()) : []),
        contexte_business: {
          activite: data.activite,
          cible: data.cible_description,
          proposition_valeur: data.resultat_promis,
          differentiation: data.differentiation || '',
          lead_magnet: data.lead_magnet || '',
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setShowOnboarding(false);

    // Naviguer vers la page demandée
    if (redirectTo === 'search') {
      navigate('/search');
    } else if (redirectTo === 'dashboard') {
      navigate('/');
    }
  };

  // Si l'onboarding est affiché, le retourner
  if (showOnboarding) {
    return (
      <OnboardingProfond
        onComplete={handleOnboardingComplete}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <>
        <Header
          title="MA VOIX"
          subtitle="Chargement de ton profil stylistique..."
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
            <p className="text-warm-600">Chargement de ton profil...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="MA VOIX"
        subtitle="Ton profil stylistique pour des messages authentiques"
        action={
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                <Check className="w-4 h-4" />
                Sauvegardé
              </span>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:text-warm-800 font-medium transition-colors"
                >
                  <X className="w-5 h-5" />
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Sauvegarder
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowConfigureModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-xl transition-colors border-2 border-purple-200"
                >
                  <MessageSquare className="w-5 h-5" />
                  Analyser mes textes
                </button>
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25"
                >
                  <Settings className="w-5 h-5" />
                  Reconfigurer ma voix
                </button>
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-warm-200 hover:border-warm-300 text-warm-700 font-semibold rounded-xl transition-colors"
                >
                  <Edit3 className="w-5 h-5" />
                  Modifier
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-8">
        {/* Status card */}
        <div className="card p-6 bg-gradient-to-r from-brand-50 to-accent-50 border-brand-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-warm-900">{profile.nom}</h2>
                <p className="text-warm-600">{profile.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-green-600">Profil actif</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ton & Style */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-brand-500" />
                  Ton & Style
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Ton dominant */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Ton dominant
                  </label>
                  {isEditing ? (
                    <div className="grid grid-cols-3 gap-2">
                      {tonOptions.map(ton => (
                        <button
                          key={ton.id}
                          onClick={() => setEditedProfile({ ...editedProfile, ton_dominant: ton.id })}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            editedProfile.ton_dominant === ton.id
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-warm-200 hover:border-warm-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{ton.emoji}</span>
                            <span className="font-medium text-warm-900">{ton.label}</span>
                          </div>
                          <p className="text-xs text-warm-500">{ton.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {tonOptions.find(t => t.id === profile.ton_dominant)?.emoji}
                      </span>
                      <div>
                        <p className="font-semibold text-warm-900">
                          {tonOptions.find(t => t.id === profile.ton_dominant)?.label}
                        </p>
                        <p className="text-sm text-warm-500">
                          {tonOptions.find(t => t.id === profile.ton_dominant)?.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tons secondaires */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Tons secondaires <span className="text-warm-400">(max 3)</span>
                  </label>
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2">
                      {tonOptions.filter(t => t.id !== editedProfile.ton_dominant).map(ton => (
                        <button
                          key={ton.id}
                          onClick={() => toggleTonSecondaire(ton.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                            editedProfile.tons_secondaires?.includes(ton.id)
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-warm-200 hover:border-warm-300 text-warm-600'
                          }`}
                        >
                          <span>{ton.emoji}</span>
                          <span className="text-sm font-medium">{ton.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.tons_secondaires?.map(tonId => {
                        const ton = tonOptions.find(t => t.id === tonId);
                        return ton ? (
                          <span
                            key={tonId}
                            className="flex items-center gap-2 px-3 py-2 bg-warm-100 rounded-lg text-warm-700"
                          >
                            <span>{ton.emoji}</span>
                            <span className="text-sm font-medium">{ton.label}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                {/* Niveau d'énergie */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Niveau d'énergie
                  </label>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={editedProfile.niveau_energie}
                        onChange={(e) => setEditedProfile({ ...editedProfile, niveau_energie: parseInt(e.target.value) })}
                        className="w-full h-2 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                      />
                      <div className="flex justify-between text-xs text-warm-400">
                        <span>Calme</span>
                        <span className="font-semibold text-brand-600">{editedProfile.niveau_energie}/10</span>
                        <span>Énergique</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-400 to-accent-500 rounded-full transition-all"
                          style={{ width: `${profile.niveau_energie * 10}%` }}
                        />
                      </div>
                      <span className="font-bold text-warm-900">{profile.niveau_energie}/10</span>
                    </div>
                  )}
                </div>

                {/* Tutoiement */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Tutoiement
                  </label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      {tutoiementOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => setEditedProfile({ ...editedProfile, tutoiement: option.id })}
                          className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                            editedProfile.tutoiement === option.id
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-warm-200 hover:border-warm-300'
                          }`}
                        >
                          <p className="font-medium text-warm-900">{option.label}</p>
                          <p className="text-xs text-warm-500">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-warm-900 font-medium">
                      {tutoiementOptions.find(t => t.id === profile.tutoiement)?.label} — {' '}
                      <span className="text-warm-500 font-normal">
                        {tutoiementOptions.find(t => t.id === profile.tutoiement)?.description}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Emojis */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-500" />
                  Emojis
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Fréquence */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Fréquence d'utilisation
                  </label>
                  {isEditing ? (
                    <div className="grid grid-cols-4 gap-2">
                      {emojiFrequencyOptions.map(option => (
                        <button
                          key={option.id}
                          onClick={() => setEditedProfile({
                            ...editedProfile,
                            utilisation_emojis: { ...editedProfile.utilisation_emojis, frequence: option.id }
                          })}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            editedProfile.utilisation_emojis?.frequence === option.id
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-warm-200 hover:border-warm-300'
                          }`}
                        >
                          <p className="font-medium text-warm-900">{option.label}</p>
                          <p className="text-xs text-warm-500">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-warm-900 font-medium">
                      {emojiFrequencyOptions.find(f => f.id === profile.utilisation_emojis?.frequence)?.label}
                    </p>
                  )}
                </div>

                {/* Emojis favoris */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Emojis favoris <span className="text-warm-400">(max 6)</span>
                  </label>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 p-4 bg-warm-50 rounded-xl min-h-[60px]">
                        {editedProfile.utilisation_emojis?.favoris?.map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleEmoji(emoji)}
                            className="w-10 h-10 flex items-center justify-center text-xl bg-white rounded-lg border-2 border-brand-500 hover:bg-red-50 hover:border-red-300 transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                        {(!editedProfile.utilisation_emojis?.favoris?.length) && (
                          <span className="text-warm-400 text-sm">Sélectionne tes emojis ci-dessous</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {popularEmojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleEmoji(emoji)}
                            disabled={editedProfile.utilisation_emojis?.favoris?.includes(emoji)}
                            className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg border-2 transition-colors ${
                              editedProfile.utilisation_emojis?.favoris?.includes(emoji)
                                ? 'border-brand-500 bg-brand-50 opacity-50'
                                : 'border-warm-200 hover:border-warm-300 hover:bg-warm-50'
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      {profile.utilisation_emojis?.favoris?.map((emoji, idx) => (
                        <span
                          key={idx}
                          className="w-12 h-12 flex items-center justify-center text-2xl bg-warm-100 rounded-xl"
                        >
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expressions & Vocabulaire */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-500" />
                  Expressions & Vocabulaire
                </h3>
              </div>
              <div className="p-6 space-y-6">
                {/* Expressions clés */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Expressions clés
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.expressions_cles?.join(', ') || ''}
                      onChange={(e) => setEditedProfile({
                        ...editedProfile,
                        expressions_cles: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Trop bien !, J'adore, Carrément..."
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.expressions_cles?.map((expr, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium"
                        >
                          "{expr}"
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mots signature */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3">
                    Mots signature
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.mots_signature?.join(', ') || ''}
                      onChange={(e) => setEditedProfile({
                        ...editedProfile,
                        mots_signature: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="canon, top, génial..."
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.mots_signature?.map((mot, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-warm-100 text-warm-700 rounded-lg text-sm font-medium"
                        >
                          {mot}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* À éviter */}
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    À éviter
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedProfile.a_eviter?.join(', ') || ''}
                      onChange={(e) => setEditedProfile({
                        ...editedProfile,
                        a_eviter: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      })}
                      placeholder="Formules trop corporate, Vouvoiement..."
                      rows={2}
                      className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {profile.a_eviter?.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar droite */}
          <div className="space-y-6">
            {/* Exemples de messages */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Exemples de messages
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {profile.exemples_messages?.map((message, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-warm-50 rounded-xl border border-warm-100"
                  >
                    <p className="text-sm text-warm-700 whitespace-pre-line">{message}</p>
                  </div>
                ))}
                <p className="text-xs text-warm-400 text-center">
                  Messages générés automatiquement selon ton profil
                </p>
              </div>
            </div>

            {/* Contexte business */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Contexte business
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-warm-400 uppercase tracking-wider mb-1">Activité</p>
                  <p className="text-sm text-warm-700">{profile.contexte_business?.activite}</p>
                </div>
                <div>
                  <p className="text-xs text-warm-400 uppercase tracking-wider mb-1">Cible</p>
                  <p className="text-sm text-warm-700">{profile.contexte_business?.cible}</p>
                </div>
                <div>
                  <p className="text-xs text-warm-400 uppercase tracking-wider mb-1">Proposition de valeur</p>
                  <p className="text-sm text-warm-700">{profile.contexte_business?.proposition_valeur}</p>
                </div>
                {profile.contexte_business?.lead_magnet && (
                  <div>
                    <p className="text-xs text-warm-400 uppercase tracking-wider mb-1">Lead magnet</p>
                    <p className="text-sm text-warm-700">{profile.contexte_business?.lead_magnet}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Paramètres avancés */}
            <div className="card">
              <div className="px-6 py-4 border-b border-warm-100">
                <h3 className="font-display font-semibold text-warm-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-warm-500" />
                  Paramètres avancés
                </h3>
              </div>
              <div className="p-6 space-y-5">
                {/* Toggle: Reproduire mes imperfections */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <PenTool className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-warm-900 text-sm">Reproduire mes imperfections</span>
                    </div>
                    <p className="text-xs text-warm-500">
                      Reproduit tes abréviations et ta ponctuation relâchée
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newSettings = {
                        ...profile.settings,
                        reproduire_imperfections: !profile.settings?.reproduire_imperfections,
                      };
                      setProfile({ ...profile, settings: newSettings });
                      if (isEditing) {
                        setEditedProfile({ ...editedProfile, settings: newSettings });
                      }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      profile.settings?.reproduire_imperfections
                        ? 'bg-brand-500'
                        : 'bg-warm-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        profile.settings?.reproduire_imperfections
                          ? 'translate-x-6'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Toggle: Utiliser les emojis */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Smile className="w-4 h-4 text-amber-500" />
                      <span className="font-medium text-warm-900 text-sm">Utiliser les emojis</span>
                    </div>
                    <p className="text-xs text-warm-500">
                      Active ou désactive les emojis dans tes messages
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const newSettings = {
                        ...profile.settings,
                        utiliser_emojis: !profile.settings?.utiliser_emojis,
                      };
                      setProfile({ ...profile, settings: newSettings });
                      if (isEditing) {
                        setEditedProfile({ ...editedProfile, settings: newSettings });
                      }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      profile.settings?.utiliser_emojis
                        ? 'bg-brand-500'
                        : 'bg-warm-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        profile.settings?.utiliser_emojis
                          ? 'translate-x-6'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Slider: Niveau d'énergie */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="font-medium text-warm-900 text-sm">Niveau d'énergie</span>
                    </div>
                    <span className="text-sm font-semibold text-brand-600">
                      {profile.settings?.niveau_energie_override ?? profile.niveau_energie}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={profile.settings?.niveau_energie_override ?? profile.niveau_energie}
                    onChange={(e) => {
                      const newValue = parseInt(e.target.value);
                      const newSettings = {
                        ...profile.settings,
                        niveau_energie_override: newValue,
                      };
                      setProfile({ ...profile, settings: newSettings });
                      if (isEditing) {
                        setEditedProfile({ ...editedProfile, settings: newSettings });
                      }
                    }}
                    className="w-full h-2 bg-warm-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-warm-400 mt-1">
                    <span>Calme</span>
                    <span>Énergique</span>
                  </div>
                </div>

                {/* Bouton réinitialiser */}
                <button
                  onClick={() => {
                    const resetSettings = {
                      reproduire_imperfections: true,
                      utiliser_emojis: true,
                      niveau_energie_override: null,
                    };
                    setProfile({ ...profile, settings: resetSettings });
                    if (isEditing) {
                      setEditedProfile({ ...editedProfile, settings: resetSettings });
                    }
                  }}
                  className="w-full text-xs text-warm-400 hover:text-warm-600 transition-colors pt-2 border-t border-warm-100"
                >
                  Réinitialiser aux valeurs détectées
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="card p-6 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-warm-900 mb-1">Astuce</h4>
                  <p className="text-sm text-warm-600">
                    Plus ton profil est détaillé, plus les messages générés seront authentiques et personnalisés !
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton tester ma voix */}
            <button
              onClick={() => setShowTestModal(true)}
              className="w-full flex items-center justify-center gap-2 p-4 bg-gradient-to-r from-brand-50 to-accent-50 hover:from-brand-100 hover:to-accent-100 text-brand-700 font-medium rounded-xl transition-colors border-2 border-brand-200"
            >
              <FlaskConical className="w-5 h-5" />
              Tester ma voix
            </button>
          </div>
        </div>
      </div>

      {/* Modal de test */}
      <TestVoiceModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        voiceProfile={voiceProfileForTest}
      />

      {/* Modal pour analyser les textes */}
      <ConfigureVoiceModal
        isOpen={showConfigureModal}
        onClose={() => setShowConfigureModal(false)}
        onComplete={(newProfile) => {
          if (newProfile) {
            setProfile({
              ...profile,
              ...newProfile,
              nom: newProfile.nom || profile.nom,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          }
        }}
      />
    </>
  );
}
