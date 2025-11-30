import { useState, useEffect } from 'react';
import { Copy, Check, Loader2, Sparkles, RefreshCw, Send, Instagram, Play, Heart, MessageSquare, Zap, Eye, Edit3, Target, ChevronLeft } from 'lucide-react';

import Modal from '../ui/Modal';
import { ConversationGoalSelector } from '../conversations';

// Icône TikTok
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

/**
 * Modal pour générer un message personnalisé pour un prospect
 * avec analyse des posts récents
 */
export default function GenerateMessageModal({ isOpen, onClose, prospect, posts = [] }) {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [copied, setCopied] = useState(false);
  const [messageSaved, setMessageSaved] = useState(false);

  // Nouvelles variables pour les séquences de conversation
  const [step, setStep] = useState('goal'); // 'goal' | 'generate'
  const [conversationGoal, setConversationGoal] = useState(null);

  // Réinitialiser à l'ouverture
  useEffect(() => {
    if (isOpen && prospect) {
      // Toujours réinitialiser quand le modal s'ouvre
      setGeneratedMessage('');
      setEditedMessage('');
      setIsEditing(false);
      setAnalysis(null);
      setCopied(false);
      setMessageSaved(false);
      setStep('goal'); // Commencer par le choix de l'objectif
      setConversationGoal(prospect.conversation_goal || null); // Récupérer l'objectif existant si présent
    }
  }, [isOpen, prospect?.id]);

  // Mettre à jour le message édité quand le message généré change
  useEffect(() => {
    if (generatedMessage) {
      setEditedMessage(generatedMessage);
      setIsEditing(false);
    }
  }, [generatedMessage]);

  const handleGenerate = async () => {
    if (!prospect) return;

    setLoading(true);
    setGeneratedMessage('');
    setEditedMessage('');
    setIsEditing(false);
    setAnalysis(null);

    try {
      // Étape 1: Analyser les posts si disponibles
      let postAnalysis = null;
      if (posts && posts.length > 0) {
        setLoadingStep('Analyse des posts récents...');

        try {
          const analyzeResponse = await fetch('/api/prospects/analyze-posts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
              posts,
              prospect: {
                username: prospect.username,
                platform: prospect.platform,
                bio: prospect.bio,
              },
            }),
          });

          if (analyzeResponse.ok) {
            const analyzeData = await analyzeResponse.json();
            postAnalysis = analyzeData.data?.analysis;
            setAnalysis(postAnalysis);
          }
        } catch (err) {
          console.log('Analyse API non disponible, utilisation du mode démo');
          postAnalysis = generateDemoAnalysis(posts, prospect);
          setAnalysis(postAnalysis);
        }
      }

      // Étape 2: Générer le message personnalisé avec Claude
      setLoadingStep('Génération du message avec IA...');

      try {
        const generateResponse = await fetch('/api/messages/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            prospect: {
              username: prospect.username,
              platform: prospect.platform,
              bio: prospect.bio,
              followers: prospect.followers,
            },
            posts,
          }),
        });

        if (generateResponse.ok) {
          const generateData = await generateResponse.json();
          setGeneratedMessage(generateData.data?.message);
          if (generateData.data?.analysis) {
            setAnalysis(generateData.data.analysis);
          }
        } else {
          throw new Error('API error');
        }
      } catch (err) {
        console.log('API Claude non disponible, utilisation du mode démo');
        // Mode démo - générer un message exemple basé sur l'analyse
        const demoMessage = generateDemoMessage(prospect, posts, postAnalysis || analysis);
        setGeneratedMessage(demoMessage);
      }
    } catch (err) {
      console.error('Erreur génération:', err);
      const demoMessage = generateDemoMessage(prospect, posts, analysis);
      setGeneratedMessage(demoMessage);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleCopy = async () => {
    const messageToCopy = isEditing ? editedMessage : generatedMessage;
    await navigator.clipboard.writeText(messageToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    // Utiliser le message édité si disponible
    const finalMessage = editedMessage || generatedMessage;
    console.log('Message sauvegardé:', finalMessage);
    setMessageSaved(true);
    setTimeout(() => {
      setMessageSaved(false);
      onClose();
    }, 1500);
  };

  const handleStartEditing = () => {
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setEditedMessage(generatedMessage);
    setIsEditing(false);
  };

  const handleClose = () => {
    setGeneratedMessage('');
    setEditedMessage('');
    setIsEditing(false);
    setAnalysis(null);
    setCopied(false);
    setMessageSaved(false);
    onClose();
  };

  // Temps relatif
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    const diff = now - time;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)} sem`;
  };

  // Handler pour sélectionner un objectif et passer à l'étape suivante
  const handleGoalSelect = (goalId) => {
    setConversationGoal(goalId);
  };

  // Handler pour confirmer l'objectif et générer le message
  const handleConfirmGoal = async () => {
    if (!conversationGoal) return;
    setStep('generate');
    // Générer automatiquement le premier message
    handleGenerate();
  };

  if (!prospect) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'goal' ? "Objectif de conversation" : "Message personnalisé"}
      description={step === 'goal' ? "Choisis ton objectif avant de démarrer" : "Basé sur l'analyse de ses posts récents"}
      size="large"
    >
      <div className="space-y-6">
        {/* Étape 1: Choix de l'objectif */}
        {step === 'goal' && (
          <>
            {/* Info prospect compacte */}
            <div className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl">
              <div className="relative">
                <img
                  src={prospect.avatar}
                  alt={prospect.username}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                  prospect.platform === 'instagram'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                    : 'bg-black'
                }`}>
                  {prospect.platform === 'instagram'
                    ? <Instagram className="w-2.5 h-2.5 text-white" />
                    : <TikTokIcon className="w-2.5 h-2.5 text-white" />
                  }
                </div>
              </div>
              <div>
                <p className="font-medium text-warm-800">@{prospect.username}</p>
                <p className="text-xs text-warm-500">{prospect.fullName}</p>
              </div>
            </div>

            {/* Sélecteur d'objectif */}
            <ConversationGoalSelector
              selectedGoal={conversationGoal}
              onSelect={handleGoalSelect}
            />

            {/* Bouton de confirmation */}
            <button
              onClick={handleConfirmGoal}
              disabled={!conversationGoal}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              Générer le 1er message
            </button>
          </>
        )}

        {/* Étape 2: Génération du message */}
        {step === 'generate' && (
          <>
            {/* Bouton retour */}
            <button
              onClick={() => setStep('goal')}
              className="flex items-center gap-1 text-sm text-warm-500 hover:text-warm-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Changer d'objectif
            </button>

            {/* Info prospect */}
            <div className="flex items-center gap-4 p-4 bg-warm-50 rounded-xl">
          <div className="relative">
            <img
              src={prospect.avatar}
              alt={prospect.username}
              className="w-14 h-14 rounded-xl object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
              prospect.platform === 'instagram'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : 'bg-black'
            }`}>
              {prospect.platform === 'instagram'
                ? <Instagram className="w-3 h-3 text-white" />
                : <TikTokIcon className="w-3 h-3 text-white" />
              }
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-warm-900">@{prospect.username}</h3>
            <p className="text-sm text-warm-500">{prospect.fullName}</p>
            {prospect.bio && (
              <p className="text-xs text-warm-400 mt-1 line-clamp-1">{prospect.bio}</p>
            )}
          </div>
          {posts.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-lg">
              <Eye className="w-3 h-3" />
              {posts.length} posts analysés
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-brand-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-warm-600 font-medium mt-4">{loadingStep || 'Analyse en cours...'}</p>
            <p className="text-sm text-warm-400 mt-1">Génération d'un message ultra-personnalisé</p>
          </div>
        )}

        {/* Résultat */}
        {generatedMessage && !loading && (
          <>
            {/* Analyse des posts (si disponible) */}
            {analysis && posts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-warm-700">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Analyse intelligente
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Post de référence */}
                  {posts[0] && (
                    <div className="p-3 bg-warm-50 rounded-xl border border-warm-100">
                      <p className="text-xs text-warm-500 mb-2">Post de référence</p>
                      <div className="flex gap-2">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-warm-200">
                          <img
                            src={posts[0].thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {posts[0].type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-4 h-4 text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-warm-600 line-clamp-2">{posts[0].caption?.substring(0, 60)}...</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-warm-400">
                            <span>{getRelativeTime(posts[0].publishedAt)}</span>
                            <span className="flex items-center gap-0.5">
                              <Heart className="w-3 h-3" />
                              {posts[0].likes >= 1000 ? `${(posts[0].likes / 1000).toFixed(1)}K` : posts[0].likes}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  <div className="p-3 bg-brand-50 rounded-xl border border-brand-100">
                    <p className="text-xs text-brand-600 mb-2">Hook détecté</p>
                    <p className="text-sm text-brand-800 font-medium leading-snug">
                      "{analysis.suggestedHook || analysis.specificElement}"
                    </p>
                    {analysis.prospectTone && (
                      <p className="text-xs text-brand-500 mt-2">
                        Ton : {analysis.prospectTone}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Message généré / éditable */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-warm-700">
                  {isEditing ? 'Modifier le message :' : 'Message généré :'}
                </p>
                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      onClick={handleStartEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={handleCancelEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Régénérer
                  </button>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Zone de message : lecture seule ou éditable */}
              {isEditing ? (
                <div className="relative">
                  <textarea
                    value={editedMessage}
                    onChange={(e) => setEditedMessage(e.target.value)}
                    className="w-full min-h-[180px] p-4 bg-white rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-warm-700 leading-relaxed resize-none transition-colors outline-none"
                    placeholder="Modifiez votre message ici..."
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-warm-400">
                    {editedMessage.length} caractères
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-warm-50 rounded-xl border border-warm-100">
                  <p className="text-warm-700 whitespace-pre-line leading-relaxed">{editedMessage || generatedMessage}</p>
                </div>
              )}

              {/* Indicateur de modification */}
              {editedMessage !== generatedMessage && !isEditing && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" />
                  Message modifié par vous
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={messageSaved}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {messageSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    Sauvegardé !
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Sauvegarder et envoyer
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-warm-400 text-center">
              {posts.length > 0
                ? `Message basé sur l'analyse de ${posts.length} post${posts.length > 1 ? 's' : ''} récents`
                : 'Message généré avec ton profil MA VOIX'
              }
            </p>
          </>
        )}
          </>
        )}
      </div>
    </Modal>
  );
}

