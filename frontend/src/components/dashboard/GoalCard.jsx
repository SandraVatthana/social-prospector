import { useState } from 'react';
import { Target, Pencil, Check, X } from 'lucide-react';

/**
 * Carte "Objectif du mois" avec barres de progression
 * - Réponses obtenues vs objectif
 * - RDV décrochés vs objectif
 * - Mode édition pour modifier les objectifs
 */
export default function GoalCard({
  goalResponses = 20,
  goalMeetings = 5,
  currentResponses = 0,
  currentMeetings = 0,
  onSaveGoals,
  loading = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editResponses, setEditResponses] = useState(goalResponses);
  const [editMeetings, setEditMeetings] = useState(goalMeetings);

  const responsesPercent = goalResponses > 0 ? Math.min(100, Math.round((currentResponses / goalResponses) * 100)) : 0;
  const meetingsPercent = goalMeetings > 0 ? Math.min(100, Math.round((currentMeetings / goalMeetings) * 100)) : 0;

  const handleSave = async () => {
    if (onSaveGoals) {
      await onSaveGoals({
        monthly_goal_responses: editResponses,
        monthly_goal_meetings: editMeetings,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditResponses(goalResponses);
    setEditMeetings(goalMeetings);
    setIsEditing(false);
  };

  const getProgressColor = (percent) => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 70) return 'bg-brand-500';
    if (percent >= 40) return 'bg-amber-500';
    return 'bg-warm-300';
  };

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
            <Target className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h3 className="font-semibold text-warm-900">Objectif du mois</h3>
            <p className="text-xs text-warm-500">
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-warm-100 rounded-lg transition-colors text-warm-400 hover:text-warm-600"
            title="Modifier les objectifs"
          >
            <Pencil className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors text-warm-400 hover:text-warm-600"
              title="Annuler"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors text-green-500 hover:text-green-600 disabled:opacity-50"
              title="Sauvegarder"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Barres de progression */}
      <div className="space-y-4">
        {/* Réponses */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-warm-600 font-medium">Réponses obtenues</span>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-warm-900 font-semibold">{currentResponses}</span>
                <span className="text-warm-400">/</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editResponses}
                  onChange={(e) => setEditResponses(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-0.5 text-right text-sm border border-warm-200 rounded-lg focus:border-brand-500 focus:ring-0 outline-none"
                />
              </div>
            ) : (
              <span className="font-semibold text-warm-900">
                {currentResponses} / {goalResponses}
              </span>
            )}
          </div>
          <div className="h-2.5 bg-warm-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(responsesPercent)}`}
              style={{ width: `${responsesPercent}%` }}
            />
          </div>
          <p className="text-xs text-warm-400 mt-1">{responsesPercent}% de l'objectif</p>
        </div>

        {/* RDV */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-warm-600 font-medium">RDV obtenus</span>
            {isEditing ? (
              <div className="flex items-center gap-1">
                <span className="text-warm-900 font-semibold">{currentMeetings}</span>
                <span className="text-warm-400">/</span>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={editMeetings}
                  onChange={(e) => setEditMeetings(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-0.5 text-right text-sm border border-warm-200 rounded-lg focus:border-brand-500 focus:ring-0 outline-none"
                />
              </div>
            ) : (
              <span className="font-semibold text-warm-900">
                {currentMeetings} / {goalMeetings}
              </span>
            )}
          </div>
          <div className="h-2.5 bg-warm-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(meetingsPercent)}`}
              style={{ width: `${meetingsPercent}%` }}
            />
          </div>
          <p className="text-xs text-warm-400 mt-1">{meetingsPercent}% de l'objectif</p>
        </div>
      </div>

      {/* Message motivation */}
      {(responsesPercent >= 100 || meetingsPercent >= 100) && (
        <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl">
          <p className="text-sm text-green-700 font-medium">
            {responsesPercent >= 100 && meetingsPercent >= 100
              ? 'Bravo ! Tous les objectifs du mois sont atteints !'
              : responsesPercent >= 100
              ? 'Objectif réponses atteint ! Continue sur ta lancée !'
              : 'Objectif RDV atteint ! Excellente prospection !'}
          </p>
        </div>
      )}
    </div>
  );
}
