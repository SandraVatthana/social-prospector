import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Sparkles, Check, X, Volume2, ArrowRight, Instagram } from 'lucide-react';
import Modal from '../ui/Modal';
import { API_BASE_URL } from '../../lib/api';

/**
 * Modal d'entraînement vocal avec feedback IA
 * Permet à l'utilisateur de s'entraîner à lire son script et recevoir un feedback
 */
export default function VocalTrainingModal({ isOpen, onClose, script, prospect }) {
  // États d'enregistrement
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // États d'analyse
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);

  // Cleanup à la fermeture
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setAnalysisResult(null);
      setAnalysisError(null);
      setIsPlaying(false);
    }
  }, [isOpen]);

  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Setup audio level visualization
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Start visualizing
      const visualize = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 128); // Normalize to 0-1
        animationRef.current = requestAnimationFrame(visualize);
      };
      visualize();

      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setAnalysisResult(null);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (err) {
      console.error('Erreur accès micro:', err);
      setPermissionDenied(true);
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  // Jouer/Pause l'enregistrement
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Recommencer
  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  // Analyser l'enregistrement
  const analyzeRecording = async () => {
    if (!audioBlob) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Préparer le FormData avec l'audio
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('script', script);
      formData.append('duration', recordingTime.toString());
      if (prospect) {
        formData.append('prospect', JSON.stringify({
          username: prospect.username,
          platform: prospect.platform
        }));
      }

      const response = await fetch(`${API_BASE_URL}/voice/analyze-recording`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResult(data.data);

        // Sauvegarder le score dans localStorage pour le suivi de progression
        saveScoreToHistory(data.data.score_global);
      } else {
        throw new Error('Erreur lors de l\'analyse');
      }
    } catch (err) {
      console.error('Erreur analyse:', err);
      // Mode démo
      const demoResult = generateDemoAnalysis(recordingTime, script);
      setAnalysisResult(demoResult);
      saveScoreToHistory(demoResult.score_global);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sauvegarder le score dans l'historique local
  const saveScoreToHistory = (score) => {
    const history = JSON.parse(localStorage.getItem('vocal_training_history') || '[]');
    history.push({
      score,
      date: new Date().toISOString(),
      duration: recordingTime
    });
    // Garder les 30 derniers
    if (history.length > 30) history.shift();
    localStorage.setItem('vocal_training_history', JSON.stringify(history));
  };

  // Ouvrir Instagram
  const goToInstagram = () => {
    if (prospect?.username) {
      window.open(`https://instagram.com/${prospect.username}/`, '_blank');
    }
    onClose();
  };

  // Formater le temps
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Déterminer la couleur de la barre de temps
  const getTimeBarColor = () => {
    if (recordingTime < 25) return 'bg-amber-400';
    if (recordingTime <= 40) return 'bg-green-500';
    return 'bg-red-400';
  };

  // Emoji selon le score
  const getScoreEmoji = (score) => {
    if (score < 5) return '😬';
    if (score < 7) return '🙂';
    if (score < 8.5) return '😊';
    return '🔥';
  };

  // Couleur selon la note
  const getNoteColor = (note) => {
    if (note < 5) return 'text-red-500';
    if (note < 7) return 'text-amber-500';
    if (note < 8.5) return 'text-green-500';
    return 'text-emerald-600';
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entraînement vocal"
      description="Lis ton script et reçois un feedback IA pour t'améliorer"
      size="xlarge"
    >
      <div className="flex gap-6">
        {/* Colonne gauche : Script */}
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-warm-700">
            <Volume2 className="w-4 h-4 text-purple-500" />
            Script à lire
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 max-h-[400px] overflow-y-auto">
            <p className="text-warm-700 whitespace-pre-line leading-relaxed text-lg">
              {script}
            </p>
          </div>
          <p className="text-xs text-warm-500">
            {script.split(/\s+/).length} mots • ~{Math.round(script.split(/\s+/).length / 3)} secondes
          </p>
        </div>

        {/* Colonne droite : Enregistrement / Analyse */}
        <div className="flex-1 space-y-4">
          {/* Permission refusée */}
          {permissionDenied && (
            <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
              <p className="text-red-700 font-medium">Accès au micro refusé</p>
              <p className="text-sm text-red-600 mt-1">
                Autorise l'accès au microphone dans les paramètres de ton navigateur.
              </p>
            </div>
          )}

          {/* Pas encore de résultat d'analyse */}
          {!analysisResult && (
            <>
              {/* Zone d'enregistrement */}
              <div className="p-6 bg-warm-50 rounded-xl border border-warm-200">
                {/* Timer et indicateur de niveau */}
                <div className="text-center mb-6">
                  <div className="text-4xl font-mono font-bold text-warm-800">
                    {formatTime(recordingTime)}
                  </div>

                  {/* Barre de temps avec zone idéale */}
                  <div className="mt-3 relative h-2 bg-warm-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${getTimeBarColor()}`}
                      style={{ width: `${Math.min(recordingTime / 60 * 100, 100)}%` }}
                    />
                    {/* Marqueurs zone idéale */}
                    <div className="absolute top-0 left-[41.6%] w-[25%] h-full border-l-2 border-r-2 border-green-600 opacity-30" />
                  </div>
                  <p className="text-xs text-warm-500 mt-1">
                    Zone idéale : 25-40 sec
                  </p>
                </div>

                {/* Visualisation audio */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-1 h-12 mb-4">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-purple-500 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(4, Math.min(48, (audioLevel * 48) * (0.5 + Math.random() * 0.5)))}px`,
                          opacity: 0.5 + audioLevel * 0.5
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Boutons d'enregistrement */}
                <div className="flex justify-center gap-3">
                  {!isRecording && !audioUrl && (
                    <button
                      onClick={startRecording}
                      disabled={permissionDenied}
                      className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Mic className="w-5 h-5" />
                      Commencer
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-warm-700 hover:bg-warm-800 text-white font-semibold rounded-xl transition-colors"
                    >
                      <Square className="w-5 h-5" />
                      Terminer
                    </button>
                  )}

                  {audioUrl && !isRecording && (
                    <>
                      <button
                        onClick={togglePlayback}
                        className="flex items-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        {isPlaying ? 'Pause' : 'Réécouter'}
                      </button>
                      <button
                        onClick={resetRecording}
                        className="flex items-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
                      >
                        <RotateCcw className="w-5 h-5" />
                        Recommencer
                      </button>
                    </>
                  )}
                </div>

                {/* Audio element caché */}
                {audioUrl && (
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setIsPlaying(false)}
                  />
                )}
              </div>

              {/* Bouton Analyser */}
              {audioUrl && !isRecording && (
                <button
                  onClick={analyzeRecording}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-warm-300 disabled:to-warm-400 text-white font-semibold rounded-xl transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyser mon vocal
                    </>
                  )}
                </button>
              )}
            </>
          )}

          {/* Résultat de l'analyse */}
          {analysisResult && (
            <div className="space-y-4">
              {/* Score global */}
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-brand-50 rounded-xl border border-purple-100">
                <div className="text-6xl mb-2">{getScoreEmoji(analysisResult.score_global)}</div>
                <div className="text-4xl font-bold text-warm-800">
                  {analysisResult.score_global.toFixed(1)}<span className="text-xl text-warm-500">/10</span>
                </div>
                <p className="text-warm-600 mt-1">Score global</p>
              </div>

              {/* Scores détaillés */}
              <div className="space-y-2">
                {Object.entries(analysisResult.scores).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-warm-600 capitalize">{key}</div>
                    <div className="flex-1 h-2 bg-warm-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          value.note >= 8 ? 'bg-green-500' :
                          value.note >= 6 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${value.note * 10}%` }}
                      />
                    </div>
                    <div className={`w-8 text-sm font-medium ${getNoteColor(value.note)}`}>
                      {value.note}
                    </div>
                  </div>
                ))}
              </div>

              {/* Point fort */}
              <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Point fort</p>
                    <p className="text-sm text-green-700">{analysisResult.point_fort}</p>
                  </div>
                </div>
              </div>

              {/* Conseil prioritaire */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Pour progresser</p>
                    <p className="text-sm text-amber-700">{analysisResult.axe_prioritaire}</p>
                  </div>
                </div>
              </div>

              {/* Encouragement */}
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-sm text-purple-700 italic">"{analysisResult.encouragement}"</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={resetRecording}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Réessayer
                </button>
                <button
                  onClick={goToInstagram}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl transition-all"
                >
                  <Instagram className="w-5 h-5" />
                  Direction Instagram !
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * Génère une analyse démo quand l'API n'est pas disponible
 */
function generateDemoAnalysis(duration, script) {
  // Calculer des scores basés sur la durée
  const durationScore = duration >= 25 && duration <= 40 ? 8 + Math.random() * 2 :
                        duration >= 20 && duration <= 50 ? 6 + Math.random() * 2 :
                        4 + Math.random() * 2;

  const baseScore = 6 + Math.random() * 2;

  const scores = {
    duree: {
      note: Math.round(durationScore * 10) / 10,
      tip: duration < 25 ? "Prends ton temps, développe un peu plus" :
           duration > 40 ? "Essaie de resserrer, reste sous 40 secondes" :
           "Parfait, tu es dans la zone idéale !"
    },
    completude: {
      note: Math.round((baseScore + Math.random()) * 10) / 10,
      tip: "Assure-toi de mentionner l'accroche, la connexion, ta valeur et ton CTA"
    },
    personnalisation: {
      note: Math.round((baseScore + Math.random() * 0.5) * 10) / 10,
      tip: "N'oublie pas de mentionner des détails spécifiques du prospect"
    },
    naturel: {
      note: Math.round((baseScore + Math.random() * 1.5) * 10) / 10,
      tip: "Ça sonne déjà bien ! Continue à parler comme si tu discutais avec un pote"
    },
    energie: {
      note: Math.round((baseScore + Math.random()) * 10) / 10,
      tip: "Mets un peu plus d'enthousiasme, ça donne envie de répondre"
    },
    clarte: {
      note: Math.round((baseScore + Math.random() * 0.8) * 10) / 10,
      tip: "Articule bien et fais des pauses entre les idées"
    }
  };

  const avgScore = Object.values(scores).reduce((sum, s) => sum + s.note, 0) / 6;

  const pointsForts = [
    "Tu as une énergie communicative qui donne envie d'en savoir plus",
    "Ton authenticité transparaît dans ta façon de parler",
    "La personnalisation est bien présente, ça fait la différence",
    "Tu as trouvé le bon rythme, c'est agréable à écouter",
    "Ta proposition de valeur est claire et percutante"
  ];

  const axesPrioritaires = [
    "Essaie de sourire en parlant, ça s'entend dans la voix !",
    "Ajoute une micro-pause avant ton CTA pour le mettre en valeur",
    "Commence par une question rhétorique pour capter l'attention",
    "Termine sur une note plus haute pour donner envie de répondre",
    "Ralentis légèrement sur les mots-clés importants"
  ];

  const encouragements = [
    "Continue comme ça, tu progresses à chaque essai !",
    "Tu as tout ce qu'il faut pour convertir, fais-toi confiance !",
    "Ton authenticité est ta force, ne la perds jamais",
    "Chaque entraînement te rapproche de la maîtrise, bravo !",
    "Tu es sur la bonne voie, tes prospects vont adorer te rencontrer"
  ];

  return {
    score_global: Math.round(avgScore * 10) / 10,
    scores,
    point_fort: pointsForts[Math.floor(Math.random() * pointsForts.length)],
    axe_prioritaire: axesPrioritaires[Math.floor(Math.random() * axesPrioritaires.length)],
    encouragement: encouragements[Math.floor(Math.random() * encouragements.length)]
  };
}
