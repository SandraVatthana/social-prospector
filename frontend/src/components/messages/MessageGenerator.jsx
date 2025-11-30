import { useState, useEffect } from 'react';
import {
  Send,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ChevronDown,
  AlertCircle,
  Shuffle,
} from 'lucide-react';
import ApproachMethodSelector, { APPROACH_METHODS } from './ApproachMethodSelector';
import SendMessageButton from './SendMessageButton';
import { api } from '../../lib/api';

/**
 * Modal/Composant de génération de message pour un prospect
 */
export default function MessageGenerator({
  prospect,
  voiceProfile,
  onMessageGenerated,
  onClose,
  isModal = true,
}) {
  const [selectedMethod, setSelectedMethod] = useState('mini_aida');
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [methodStats, setMethodStats] = useState({});
  const [showMethodSelector, setShowMethodSelector] = useState(true);

  // Charger les stats et recommandation au montage
  useEffect(() => {
    loadRecommendation();
  }, []);

  const loadRecommendation = async () => {
    try {
      const response = await api.getApproachRecommendation();
      if (response.data) {
        setRecommendation(response.data.recommendation);
        setMethodStats(response.data.stats || {});
        if (response.data.recommendation?.method) {
          setSelectedMethod(response.data.recommendation.method);
        }
      }
    } catch (err) {
      // Pas grave si ça échoue, on utilise mini_aida par défaut
      console.log('Could not load recommendation:', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.generateMessage(prospect.id, selectedMethod);

      if (response.data) {
        setGeneratedMessage(response.data);
        setShowMethodSelector(false);

        if (onMessageGenerated) {
          onMessageGenerated(response.data);
        }
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await handleGenerate();
  };

  const handleTryOtherMethod = async () => {
    // Choisir une méthode différente aléatoirement
    const methods = Object.keys(APPROACH_METHODS).filter(m => m !== selectedMethod);
    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    setSelectedMethod(randomMethod);

    // Puis générer
    setIsGenerating(true);
    setError(null);

    try {
      const response = await api.generateMessage(prospect.id, randomMethod);
      if (response.data) {
        setGeneratedMessage(response.data);
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedMessage?.message) return;

    try {
      await navigator.clipboard.writeText(generatedMessage.message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyAndOpen = async () => {
    await handleCopy();

    // Ouvrir Instagram/TikTok
    const platform = prospect.platform || 'instagram';
    const username = prospect.username;

    if (platform === 'instagram') {
      window.open(`https://instagram.com/${username}`, '_blank');
    } else if (platform === 'tiktok') {
      window.open(`https://tiktok.com/@${username}`, '_blank');
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header avec info prospect */}
      <div className="flex items-center gap-4 pb-4 border-b border-warm-100">
        <img
          src={prospect.profile_pic_url || `https://ui-avatars.com/api/?name=${prospect.username}&background=6366f1&color=fff`}
          alt={prospect.username}
          className="w-14 h-14 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="font-semibold text-warm-900 flex items-center gap-2">
            @{prospect.username}
            <span className="text-xs px-2 py-0.5 bg-warm-100 text-warm-600 rounded-full">
              {prospect.platform || 'Instagram'}
            </span>
          </h3>
          <p className="text-sm text-warm-500 line-clamp-2">
            {prospect.bio || 'Aucune bio disponible'}
          </p>
        </div>
      </div>

      {/* Sélecteur de méthode */}
      {showMethodSelector && !generatedMessage && (
        <ApproachMethodSelector
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          recommendation={recommendation}
          stats={methodStats}
          compact={false}
        />
      )}

      {/* Zone de message généré */}
      {generatedMessage && (
        <div className="space-y-4">
          {/* Badge méthode utilisée */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-warm-500">Méthode utilisée :</span>
              <span className="text-sm font-medium text-warm-700 flex items-center gap-1">
                {APPROACH_METHODS[generatedMessage.approach_method]?.name || 'Mini-AIDA'}
              </span>
            </div>
            <button
              onClick={() => setShowMethodSelector(!showMethodSelector)}
              className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Changer de méthode
              <ChevronDown className={`w-3 h-3 transition-transform ${showMethodSelector ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Sélecteur compact si affiché */}
          {showMethodSelector && (
            <ApproachMethodSelector
              selectedMethod={selectedMethod}
              onSelect={setSelectedMethod}
              recommendation={recommendation}
              stats={methodStats}
              compact={true}
            />
          )}

          {/* Message */}
          <div className="relative">
            <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-xl p-5 border border-brand-100">
              <p className="text-warm-800 whitespace-pre-wrap leading-relaxed">
                {generatedMessage.message}
              </p>
            </div>

            {/* Hook type badge */}
            {generatedMessage.hook_type && (
              <div className="absolute -top-2 left-4 px-2 py-0.5 bg-white border border-warm-200 rounded-full text-xs text-warm-500">
                {generatedMessage.hook_type.replace('_', ' ')}
              </div>
            )}
          </div>

          {/* Actions - Nouveau bouton SendMessageButton */}
          <SendMessageButton
            message={{
              id: generatedMessage.id || `temp-${Date.now()}`,
              content: generatedMessage.message,
              status: 'draft',
            }}
            prospect={prospect}
            onSent={() => {
              // Callback optionnel après envoi
            }}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={handleTryOtherMethod}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-warm-200 hover:border-warm-300 text-warm-700 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Shuffle className="w-4 h-4" />
              Autre méthode
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-warm-200 hover:border-warm-300 text-warm-700 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Régénérer
            </button>
          </div>
        </div>
      )}

      {/* Bouton générer (avant génération) */}
      {!generatedMessage && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Générer le message
            </>
          )}
        </button>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Info MA VOIX */}
      {!voiceProfile && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Profil MA VOIX non configuré</p>
            <p className="text-amber-600">
              Configure ton profil MA VOIX pour des messages qui sonnent vraiment comme toi !
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // Si mode modal
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-warm-100 px-6 py-4 flex items-center justify-between">
            <h2 className="font-display font-semibold text-warm-900 flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-500" />
              Générer un message
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Mode inline
  return content;
}
