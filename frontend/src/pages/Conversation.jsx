/**
 * Page de conversation dédiée pour un prospect
 * Affiche la timeline des échanges et permet de gérer la séquence
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Instagram,
  Users,
  Heart,
  ExternalLink,
  Send,
  Sparkles,
  Copy,
  Check,
  Edit3,
  RefreshCw,
  MessageSquare,
  Phone,
  Link as LinkIcon,
  Target,
  Clock,
  ChevronRight,
  AlertCircle,
  Smile,
  Meh,
  Frown,
  HelpCircle,
  Zap,
  TrendingUp,
  X,
  CheckCircle,
  Loader2,
  MapPin,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { API_BASE_URL } from '../lib/api';

// Icône TikTok
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Configuration des objectifs
const GOALS = {
  call: { icon: Phone, label: 'Obtenir un appel', color: 'blue' },
  link: { icon: LinkIcon, label: 'Amener vers un lien', color: 'green' },
  qualify: { icon: MessageSquare, label: 'Qualifier', color: 'purple' },
  network: { icon: Users, label: 'Networking', color: 'amber' },
};

// Configuration des étapes par objectif
const STAGES = {
  call: ['Ouverture', 'Transition vers call', 'Relance'],
  link: ['Teaser', 'Partage du lien', 'Suivi'],
  qualify: ['Question qualification', 'Approfondissement', 'Proposition'],
  network: ['Connexion', 'Partage de valeur', 'Proposition call'],
};

// Configuration des sentiments
const SENTIMENTS = {
  positive: { icon: Smile, color: 'text-green-600', bg: 'bg-green-50', label: 'Positif' },
  neutral: { icon: Meh, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Neutre' },
  negative: { icon: Frown, color: 'text-red-600', bg: 'bg-red-50', label: 'Négatif' },
  hesitant: { icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Hésitant' },
};

// Mock data pour la démo
const MOCK_PROSPECT = {
  id: 1,
  username: 'emma_coaching',
  platform: 'instagram',
  fullName: 'Emma Martin',
  bio: 'Coach certifiée | Accompagnement personnalisé | #coaching #développement',
  followers: 15200,
  engagement: 4.2,
  avatar: 'https://i.pravatar.cc/150?img=1',
  location: 'Paris',
  conversation_goal: 'call',
  conversation_stage: 1,
  conversation_status: 'in_progress',
};

const MOCK_HISTORY = [
  {
    id: 1,
    direction: 'outbound',
    content: "Hey Emma ! 👋\n\nJ'ai vu ta dernière story sur la gestion du stress - ça m'a vraiment parlé.\n\nJe développe un outil qui aide les coachs comme toi à trouver des clients qualifiés sans y passer des heures.\n\nÇa te dirait qu'on en discute 5 min ?",
    stage: 1,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export default function Conversation() {
  const { prospectId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // State
  const [prospect, setProspect] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prospectResponse, setProspectResponse] = useState('');
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [generatingMessage, setGeneratingMessage] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedContent, setEditedContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Charger les données du prospect
  useEffect(() => {
    const loadConversation = async () => {
      setLoading(true);
      try {
        // Essayer l'API
        const response = await fetch(`${API_BASE_URL}/conversations/${prospectId}/history`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setProspect(data.data?.prospect || MOCK_PROSPECT);
          setHistory(data.data?.history || MOCK_HISTORY);
        } else {
          throw new Error('API non disponible');
        }
      } catch (err) {
        // Mode démo
        await new Promise(r => setTimeout(r, 500));
        setProspect(MOCK_PROSPECT);
        setHistory(MOCK_HISTORY);
      } finally {
        setLoading(false);
      }
    };

    loadConversation();
  }, [prospectId]);

  // Scroll to bottom when history changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Analyser la réponse du prospect
  const handleAnalyzeResponse = async () => {
    if (!prospectResponse.trim()) return;

    setAnalyzing(true);
    setAnalysis(null);
    setSuggestions([]);

    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${prospectId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ response: prospectResponse }),
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.data?.analysis);
        setSuggestions(data.data?.suggestions || []);
      } else {
        throw new Error('API non disponible');
      }
    } catch (err) {
      // Mode démo - générer une analyse mock
      await new Promise(r => setTimeout(r, 1500));
      const mockAnalysis = generateMockAnalysis(prospectResponse);
      setAnalysis(mockAnalysis);
      setSuggestions(generateMockSuggestions(mockAnalysis, prospect));
    } finally {
      setAnalyzing(false);
      setAnalysisComplete(true);
      // Reset l'effet après 3 secondes
      setTimeout(() => setAnalysisComplete(false), 3000);
    }
  };

  // Envoyer un message (simulé - copie dans le presse-papiers)
  const handleSendMessage = async (content) => {
    setSendingMessage(true);
    try {
      // Copier dans le presse-papiers
      await navigator.clipboard.writeText(content);

      // Ajouter la réponse du prospect à l'historique
      if (prospectResponse.trim()) {
        setHistory(prev => [...prev, {
          id: Date.now() - 1,
          direction: 'inbound',
          content: prospectResponse,
          stage: prospect.conversation_stage,
          created_at: new Date().toISOString(),
        }]);
      }

      // Ajouter notre message à l'historique
      setHistory(prev => [...prev, {
        id: Date.now(),
        direction: 'outbound',
        content: content,
        stage: prospect.conversation_stage,
        created_at: new Date().toISOString(),
      }]);

      // Reset
      setProspectResponse('');
      setShowResponseInput(false);
      setAnalysis(null);
      setSuggestions([]);

      // Notification
      alert('Message copié ! Colle-le dans Instagram/TikTok pour l\'envoyer.');

    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  // Marquer comme objectif atteint
  const handleMarkComplete = () => {
    setProspect(prev => ({ ...prev, conversation_status: 'goal_achieved' }));
  };

  // Abandonner la conversation
  const handleAbandon = () => {
    if (window.confirm('Es-tu sûr de vouloir abandonner cette conversation ?')) {
      setProspect(prev => ({ ...prev, conversation_status: 'abandoned' }));
    }
  };

  // Copier un message
  const handleCopy = async (content, index) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Commencer l'édition
  const handleStartEdit = (content, index) => {
    setEditingIndex(index);
    setEditedContent(content);
  };

  // Sauvegarder l'édition
  const handleSaveEdit = (index) => {
    const newSuggestions = [...suggestions];
    newSuggestions[index] = { ...newSuggestions[index], content: editedContent };
    setSuggestions(newSuggestions);
    setEditingIndex(null);
  };

  // Générer un nouveau message
  const handleGenerateNew = async () => {
    setGeneratingMessage(true);
    try {
      // Simuler la génération
      await new Promise(r => setTimeout(r, 1500));
      const newSuggestions = generateMockSuggestions(analysis, prospect);
      setSuggestions(newSuggestions);
    } finally {
      setGeneratingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-8 text-center">
        <p className="text-warm-500">Prospect non trouvé</p>
        <Link to="/prospects" className="text-brand-600 hover:underline mt-2 inline-block">
          Retour aux prospects
        </Link>
      </div>
    );
  }

  const goal = GOALS[prospect.conversation_goal] || GOALS.call;
  const GoalIcon = goal.icon;
  const stages = STAGES[prospect.conversation_goal] || STAGES.call;
  const currentStage = prospect.conversation_stage || 1;
  const status = prospect.conversation_status || 'not_started';

  return (
    <>
      <Header
        title={`Conversation avec @${prospect.username}`}
        subtitle={`Objectif : ${goal.label}`}
      />

      <div className="p-6 lg:p-8">
        <div className="max-w-5xl mx-auto">
          {/* Bouton retour */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-warm-500 hover:text-warm-700 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne gauche : Info prospect + Timeline */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info prospect */}
              <div className="card p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={prospect.avatar}
                      alt={prospect.username}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center ${
                      prospect.platform === 'instagram'
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : 'bg-black'
                    }`}>
                      {prospect.platform === 'instagram'
                        ? <Instagram className="w-3.5 h-3.5 text-white" />
                        : <TikTokIcon className="w-3.5 h-3.5 text-white" />
                      }
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-semibold text-warm-900">@{prospect.username}</h2>
                      <a
                        href={`https://${prospect.platform}.com/${prospect.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-warm-400 hover:text-warm-600"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-warm-500">{prospect.fullName}</p>
                    <p className="text-sm text-warm-600 mt-1">{prospect.bio}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-warm-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {prospect.followers >= 1000 ? `${(prospect.followers / 1000).toFixed(1)}K` : prospect.followers}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        {prospect.engagement}%
                      </span>
                      {prospect.location && (
                        <span className="flex items-center gap-1 text-brand-600">
                          <MapPin className="w-4 h-4" />
                          {prospect.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GoalIcon className={`w-5 h-5 text-${goal.color}-600`} />
                    <span className="font-medium text-warm-800">{goal.label}</span>
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    status === 'goal_achieved' ? 'bg-green-100 text-green-700' :
                    status === 'abandoned' ? 'bg-red-100 text-red-700' :
                    status === 'waiting_response' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {status === 'goal_achieved' ? 'Objectif atteint !' :
                     status === 'abandoned' ? 'Abandonnée' :
                     status === 'waiting_response' ? 'Attente réponse' :
                     'En cours'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {stages.map((stage, idx) => (
                    <div key={idx} className="flex-1">
                      <div className={`h-2 rounded-full ${
                        idx + 1 < currentStage ? 'bg-green-500' :
                        idx + 1 === currentStage ? 'bg-brand-500' :
                        'bg-warm-200'
                      }`} />
                      <p className={`text-xs mt-1 ${
                        idx + 1 === currentStage ? 'text-brand-600 font-medium' : 'text-warm-400'
                      }`}>
                        {stage}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline des messages */}
              <div className="card p-6">
                <h3 className="font-semibold text-warm-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-brand-500" />
                  Historique de la conversation
                </h3>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {history.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-warm-300 mx-auto mb-3" />
                      <p className="text-warm-500">Aucun message encore</p>
                    </div>
                  ) : (
                    history.map((msg, idx) => {
                      const isOutbound = msg.direction === 'outbound';
                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-2xl p-4 ${
                            isOutbound
                              ? 'bg-brand-500 text-white rounded-br-md'
                              : 'bg-warm-100 text-warm-800 rounded-bl-md'
                          }`}>
                            <div className="flex items-center gap-2 mb-2 text-xs opacity-75">
                              {isOutbound ? (
                                <>
                                  <Send className="w-3 h-3" />
                                  <span>Toi</span>
                                </>
                              ) : (
                                <>
                                  <MessageSquare className="w-3 h-3" />
                                  <span>@{prospect.username}</span>
                                </>
                              )}
                              <span>• Étape {msg.stage}</span>
                            </div>
                            <p className="whitespace-pre-line text-sm">{msg.content}</p>
                            <p className={`text-xs mt-2 ${isOutbound ? 'text-white/50' : 'text-warm-400'}`}>
                              {new Date(msg.created_at).toLocaleString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Actions si conversation active */}
                {status !== 'goal_achieved' && status !== 'abandoned' && (
                  <div className="mt-6 pt-4 border-t border-warm-100">
                    {!showResponseInput ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowResponseInput(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
                        >
                          <MessageSquare className="w-5 h-5" />
                          Le prospect a répondu
                        </button>
                        <button
                          onClick={handleMarkComplete}
                          className="px-4 py-3 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleAbandon}
                          className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-xl transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-warm-700 mb-2">
                            Colle la réponse du prospect :
                          </label>
                          <textarea
                            value={prospectResponse}
                            onChange={(e) => setProspectResponse(e.target.value)}
                            placeholder="Collez ici la réponse que vous avez reçue..."
                            className="w-full p-4 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none outline-none"
                            rows={4}
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleAnalyzeResponse}
                            disabled={!prospectResponse.trim() || analyzing}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-medium rounded-xl transition-all disabled:opacity-50 ${
                              analysisComplete
                                ? 'bg-green-500 text-white animate-pulse shadow-lg shadow-green-500/25'
                                : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg'
                            }`}
                          >
                            {analyzing ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Analyse en cours...
                              </>
                            ) : analysisComplete ? (
                              <>
                                <Check className="w-5 h-5" />
                                Analyse terminée !
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                Analyser et suggérer
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setShowResponseInput(false);
                              setProspectResponse('');
                              setAnalysis(null);
                              setSuggestions([]);
                            }}
                            className="px-4 py-3 text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-xl transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Message si terminé */}
                {status === 'goal_achieved' && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-green-700">Objectif atteint !</p>
                  </div>
                )}

                {status === 'abandoned' && (
                  <div className="mt-4 p-4 bg-red-50 rounded-xl text-center">
                    <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                    <p className="font-medium text-red-700">Conversation abandonnée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne droite : Analyse + Suggestions */}
            <div className="space-y-6">
              {/* Analyse de la réponse */}
              {analysis && (
                <div className="card p-6">
                  <h3 className="font-semibold text-warm-800 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Analyse de la réponse
                  </h3>

                  <div className="space-y-3">
                    {/* Sentiment */}
                    <div className={`${SENTIMENTS[analysis.sentiment]?.bg || 'bg-warm-50'} rounded-xl p-3`}>
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const SentimentIcon = SENTIMENTS[analysis.sentiment]?.icon || Meh;
                          return <SentimentIcon className={`w-5 h-5 ${SENTIMENTS[analysis.sentiment]?.color || 'text-warm-500'}`} />;
                        })()}
                        <span className={`font-medium ${SENTIMENTS[analysis.sentiment]?.color || 'text-warm-500'}`}>
                          {SENTIMENTS[analysis.sentiment]?.label || 'Neutre'}
                        </span>
                      </div>
                      <p className="text-sm text-warm-600">{analysis.advice}</p>
                    </div>

                    {/* Approche suggérée */}
                    <div className="bg-warm-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-5 h-5 text-brand-600" />
                        <span className="font-medium text-brand-600">{analysis.approachLabel}</span>
                      </div>
                      <p className="text-sm text-warm-600">Stratégie recommandée</p>
                    </div>

                    {/* Signaux détectés */}
                    {(analysis.buyingSignals?.length > 0 || analysis.objections?.length > 0) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {analysis.buyingSignals?.map((signal, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            ✓ {signal}
                          </span>
                        ))}
                        {analysis.objections?.map((obj, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                            ⚠ {obj}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Suggestions de réponse */}
              {suggestions.length > 0 && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-warm-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-brand-500" />
                      Suggestions de relance
                    </h3>
                    <button
                      onClick={handleGenerateNew}
                      disabled={generatingMessage}
                      className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-4 h-4 ${generatingMessage ? 'animate-spin' : ''}`} />
                      Régénérer
                    </button>
                  </div>

                  {/* Liste des suggestions à sélectionner */}
                  <div className="space-y-3 mb-4">
                    {suggestions.map((suggestion, idx) => {
                      const isSelected = selectedSuggestionIndex === idx;

                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSuggestionIndex(idx)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50 shadow-md'
                              : 'border-warm-200 hover:border-warm-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${isSelected ? 'text-brand-700' : 'text-warm-700'}`}>
                              {suggestion.label || `Option ${idx + 1}`}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-brand-100 text-brand-600' : 'bg-warm-100 text-warm-500'
                            }`}>
                              {suggestion.type}
                            </span>
                          </div>
                          <p className={`text-sm line-clamp-3 ${isSelected ? 'text-brand-600' : 'text-warm-600'}`}>
                            {suggestion.content}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Zone d'édition et envoi si une suggestion est sélectionnée */}
                  {selectedSuggestionIndex !== null && (
                    <div className="border-t border-warm-100 pt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-warm-700">
                          Message à envoyer :
                        </span>
                        <button
                          onClick={() => handleStartEdit(suggestions[selectedSuggestionIndex].content, selectedSuggestionIndex)}
                          className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" />
                          Modifier
                        </button>
                      </div>

                      {editingIndex === selectedSuggestionIndex ? (
                        <div className="space-y-3">
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full p-4 border border-warm-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                            rows={5}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSaveEdit(selectedSuggestionIndex)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
                            >
                              <Check className="w-4 h-4" />
                              Enregistrer les modifications
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-4 py-2 text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg text-sm"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="bg-gradient-to-br from-brand-50 to-accent-50 rounded-xl p-4 border border-brand-100">
                            <p className="text-warm-700 text-sm whitespace-pre-line">
                              {suggestions[selectedSuggestionIndex].content}
                            </p>
                          </div>

                          {/* Bouton Copier & Ouvrir Instagram */}
                          <button
                            onClick={async () => {
                              const content = suggestions[selectedSuggestionIndex].content;
                              try {
                                await navigator.clipboard.writeText(content);
                                setCopiedIndex(selectedSuggestionIndex);

                                // Ajouter la réponse du prospect et notre message à l'historique
                                if (prospectResponse.trim()) {
                                  setHistory(prev => [...prev, {
                                    id: Date.now() - 1,
                                    direction: 'inbound',
                                    content: prospectResponse,
                                    stage: prospect.conversation_stage,
                                    created_at: new Date().toISOString(),
                                  }]);
                                }
                                setHistory(prev => [...prev, {
                                  id: Date.now(),
                                  direction: 'outbound',
                                  content: content,
                                  stage: prospect.conversation_stage,
                                  created_at: new Date().toISOString(),
                                }]);

                                // Ouvrir Instagram DM
                                const username = prospect.username?.replace('@', '');
                                const platform = prospect.platform?.toLowerCase() || 'instagram';
                                let url = `https://ig.me/m/${username}`;
                                if (platform === 'tiktok') {
                                  url = `https://tiktok.com/@${username}`;
                                }
                                window.open(url, '_blank', 'noopener,noreferrer');

                                // Reset
                                setTimeout(() => {
                                  setCopiedIndex(null);
                                  setProspectResponse('');
                                  setShowResponseInput(false);
                                  setAnalysis(null);
                                  setSuggestions([]);
                                  setSelectedSuggestionIndex(null);
                                }, 3000);
                              } catch (err) {
                                console.error('Erreur copie:', err);
                              }
                            }}
                            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                              copiedIndex === selectedSuggestionIndex
                                ? 'bg-green-500 text-white'
                                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25'
                            }`}
                          >
                            {copiedIndex === selectedSuggestionIndex ? (
                              <>
                                <Check className="w-5 h-5" />
                                Copié ! Colle dans la conversation
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5" />
                                Copier & ouvrir {prospect.platform === 'tiktok' ? 'TikTok' : 'Instagram'}
                              </>
                            )}
                          </button>

                          <p className="text-xs text-warm-400 text-center">
                            Le message sera copié et {prospect.platform === 'tiktok' ? 'TikTok' : 'Instagram'} s'ouvrira.
                            Il ne reste plus qu'à coller (Ctrl+V) et envoyer !
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Message si aucune suggestion sélectionnée */}
                  {selectedSuggestionIndex === null && (
                    <p className="text-sm text-warm-400 text-center py-2">
                      Clique sur une suggestion pour la sélectionner et l'envoyer
                    </p>
                  )}
                </div>
              )}

              {/* Aide si pas d'analyse */}
              {!analysis && !analyzing && showResponseInput && (
                <div className="card p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-warm-300 mx-auto mb-3" />
                  <p className="text-warm-600 font-medium">Colle la réponse du prospect</p>
                  <p className="text-sm text-warm-400 mt-1">
                    L'IA analysera son message et te suggérera la meilleure réponse
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Génération d'analyse mock
function generateMockAnalysis(response) {
  const responseLower = response.toLowerCase();

  let sentiment = 'neutral';
  let advice = 'Apporte de la valeur pour créer de l\'intérêt.';
  let suggestedApproach = 'continue';
  let approachLabel = 'Continuer';
  let buyingSignals = [];
  let objections = [];

  // Détection du sentiment
  if (responseLower.includes('intéress') || responseLower.includes('oui') || responseLower.includes('pourquoi pas') || responseLower.includes('dis-moi plus')) {
    sentiment = 'positive';
    advice = 'Bon signal ! Tu peux avancer vers ton objectif.';
    suggestedApproach = 'advance';
    approachLabel = 'Avancer';
    buyingSignals.push('Intérêt exprimé');
  } else if (responseLower.includes('non') || responseLower.includes('pas intéress') || responseLower.includes('stop') || responseLower.includes('désabonne')) {
    sentiment = 'negative';
    advice = 'Mieux vaut ne pas insister. Remercie et passe à autre chose.';
    suggestedApproach = 'abandon';
    approachLabel = 'Terminer poliment';
    objections.push('Refus clair');
  } else if (responseLower.includes('?') || responseLower.includes('comment') || responseLower.includes('combien') || responseLower.includes('quoi')) {
    sentiment = 'hesitant';
    advice = 'Il/elle pose des questions - bon signe ! Réponds puis avance.';
    suggestedApproach = 'answer_then_advance';
    approachLabel = 'Répondre puis avancer';
    buyingSignals.push('Questions posées');
  } else if (responseLower.includes('pas le temps') || responseLower.includes('occupé') || responseLower.includes('plus tard')) {
    sentiment = 'hesitant';
    advice = 'Rassure avec douceur, sans pression.';
    suggestedApproach = 'reassure';
    approachLabel = 'Rassurer';
    objections.push('Manque de temps');
  }

  // Détection de signaux
  if (responseLower.includes('prix') || responseLower.includes('coût') || responseLower.includes('tarif')) {
    buyingSignals.push('Demande de prix');
  }
  if (responseLower.includes('quand') || responseLower.includes('dispo')) {
    buyingSignals.push('Demande de disponibilité');
  }
  if (responseLower.includes('cher') || responseLower.includes('budget')) {
    objections.push('Préoccupation budget');
  }

  return {
    sentiment,
    advice,
    suggestedApproach,
    approachLabel,
    buyingSignals,
    objections,
  };
}

// Génération de suggestions mock
function generateMockSuggestions(analysis, prospect) {
  const username = prospect?.username || 'prospect';

  if (analysis?.suggestedApproach === 'abandon') {
    return [
      {
        label: 'Clôture polie',
        type: 'courtois',
        content: `Pas de souci ${username}, je comprends parfaitement ! 🙏\n\nMerci d'avoir pris le temps de me répondre. Si jamais tu changes d'avis ou que tu as des questions à l'avenir, n'hésite pas !\n\nBonne continuation 💪`,
      },
    ];
  }

  if (analysis?.suggestedApproach === 'advance') {
    return [
      {
        label: 'Proposer un call',
        type: 'direct',
        content: `Super ${username} ! 🎉\n\nJe suis content(e) que ça t'intéresse. Le plus simple serait qu'on se cale un call de 15 min pour que je te montre concrètement comment ça fonctionne.\n\nT'es dispo cette semaine ? Je peux m'adapter à ton emploi du temps 📅`,
      },
      {
        label: 'Envoyer un lien',
        type: 'soft',
        content: `Top ${username} ! 😊\n\nJe t'envoie un lien vers une courte démo pour que tu puisses voir par toi-même.\n\n[LIEN]\n\nDis-moi ce que t'en penses après !`,
      },
    ];
  }

  if (analysis?.suggestedApproach === 'answer_then_advance') {
    return [
      {
        label: 'Répondre + Avancer',
        type: 'équilibré',
        content: `Bonne question ${username} ! 👍\n\nEn gros, [RÉPONSE À SA QUESTION].\n\nLe mieux serait qu'on en discute rapidement par téléphone, je pourrais te montrer des exemples concrets. T'aurais 10 min cette semaine ?`,
      },
      {
        label: 'Répondre + Teaser',
        type: 'soft',
        content: `Je comprends ta question ${username} !\n\n[RÉPONSE À SA QUESTION]\n\nJ'ai d'ailleurs une ressource qui explique tout ça en détail. Je te l'envoie ?`,
      },
    ];
  }

  if (analysis?.suggestedApproach === 'reassure') {
    return [
      {
        label: 'Rassurer sans pression',
        type: 'doux',
        content: `Aucun souci ${username}, je comprends ! 😊\n\nPas de pression de mon côté. Je te laisse mon contact si jamais tu veux en reparler plus tard.\n\nBonne continuation ! 🙌`,
      },
      {
        label: 'Proposer une alternative',
        type: 'pratique',
        content: `Je comprends ${username}, on est tous super occupés ! ⏰\n\nSi t'as même juste 5 min, je peux t'envoyer un récap écrit ou une courte vidéo que tu regarderas quand tu veux.\n\nÇa te convient ?`,
      },
    ];
  }

  // Par défaut
  return [
    {
      label: 'Relance douce',
      type: 'neutre',
      content: `Hey ${username} ! 👋\n\nJe me permets de te relancer car je pense vraiment que ça pourrait t'intéresser.\n\nSi t'as 2 min, dis-moi ce que t'en penses ? Pas de pression ! 😊`,
    },
    {
      label: 'Apporter de la valeur',
      type: 'valeur',
      content: `Salut ${username} !\n\nJe partage un conseil gratuit qui pourrait t'aider : [CONSEIL].\n\nSi ça te parle, on peut en discuter plus en détail. Qu'est-ce que t'en dis ?`,
    },
  ];
}