/**
 * Génère une analyse démo des posts
 */
function generateDemoAnalysis(posts, prospect) {
  if (!posts || posts.length === 0) return null;

  const latestPost = posts[0];
  const caption = latestPost.caption || '';

  // Détecter le sujet principal
  let mainTopic = 'son activité';
  let specificElement = '';
  let prospectTone = 'professionnel';
  let suggestedHook = '';

  if (caption.toLowerCase().includes('transform')) {
    mainTopic = 'transformation et résultats clients';
    specificElement = 'le post sur la transformation en 3 mois';
    prospectTone = 'inspirant';
    suggestedHook = 'J\'ai vu ta story sur la transformation de ton client';
  } else if (caption.toLowerCase().includes('live') || caption.toLowerCase().includes('direct')) {
    mainTopic = 'lives et interactions avec sa communauté';
    specificElement = 'l\'annonce de son prochain live';
    prospectTone = 'accessible';
    suggestedHook = 'J\'ai vu que tu fais des lives sur ' + (caption.match(/sur\s+(\w+)/)?.[1] || 'ton expertise');
  } else if (caption.toLowerCase().includes('erreur') || caption.toLowerCase().includes('conseil')) {
    mainTopic = 'partage de conseils et expertise';
    specificElement = 'son post sur les erreurs à éviter';
    prospectTone = 'pédagogue';
    suggestedHook = 'Ton post sur les erreurs à éviter m\'a vraiment parlé';
  } else if (caption.toLowerCase().includes('behind') || caption.toLowerCase().includes('coulisse')) {
    mainTopic = 'behind the scenes et authenticité';
    specificElement = 'son contenu behind the scenes';
    prospectTone = 'authentique';
    suggestedHook = 'J\'adore ta transparence dans tes behind the scenes';
  } else if (caption.match(/\d+[kK€$]/)) {
    mainTopic = 'résultats business et success stories';
    specificElement = 'son parcours entrepreneurial';
    prospectTone = 'ambitieux';
    suggestedHook = 'Ton parcours entrepreneurial est vraiment inspirant';
  } else {
    // Fallback: utiliser le début de la caption
    const firstWords = caption.split(' ').slice(0, 5).join(' ');
    mainTopic = 'son contenu récent';
    specificElement = `"${firstWords}..."`;
    prospectTone = 'engagé';
    suggestedHook = `J'ai vu ton dernier post sur ${prospect.platform === 'tiktok' ? 'TikTok' : 'Instagram'}`;
  }

  return {
    mainTopic,
    specificElement,
    prospectTone,
    suggestedHook,
    keyInsight: `Créateur actif avec ${prospect.followers || 'de nombreux'} abonnés`,
  };
}

