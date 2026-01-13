import { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Mic2,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Zap,
  Volume2,
  MessageSquare,
  Save,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { api } from '../../lib/api';

const MIN_CHARS = 50;
const MAX_CHARS = 5000;
const MIN_TEXTS = 2;
const MAX_TEXTS = 10;

/**
 * Modal pour configurer MA VOIX à partir de textes de l'utilisateur
 */
export default function ConfigureVoiceModal({ isOpen, onClose, onComplete }) {
  const [texts, setTexts] = useState([]);
  const [currentText, setCurrentText] = useState('');
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Charger les textes sauvegardés à l'ouverture
  useEffect(() => {
    if (isOpen) {
      loadSavedTexts();
    }
  }, [isOpen]);

  const loadSavedTexts = async () => {
    setIsLoading(true);
    try {
      const response = await api.getTrainingTexts();
      if (response.data?.texts && response.data.texts.length > 0) {
        setTexts(response.data.texts.map((t, i) => ({
          id: Date.now() + i,
          content: t.content || t,
          chars: (t.content || t).length,
        })));
      }
    } catch (err) {
      console.error('Error loading training texts:', err);
      // Silently fail, user can still add texts
    } finally {
      setIsLoading(false);
    }
  };

  const saveTextsToServer = async (textsToSave) => {
    setIsSaving(true);
    try {
      await api.saveTrainingTexts(textsToSave.map(t => ({ content: t.content, chars: t.chars })));
    } catch (err) {
      console.error('Error saving training texts:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const charCount = currentText.length;
  const isTextValid = charCount >= MIN_CHARS && charCount <= MAX_CHARS;
  const canAnalyze = texts.length >= MIN_TEXTS;
  const canAddMore = texts.length < MAX_TEXTS;

  const handleAddText = async () => {
    if (!isTextValid) {
      if (charCount < MIN_CHARS) {
        setError(`Minimum ${MIN_CHARS} caractères requis (${charCount}/${MIN_CHARS})`);
      } else {
        setError(`Maximum ${MAX_CHARS} caractères (${charCount}/${MAX_CHARS})`);
      }
      return;
    }

    if (!canAddMore) {
      setError(`Maximum ${MAX_TEXTS} textes atteint`);
      return;
    }

    const newTexts = [...texts, { id: Date.now(), content: currentText, chars: charCount }];
    setTexts(newTexts);
    setCurrentText('');
    setError('');

    // Sauvegarder automatiquement
    await saveTextsToServer(newTexts);
  };

  const handleRemoveText = async (id) => {
    const newTexts = texts.filter(t => t.id !== id);
    setTexts(newTexts);

    // Sauvegarder automatiquement
    await saveTextsToServer(newTexts);
  };

  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const response = await api.analyzeVoice(texts.map(t => t.content));
      setAnalysisResult(response.data);
    } catch (err) {
      console.error('Error analyzing voice:', err);
      // En mode démo, générer un résultat fictif
      const demoResult = generateDemoAnalysis(texts);
      setAnalysisResult(demoResult);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFeedback = async (isPositive) => {
    setFeedbackGiven(isPositive);

    if (isPositive && analysisResult) {
      // Sauvegarder le profil
      try {
        await api.createVoiceProfile(analysisResult.profile);
      } catch (err) {
        console.error('Error saving profile:', err);
      }

      // Notifier le parent et fermer
      setTimeout(() => {
        onComplete?.(analysisResult.profile);
        handleClose();
      }, 1500);
    }
  };

  const handleClose = () => {
    // Ne PAS effacer texts car ils sont sauvegardés
    setCurrentText('');
    setError('');
    setAnalysisResult(null);
    setFeedbackGiven(null);
    setIsAnalyzing(false);
    onClose();
  };

  const handleRetry = () => {
    setAnalysisResult(null);
    setFeedbackGiven(null);
  };

  // Vue résultat d'analyse
  if (analysisResult) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Analyse terminée"
        description="Voici ton profil stylistique détecté"
        size="large"
      >
        <div className="space-y-6">
          {/* Score de fidélité */}
          <div className="text-center py-6 bg-gradient-to-br from-brand-50 to-accent-50 rounded-2xl">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-warm-200"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${analysisResult.fidelityScore * 3.52} 352`}
                  strokeLinecap="round"
                  className="text-brand-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-4xl font-bold text-warm-900">
                  {analysisResult.fidelityScore}%
                </span>
                <span className="text-xs text-warm-500">fidélité</span>
              </div>
            </div>
            <p className="mt-4 text-warm-600">
              {analysisResult.fidelityScore >= 85
                ? "Excellent ! Ton style est bien défini"
                : analysisResult.fidelityScore >= 70
                ? "Bon profil ! Quelques ajustements possibles"
                : "Profil détecté. Ajoute plus de textes pour plus de précision"}
            </p>
          </div>

          {/* Traits détectés */}
          <div className="grid grid-cols-2 gap-4">
            {/* Ton */}
            <div className="p-4 bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2 text-warm-700 font-medium mb-2">
                <Volume2 className="w-4 h-4 text-brand-500" />
                Ton détecté
              </div>
              <p className="text-lg font-semibold text-warm-900 capitalize">
                {analysisResult.profile.ton_dominant}
              </p>
              {analysisResult.profile.tons_secondaires?.length > 0 && (
                <p className="text-sm text-warm-500 mt-1">
                  + {analysisResult.profile.tons_secondaires.join(', ')}
                </p>
              )}
            </div>

            {/* Énergie */}
            <div className="p-4 bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2 text-warm-700 font-medium mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Niveau d'énergie
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                    style={{ width: `${analysisResult.profile.niveau_energie * 10}%` }}
                  />
                </div>
                <span className="text-lg font-semibold text-warm-900">
                  {analysisResult.profile.niveau_energie}/10
                </span>
              </div>
            </div>

            {/* Tutoiement */}
            <div className="p-4 bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2 text-warm-700 font-medium mb-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                Tutoiement
              </div>
              <p className="text-lg font-semibold text-warm-900 capitalize">
                {analysisResult.profile.tutoiement}
              </p>
            </div>

            {/* Emojis */}
            <div className="p-4 bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2 text-warm-700 font-medium mb-2">
                <Sparkles className="w-4 h-4 text-accent-500" />
                Emojis favoris
              </div>
              <div className="flex gap-1">
                {analysisResult.profile.utilisation_emojis?.favoris?.length > 0 ? (
                  analysisResult.profile.utilisation_emojis.favoris.map((emoji, i) => (
                    <span key={i} className="text-xl">{emoji}</span>
                  ))
                ) : (
                  <span className="text-warm-500 text-sm">Peu d'emojis détectés</span>
                )}
              </div>
            </div>
          </div>

          {/* Expressions clés */}
          {analysisResult.profile.expressions_cles?.length > 0 && (
            <div className="p-4 bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2 text-warm-700 font-medium mb-3">
                <FileText className="w-4 h-4 text-green-500" />
                Expressions détectées
              </div>
              <div className="flex flex-wrap gap-2">
                {analysisResult.profile.expressions_cles.map((expr, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-white border border-warm-200 rounded-lg text-sm text-warm-700"
                  >
                    "{expr}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          <div className="p-4 bg-gradient-to-r from-brand-50 to-accent-50 rounded-xl border border-brand-100">
            <p className="text-center font-medium text-warm-900 mb-4">
              Ça te ressemble ?
            </p>

            {feedbackGiven === null ? (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                >
                  <ThumbsUp className="w-5 h-5" />
                  Oui, parfait !
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-2 px-6 py-3 bg-warm-200 hover:bg-warm-300 text-warm-700 font-semibold rounded-xl transition-colors"
                >
                  <ThumbsDown className="w-5 h-5" />
                  Pas vraiment
                </button>
              </div>
            ) : feedbackGiven ? (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl">
                  <Check className="w-5 h-5" />
                  Profil sauvegardé ! Redirection...
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-warm-600">
                  Pas de souci ! Tu peux ajouter plus de textes pour affiner l'analyse.
                </p>
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 text-brand-600 hover:text-brand-700 font-medium"
                >
                  ← Ajouter plus de textes
                </button>
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  // Vue principale - ajout de textes
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Configurer MA VOIX"
      description="Colle 2 à 10 textes que tu as écrits pour que l'IA apprenne ton style"
      size="large"
    >
      <div className="space-y-6">
        {/* Indicateur de chargement */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-warm-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement des textes sauvegardés...</span>
          </div>
        )}

        {/* Indicateur de sauvegarde */}
        {isSaving && (
          <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 border border-brand-100 rounded-lg text-sm text-brand-600">
            <Save className="w-4 h-4" />
            Sauvegarde en cours...
          </div>
        )}

        {/* Zone de saisie */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-warm-700">
              Colle un texte que tu as écrit
            </label>
            <span className={`text-xs ${
              charCount < MIN_CHARS ? 'text-warm-400' :
              charCount > MAX_CHARS ? 'text-red-500' :
              'text-green-600'
            }`}>
              {charCount}/{MAX_CHARS} caractères
            </span>
          </div>
          <textarea
            value={currentText}
            onChange={(e) => {
              setCurrentText(e.target.value);
              setError('');
            }}
            placeholder="Colle ici un message, un post, une bio, un email... tout ce qui reflète ta façon d'écrire !"
            rows={5}
            className="w-full px-4 py-3 border-2 border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors resize-none"
          />
          {charCount > 0 && charCount < MIN_CHARS && (
            <p className="text-xs text-warm-400 mt-1">
              Encore {MIN_CHARS - charCount} caractères minimum
            </p>
          )}
        </div>

        {/* Bouton ajouter */}
        <button
          onClick={handleAddText}
          disabled={!currentText.trim() || !canAddMore}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-warm-300 hover:border-brand-400 text-warm-600 hover:text-brand-600 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Ajouter ce texte
        </button>

        {/* Erreur */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Liste des textes ajoutés */}
        {texts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-warm-900">
                Textes ajoutés
              </h4>
              <span className={`text-sm font-medium ${
                texts.length >= MIN_TEXTS ? 'text-green-600' : 'text-warm-400'
              }`}>
                {texts.length}/{MAX_TEXTS} textes
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {texts.map((text, index) => (
                <div
                  key={text.id}
                  className="flex items-start gap-3 p-3 bg-warm-50 rounded-xl group"
                >
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="flex-1 text-sm text-warm-700 line-clamp-2">
                    {text.content}
                  </p>
                  <button
                    onClick={() => handleRemoveText(text.id)}
                    className="p-1.5 text-warm-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info minimum */}
        {texts.length > 0 && texts.length < MIN_TEXTS && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Ajoute encore {MIN_TEXTS - texts.length} texte{MIN_TEXTS - texts.length > 1 ? 's' : ''} pour lancer l'analyse
          </div>
        )}

        {/* Bouton analyser */}
        {canAnalyze && (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Mic2 className="w-5 h-5" />
                Analyser ma voix
              </>
            )}
          </button>
        )}

        {/* Tips */}
        <div className="p-4 bg-brand-50 rounded-xl">
          <h5 className="font-medium text-warm-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Conseils pour de meilleurs résultats
          </h5>
          <ul className="text-sm text-warm-600 space-y-1">
            <li>• Utilise des textes variés (posts, messages, emails...)</li>
            <li>• Choisis des textes qui reflètent vraiment ta façon d'écrire</li>
            <li>• Plus tu ajoutes de textes, plus l'analyse sera précise</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Génère une analyse de démo basée sur les textes fournis
 */
function generateDemoAnalysis(texts) {
  const allText = texts.map(t => t.content).join(' ');

  // Analyse basique du texte
  const hasEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(allText);
  const emojiMatches = allText.match(/[\u{1F300}-\u{1F9FF}]/gu) || [];
  const uniqueEmojis = [...new Set(emojiMatches)].slice(0, 4);

  const hasTutoiement = /\b(tu|ton|ta|tes|toi)\b/i.test(allText);
  const hasVouvoiement = /\b(vous|votre|vos)\b/i.test(allText);

  const exclamationCount = (allText.match(/!/g) || []).length;
  const questionCount = (allText.match(/\?/g) || []).length;

  // Détecter des expressions courantes
  const expressions = [];
  const expressionPatterns = [
    /j'adore/gi, /trop bien/gi, /carrément/gi, /génial/gi,
    /super/gi, /canon/gi, /top/gi, /parfait/gi,
    /on se capte/gi, /ça te dit/gi, /n'hésite pas/gi
  ];
  expressionPatterns.forEach(pattern => {
    if (pattern.test(allText)) {
      expressions.push(pattern.source.replace(/\\b|\\s/g, ' ').trim());
    }
  });

  // Calculer le score de fidélité
  let score = 65; // Base
  score += texts.length * 3; // Bonus par texte (max 30)
  if (hasEmojis) score += 5;
  if (expressions.length > 0) score += expressions.length * 2;
  if (hasTutoiement || hasVouvoiement) score += 5;
  score = Math.min(95, Math.max(60, score)); // Clamp entre 60 et 95

  // Déterminer le ton
  let tonDominant = 'decontracte';
  const tonsSecondaires = [];

  if (exclamationCount > texts.length * 2) {
    tonDominant = 'direct';
    tonsSecondaires.push('energique');
  }
  if (questionCount > texts.length) {
    tonsSecondaires.push('curieux');
  }
  if (/merci|s'il te plaît|svp/i.test(allText)) {
    tonsSecondaires.push('chaleureux');
  }

  // Niveau d'énergie basé sur la ponctuation
  const energyLevel = Math.min(10, Math.max(3,
    5 + Math.floor(exclamationCount / texts.length)
  ));

  return {
    fidelityScore: score,
    profile: {
      nom: 'MA VOIX',
      description: 'Profil généré à partir de tes textes',
      ton_dominant: tonDominant,
      tons_secondaires: tonsSecondaires.slice(0, 2),
      niveau_energie: energyLevel,
      tutoiement: hasTutoiement ? 'toujours' : hasVouvoiement ? 'jamais' : 'parfois',
      longueur_messages: allText.length / texts.length > 500 ? 'long' : 'court',
      utilisation_emojis: {
        frequence: hasEmojis ? (emojiMatches.length > texts.length * 2 ? 'souvent' : 'parfois') : 'rarement',
        favoris: uniqueEmojis.length > 0 ? uniqueEmojis : ['✨', '🚀'],
        position: 'fin',
      },
      expressions_cles: expressions.length > 0 ? expressions.slice(0, 5) : ['Super !', 'Top'],
      mots_signature: ['super', 'top', 'génial'],
      a_eviter: ['Formules trop corporate', 'Langage froid'],
      isActive: true,
    },
    textsAnalyzed: texts.length,
  };
}
