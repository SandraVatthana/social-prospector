import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import ProspectSequence, { SequenceModeToggle, ObjectiveSelector } from './ProspectSequence';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

/**
 * Objectifs disponibles
 */
const OBJECTIVES = [
  {
    id: 'network',
    name: 'Créer une relation',
    description: 'Connexion authentique, pas de pitch',
  },
  {
    id: 'understand',
    name: 'Comprendre ses besoins',
    description: 'Écouter et creuser ses défis',
  },
  {
    id: 'service',
    name: 'Proposer un service',
    description: 'Mentionner ton offre naturellement',
  },
  {
    id: 'call',
    name: 'Obtenir un appel',
    description: 'Proposer un échange visio',
  },
];

/**
 * Modal de génération de séquence de prospection Instagram
 */
export default function SequenceModal({ isOpen, onClose, prospect }) {
  const [mode, setMode] = useState('full'); // 'full' | 'direct'
  const [objective, setObjective] = useState('network');
  const [sequence, setSequence] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Générer la séquence quand le modal s'ouvre ou que les options changent
  useEffect(() => {
    if (isOpen && prospect) {
      generateSequence();
    }
  }, [isOpen, prospect?.username, mode, objective]);

  const generateSequence = async () => {
    if (!prospect) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sequence/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prospect: {
            username: prospect.username,
            bio: prospect.bio,
            platform: prospect.platform || 'instagram',
            followers_count: prospect.followers || prospect.followersCount,
            recentPost: prospect.recentPosts?.[0]?.caption || prospect.lastPostCaption,
          },
          objective,
          mode,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      setSequence(data.data?.sequence || data.sequence);
    } catch (err) {
      console.error('Error generating sequence:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (element) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/sequence/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          prospect: {
            username: prospect.username,
            bio: prospect.bio,
            platform: prospect.platform || 'instagram',
            followers_count: prospect.followers || prospect.followersCount,
            recentPost: prospect.recentPosts?.[0]?.caption || prospect.lastPostCaption,
          },
          element,
          objective,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la régénération');
      }

      const data = await response.json();
      const result = data.data || data;

      // Mettre à jour l'élément dans la séquence
      if (mode === 'direct') {
        if (result.first_dm) {
          setSequence(prev => ({
            ...prev,
            message: result.first_dm.message,
            metadata: result.first_dm,
          }));
        }
      } else {
        setSequence(prev => {
          const updated = { ...prev };
          if (element === 'comment' && result.comment) {
            updated.day1 = {
              ...updated.day1,
              actions: updated.day1.actions.map(a =>
                a.type === 'comment' ? { ...a, content: result.comment.comment, metadata: result.comment } : a
              ),
            };
          } else if (element === 'first-dm' && result.first_dm) {
            updated.day2 = {
              ...updated.day2,
              message: result.first_dm.message,
              metadata: result.first_dm,
            };
          } else if (element === 'transition' && result.transition) {
            updated.day5_plus = {
              ...updated.day5_plus,
              message: result.transition.message,
              metadata: result.transition,
            };
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Error regenerating:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-warm-50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-warm-800">
                Séquence Instagram
              </h2>
              <p className="text-warm-500 text-sm">@{prospect?.username}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 bg-white border-b border-warm-200 space-y-4">
          {/* Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-warm-600">Mode de prospection</label>
            <SequenceModeToggle
              mode={mode}
              onChange={setMode}
              disabled={isLoading}
            />
            <p className="text-xs text-warm-400">
              {mode === 'full'
                ? 'Recommandé : Commentaire public + DM après 24h + Suivi'
                : 'Pour prospects déjà "chauds" (ont interagi avec toi)'}
            </p>
          </div>

          {/* Objective Selector */}
          <ObjectiveSelector
            objectives={OBJECTIVES}
            selected={objective}
            onChange={setObjective}
            disabled={isLoading}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-700">Erreur</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          <ProspectSequence
            sequence={sequence}
            prospect={prospect}
            objective={OBJECTIVES.find(o => o.id === objective)}
            mode={mode}
            isLoading={isLoading}
            onRegenerate={handleRegenerate}
          />
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-warm-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-warm-400 max-w-md">
              Philosophie Instagram : Messages 100% humains, zéro pitch dans le premier contact.
              Le but est d'intriguer, pas de vendre.
            </p>
            <button
              onClick={generateSequence}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tout régénérer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