/**
 * Génère un message de démo basé sur les posts et l'analyse
 * Utilise le timestamp pour garantir des messages différents à chaque génération
 */
function generateDemoMessage(prospect, posts, analysis) {
  const { username, platform } = prospect;

  // Utiliser un index basé sur le temps pour varier les messages
  const timeIndex = Date.now() % 10;

  // Si on a une analyse basée sur les posts
  if (analysis && analysis.suggestedHook) {
    const hooks = [
      `Hey ${username} !\n\n${analysis.suggestedHook}. C'est exactement le genre de contenu qui me parle.\n\nJe travaille sur un outil de prospection qui pourrait t'aider à développer ta communauté de manière authentique.\n\nÇa te dirait qu'on en discute 5 min ?`,

      `Salut ${username} !\n\n${analysis.suggestedHook} - ça m'a vraiment inspiré.\n\nJe développe quelque chose qui pourrait matcher avec ce que tu fais. Rien de commercial, juste un échange.\n\nDispo pour un call rapide ?`,

      `${username} !\n\n${analysis.suggestedHook}. J'ai tellement reconnu certaines galères que j'ai vécues.\n\nJe bosse sur un projet qui aide les créateurs comme toi à trouver les bonnes opportunités sans y passer des heures.\n\nIntéressé(e) ?`,

      `Yo ${username} !\n\n${analysis.suggestedHook}. Franchement, c'est rare de voir du contenu aussi authentique.\n\nJ'aimerais te présenter un projet sur lequel je bosse - ça pourrait vraiment t'intéresser.\n\nT'es chaud(e) pour un échange ?`,

      `Hello ${username} !\n\n${analysis.suggestedHook}. Ton approche est vraiment unique.\n\nJe pense qu'on pourrait créer quelque chose d'intéressant ensemble.\n\nOn se cale un call de 10 min ?`,

      `Coucou ${username} !\n\n${analysis.suggestedHook}. J'adore ta vibe !\n\nJ'ai un projet qui pourrait booster ton activité de façon organique.\n\nCurieux(se) d'en savoir plus ?`,

      `Hey ${username} !\n\n${analysis.suggestedHook}. Je suis fan de ta façon de créer du lien avec ta communauté.\n\nJ'ai quelque chose qui pourrait amplifier ça.\n\nOn en parle autour d'un café virtuel ?`,

      `${username}, salut !\n\n${analysis.suggestedHook}. Tu dégages une énergie que j'apprécie vraiment.\n\nJe travaille sur un outil fait pour les créateurs comme toi.\n\n5 min pour t'en parler ?`,

      `Hey ${username} !\n\n${analysis.suggestedHook}. Ton contenu mérite vraiment plus de visibilité.\n\nJ'ai peut-être une solution pour ça - sans spammer ni tricher.\n\nOn s'appelle ?`,

      `Salut ${username} !\n\n${analysis.suggestedHook}. C'est le genre de contenu qui fait la diff sur ${platform === 'tiktok' ? 'TikTok' : 'Insta'}.\n\nJ'aimerais te montrer quelque chose qui pourrait t'aider à scaler.\n\nDisponible cette semaine ?`,
    ];

    return hooks[timeIndex];
  }

  // Si on a des posts mais pas d'analyse détaillée
  if (posts && posts.length > 0) {
    const latestPost = posts[0];
    const shortCaption = latestPost.caption?.substring(0, 50) || 'ton dernier contenu';

    const postMessages = [
      `Hey ${username} !\n\nJe viens de voir ton post "${shortCaption}..." - vraiment top !\n\nJe travaille sur quelque chose qui pourrait t'intéresser pour développer ton activité.\n\nOn en parle ?`,

      `Salut ${username} !\n\nTon post "${shortCaption}..." m'a accroché direct.\n\nJe bosse sur un projet qui aide les créateurs à trouver leur audience idéale.\n\nÇa te parle ?`,

      `${username} !\n\nJ'ai adoré "${shortCaption}..." - du contenu de qualité comme ça, c'est rare.\n\nJ'ai quelque chose qui pourrait multiplier ton impact.\n\nOn se call ?`,

      `Hey ${username} !\n\n"${shortCaption}..." - c'est exactement ce que j'aime voir sur mon feed.\n\nJe pense pouvoir t'aider à toucher plus de monde.\n\nIntéressé(e) ?`,

      `Yo ${username} !\n\nTon post "${shortCaption}..." c'est du lourd.\n\nJ'ai un truc qui pourrait matcher avec ta stratégie de contenu.\n\nDispo pour 5 min ?`,
    ];

    return postMessages[timeIndex % postMessages.length];
  }

  // Fallback sans posts - messages génériques variés
  const bio = prospect.bio || '';
  const isCoach = bio.toLowerCase().includes('coach');
  const isFitness = bio.toLowerCase().includes('fitness') || bio.toLowerCase().includes('sport');
  const isEntrepreneur = bio.toLowerCase().includes('entrepreneur') || bio.toLowerCase().includes('business');
  const isCreator = bio.toLowerCase().includes('créateur') || bio.toLowerCase().includes('creator') || bio.toLowerCase().includes('influenc');

  const genericMessages = [
    `Hey ${username} !\n\nJe viens de découvrir ton profil ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} et j'aime vraiment ce que tu partages.\n\nJe travaille sur un projet qui pourrait matcher avec ton activité.\n\nIntéressé(e) pour en parler ?`,

    `Salut ${username} !\n\nTon profil ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} a retenu mon attention.\n\nJ'ai quelque chose qui pourrait t'aider à développer ta présence en ligne.\n\nOn en discute ?`,

    `${username} !\n\nJ'adore ta vibe sur ${platform === 'tiktok' ? 'TikTok' : 'Instagram'}.\n\nJe bosse sur un outil qui aide les créateurs comme toi.\n\nÇa te dit d'en savoir plus ?`,

    `Hey ${username} !\n\nTon contenu m'a tapé dans l'œil - vraiment quali.\n\nJ'aurais un projet à te présenter qui pourrait t'intéresser.\n\nDispo pour un call rapide ?`,

    `Salut ${username} !\n\nJe suis tombé sur ton profil et j'ai direct accroché.\n\nJe pense qu'on pourrait faire quelque chose d'intéressant ensemble.\n\nOn en parle ?`,
  ];

  if (isCoach) {
    const coachMessages = [
      `Hey ${username} !\n\nTa bio m'a directement parlé - j'adore ton approche du coaching.\n\nJe développe un outil qui aide les coachs à trouver des clients qualifiés sans y passer des heures.\n\nÇa te dirait d'en discuter ?`,

      `Salut ${username} !\n\nEn tant que coach, tu sais à quel point c'est dur de trouver les bons clients.\n\nJ'ai créé quelque chose pour simplifier ça.\n\nIntéressé(e) ?`,

      `${username} !\n\nTon approche du coaching est vraiment unique.\n\nJ'ai un projet qui pourrait t'aider à toucher plus de personnes qui ont vraiment besoin de toi.\n\nOn se call ?`,
    ];
    return coachMessages[timeIndex % coachMessages.length];
  }

  if (isFitness) {
    const fitnessMessages = [
      `Salut ${username} !\n\nTon contenu fitness est vraiment quali ! J'aime l'énergie que tu dégages.\n\nJ'ai quelque chose qui pourrait t'aider à monétiser ton expertise différemment.\n\nOn en parle ?`,

      `Hey ${username} !\n\nTon énergie sur ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} est contagieuse !\n\nJe bosse sur un projet fait pour les passionnés de fitness comme toi.\n\nCurieux(se) ?`,

      `${username} !\n\nTon contenu inspire vraiment. Le fitness, c'est ta zone de génie.\n\nJ'ai quelque chose qui pourrait multiplier ton impact.\n\nDispo pour 5 min ?`,
    ];
    return fitnessMessages[timeIndex % fitnessMessages.length];
  }

  if (isEntrepreneur) {
    const entrepreneurMessages = [
      `${username} !\n\nTon parcours entrepreneur me parle. On a sûrement des galères en commun.\n\nJe bosse sur un projet de prospection automatisée - ça pourrait t'intéresser.\n\nDispo pour un call ?`,

      `Hey ${username} !\n\nEntre entrepreneurs, on sait ce que c'est de chercher des clients.\n\nJ'ai créé un outil pour simplifier ça radicalement.\n\nOn en discute ?`,

      `Salut ${username} !\n\nTon état d'esprit entrepreneur me parle direct.\n\nJ'ai quelque chose qui pourrait accélérer ta croissance.\n\nIntéressé(e) ?`,
    ];
    return entrepreneurMessages[timeIndex % entrepreneurMessages.length];
  }

  if (isCreator) {
    const creatorMessages = [
      `Hey ${username} !\n\nEn tant que créateur, tu sais l'importance d'une communauté engagée.\n\nJ'ai un outil qui pourrait t'aider à trouver ton audience idéale.\n\nÇa te parle ?`,

      `${username} !\n\nTon contenu de créateur est vraiment inspirant.\n\nJ'ai quelque chose qui pourrait booster ta visibilité de façon authentique.\n\nOn en parle ?`,
    ];
    return creatorMessages[timeIndex % creatorMessages.length];
  }

  return genericMessages[timeIndex % genericMessages.length];
}
