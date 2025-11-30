/**
 * Composant pour afficher et gérer les suggestions de réponse
 * Inclut l'analyse du message du prospect et les options de réponse
 */

import { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Edit3,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Smile,
  Meh,
  Frown,
  Zap,
  MessageSquare,
  X,
} from 'lucide-react';

const sentimentConfig = {
  positive: {
    icon: Smile,
    color: 'text-green-600',
    bg: 'bg-green-50',
    label: 'Positif',
    advice: 'Bon signal ! Tu peux avancer vers ton objectif.',
  },
  neutral: {
    icon: Meh,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    label: 'Neutre',
    advice: 'Apporte de la valeur pour créer de l\'intérêt.',
  },
  negative: {
    icon: Frown,
    color: 'text-red-600',
    bg: 'bg-red-50',
    label: 'Négatif',
    advice: 'Mieux vaut ne pas insister. Remercie et passe à autre chose.',
  },
  hesitant: {
    icon: HelpCircle,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    label: 'Hésitant',
    advice: 'Rassure avec douceur, sans pression.',
  },
};

const approachLabels = {
  advance: { label: 'Avancer', color: 'text-green-600', icon: TrendingUp },
  reassure: { label: 'Rassurer', color: 'text-purple-600', icon: Smile },
  handle_objection: { label: 'Gérer l\'objection', color: 'text-amber-600', icon: AlertCircle },
  answer_then_advance: { label: 'Répondre puis avancer', color: 'text-blue-600', icon: MessageSquare },
  abandon: { label: 'Terminer poliment', color: 'text-red-600', icon: X },
  continue: { label: 'Continuer', color: 'text-warm-600', icon: Zap },
};

export default function ResponseSuggestions({
  analysis,
  suggestions = [],
  onSelect,
  onEdit,
  loading = false,
  prospectResponse,
}) {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  const sentiment = sentimentConfig[analysis?.sentiment] || sentimentConfig.neutral;
  const SentimentIcon = sentiment.icon;
  const approach = approachLabels[analysis?.suggestedApproach] || approachLabels.continue;
  const ApproachIcon = approach.icon;

  const handleCopy = async (content, index) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleStartEdit = (content, index) => {
    setEditingIndex(index);
    setEditedContent(content);
  };

  const handleSaveEdit = (index) => {
    if (onEdit) {
      onEdit(editedContent, index);
    }
    setEditingIndex(null);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-warm-600">Analyse en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
      {/* Réponse du prospect */}
      {prospectResponse && (
        <div className="p-4 bg-warm-50 border-b border-warm-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-warm-500" />
            </div>
            <div>
              <p className="text-xs text-warm-500 mb-1">Réponse du prospect</p>
              <p className="text-warm-800">"{prospectResponse}"</p>
            </div>
          </div>
        </div>
      )}

      {/* Analyse */}
      {analysis && (
        <div className="p-4 border-b border-warm-100">
          <h4 className="text-sm font-medium text-warm-700 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Analyse de la réponse
          </h4>

          <div className="grid grid-cols-2 gap-3">
            {/* Sentiment */}
            <div className={`${sentiment.bg} rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <SentimentIcon className={`w-4 h-4 ${sentiment.color}`} />
                <span className={`text-sm font-medium ${sentiment.color}`}>
                  {sentiment.label}
                </span>
              </div>
              <p className="text-xs text-warm-600">{sentiment.advice}</p>
            </div>

            {/* Approche suggérée */}
            <div className="bg-warm-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <ApproachIcon className={`w-4 h-4 ${approach.color}`} />
                <span className={`text-sm font-medium ${approach.color}`}>
                  {approach.label}
                </span>
              </div>
              <p className="text-xs text-warm-600">
                Stratégie recommandée
              </p>
            </div>
          </div>

          {/* Signaux détectés */}
          {(analysis.buyingSignals?.length > 0 || analysis.objections?.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.buyingSignals?.map((signal, idx) => (
                <span
                  key={`signal-${idx}`}
                  className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full"
                >
                  Signal: {signal.replace(/_/g, ' ')}
                </span>
              ))}
              {analysis.objections?.map((objection, idx) => (
                <span
                  key={`objection-${idx}`}
                  className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full"
                >
                  Objection: {objection.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-warm-700 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Suggestions de réponse
        </h4>

        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const isEditing = editingIndex === index;
            const isCopied = copiedIndex === index;

            return (
              <div
                key={index}
                className="border border-warm-200 rounded-xl overflow-hidden hover:border-brand-300 transition-colors"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-warm-50 border-b border-warm-100">
                  <span className="text-sm font-medium text-warm-700">
                    {suggestion.label || `Option ${index + 1}`}
                  </span>
                  <span className="text-xs text-warm-500 capitalize">
                    {suggestion.type || 'suggestion'}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4">
                  {isEditing ? (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full p-3 border border-warm-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                      rows={4}
                    />
                  ) : (
                    <p className="text-warm-700">{suggestion.content}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 py-2 bg-warm-50 border-t border-warm-100">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(index)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Enregistrer
                      </button>
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-3 py-2 text-warm-600 hover:text-warm-800 text-sm"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelect?.(suggestion.content, index)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Utiliser
                      </button>
                      <button
                        onClick={() => handleStartEdit(suggestion.content, index)}
                        className="p-2 text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopy(suggestion.content, index)}
                        className="p-2 text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                        title="Copier"
                      >
                        {isCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {suggestions.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-warm-500">Aucune suggestion disponible</p>
          </div>
        )}
      </div>
    </div>
  );
}
