/**
 * Timeline de conversation
 * Affiche l'historique des échanges et le statut de la séquence
 */

import { useState } from 'react';
import {
  Check,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Phone,
  Link,
  Users,
  Target,
  Sparkles,
} from 'lucide-react';

const goalIcons = {
  call: Phone,
  link: Link,
  qualify: MessageSquare,
  network: Users,
};

const goalLabels = {
  call: 'Obtenir un appel',
  link: 'Amener vers un lien',
  qualify: 'Qualifier',
  network: 'Networking',
};

const stageLabels = {
  call: {
    1: 'Ouverture',
    2: 'Transition vers call',
    3: 'Relance',
  },
  link: {
    1: 'Teaser',
    2: 'Partage du lien',
    3: 'Suivi',
  },
  qualify: {
    1: 'Question qualification',
    2: 'Approfondissement',
    3: 'Proposition',
  },
  network: {
    1: 'Connexion',
    2: 'Partage de valeur',
    3: 'Proposition call',
  },
};

const statusColors = {
  not_started: 'bg-warm-100 text-warm-600',
  in_progress: 'bg-blue-100 text-blue-700',
  waiting_response: 'bg-amber-100 text-amber-700',
  goal_achieved: 'bg-green-100 text-green-700',
  abandoned: 'bg-red-100 text-red-700',
};

const statusLabels = {
  not_started: 'Non démarrée',
  in_progress: 'En cours',
  waiting_response: 'Attente réponse',
  goal_achieved: 'Objectif atteint !',
  abandoned: 'Abandonnée',
};

export default function ConversationTimeline({
  prospect,
  history = [],
  onSendMessage,
  onViewSuggestions,
  compact = false,
}) {
  const [expandedMessage, setExpandedMessage] = useState(null);

  const GoalIcon = goalIcons[prospect?.conversation_goal] || Target;
  const goalLabel = goalLabels[prospect?.conversation_goal] || 'Objectif';
  const currentStage = prospect?.conversation_stage || 1;
  const totalStages = 3;
  const status = prospect?.conversation_status || 'not_started';

  // Grouper les messages par étape
  const messagesByStage = history.reduce((acc, msg) => {
    const stage = msg.stage || 1;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(msg);
    return acc;
  }, {});

  if (compact) {
    return (
      <div className="bg-warm-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <GoalIcon className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-800">{goalLabel}</p>
              <p className="text-xs text-warm-500">
                Étape {currentStage}/{totalStages}
              </p>
            </div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {[1, 2, 3].map((stage) => (
            <div
              key={stage}
              className={`h-1.5 flex-1 rounded-full ${
                stage < currentStage
                  ? 'bg-green-500'
                  : stage === currentStage
                  ? 'bg-brand-500'
                  : 'bg-warm-200'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-warm-100 bg-warm-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <GoalIcon className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-800">
                Conversation avec @{prospect?.username}
              </h3>
              <p className="text-sm text-warm-500">Objectif : {goalLabel}</p>
            </div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-warm-500 mb-2">
            <span>Progression</span>
            <span>Étape {currentStage}/{totalStages}</span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((stage) => {
              const stageLabel = stageLabels[prospect?.conversation_goal]?.[stage] || `Étape ${stage}`;
              const isCompleted = stage < currentStage;
              const isCurrent = stage === currentStage;

              return (
                <div key={stage} className="flex-1">
                  <div
                    className={`h-2 rounded-full mb-1 ${
                      isCompleted
                        ? 'bg-green-500'
                        : isCurrent
                        ? 'bg-brand-500'
                        : 'bg-warm-200'
                    }`}
                  />
                  <p
                    className={`text-xs truncate ${
                      isCurrent ? 'text-brand-600 font-medium' : 'text-warm-400'
                    }`}
                  >
                    {stageLabel}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-warm-400" />
            </div>
            <p className="text-warm-500">Aucun message encore</p>
            <p className="text-sm text-warm-400 mt-1">
              Démarre la conversation en générant ton premier message
            </p>
          </div>
        ) : (
          history.map((message, index) => {
            const isOutbound = message.direction === 'outbound';
            const isExpanded = expandedMessage === message.id;

            return (
              <div
                key={message.id || index}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 ${
                    isOutbound
                      ? 'bg-brand-500 text-white rounded-br-md'
                      : 'bg-warm-100 text-warm-800 rounded-bl-md'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isOutbound ? (
                      <Send className="w-3 h-3" />
                    ) : (
                      <MessageSquare className="w-3 h-3" />
                    )}
                    <span className="text-xs opacity-75">
                      {isOutbound ? 'Toi' : `@${prospect?.username}`}
                    </span>
                    <span className="text-xs opacity-50">
                      • Étape {message.stage || 1}
                    </span>
                  </div>

                  <p className={`text-sm ${!isExpanded && message.content?.length > 150 ? 'line-clamp-3' : ''}`}>
                    {message.content}
                  </p>

                  {message.content?.length > 150 && (
                    <button
                      onClick={() => setExpandedMessage(isExpanded ? null : message.id)}
                      className={`text-xs mt-1 flex items-center gap-1 ${
                        isOutbound ? 'text-white/70 hover:text-white' : 'text-warm-500 hover:text-warm-700'
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3" /> Réduire
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" /> Voir plus
                        </>
                      )}
                    </button>
                  )}

                  <p className={`text-xs mt-2 ${isOutbound ? 'text-white/50' : 'text-warm-400'}`}>
                    {new Date(message.created_at).toLocaleString('fr-FR', {
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
      </div>

      {/* Actions */}
      {status !== 'goal_achieved' && status !== 'abandoned' && (
        <div className="p-4 border-t border-warm-100 bg-warm-50">
          {status === 'waiting_response' ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-amber-600 mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">En attente de réponse</span>
              </div>
              <button
                onClick={onViewSuggestions}
                className="text-sm text-brand-600 hover:underline"
              >
                Le prospect a répondu ? Coller sa réponse
              </button>
            </div>
          ) : (
            <button
              onClick={onViewSuggestions}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {currentStage === 1 ? 'Générer le 1er message' : 'Voir les suggestions'}
            </button>
          )}
        </div>
      )}

      {/* Goal achieved */}
      {status === 'goal_achieved' && (
        <div className="p-4 border-t border-green-100 bg-green-50 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">Objectif atteint !</span>
          </div>
        </div>
      )}
    </div>
  );
}
