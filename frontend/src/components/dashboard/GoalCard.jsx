import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Pencil, Check, X, Lightbulb, Send, MessageSquare, Flame, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Carte "Objectif du mois" transformée en Mini Coach
 * - Barres de progression avec pourcentage
 * - Suggestions d'actions concrètes pour atteindre les objectifs
 * - Messages motivants contextuels
 */
export default function GoalCard({
  goalResponses = 20,
  goalMeetings = 5,
  currentResponses = 0,
  currentMeetings = 0,
  onSaveGoals,
  loading = false,
}) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editResponses, setEditResponses] = useState(goalResponses);
  const [editMeetings, setEditMeetings] = useState(goalMeetings);

  const responsesPercent = goalResponses > 0 ? Math.min(100, Math.round((currentResponses / goalResponses) * 100)) : 0;
  const meetingsPercent = goalMeetings > 0 ? Math.min(100, Math.round((currentMeetings / goalMeetings) * 100)) : 0;

  // Calculs pour les suggestions du coach
  const responsesRemaining = Math.max(0, goalResponses - currentResponses);
  const meetingsRemaining = Math.max(0, goalMeetings - currentMeetings);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;

  // Générer la suggestion du coach
  const getCoachSuggestion = () => {
    // Objectifs atteints
    if (responsesPercent >= 100 && meetingsPercent >= 100) {
      return {
        icon: Sparkles,
        message: 'Tous tes objectifs sont atteints ! Augmente-les pour viser plus haut.',
        action: null,
        color: 'green',
      };
    }

    // Calcul du rythme nécessaire
    if (daysRemaining > 0 && responsesRemaining > 0) {
      const dmsPerDay = Math.ceil((responsesRemaining * 10) / daysRemaining); // 10 DMs = 1 réponse estimée

      if (responsesPercent < 30) {
        return {
          icon: Send,
          message: `Envoie ${Math.min(10, dmsPerDay)} DMs aujourd'hui pour te rapprocher de ton objectif`,
          action: { label: 'Générer des messages', route: '/messages' },
          color: 'brand',
        };
      }

      if (responsesPercent < 70) {
        return {
          icon: Flame,
          message: `Tu es sur la bonne voie ! ${responsesRemaining} réponses à obtenir en ${daysRemaining} jours`,
          action: { label: 'Relancer tes prospects', route: '/prospects?status=contacted' },
          color: 'accent',
        };
      }

      return {
        icon: MessageSquare,
        message: `Plus que ${responsesRemaining} réponse${responsesRemaining > 1 ? 's' : ''} ! Relance tes prospects chauds`,
        action: { label: 'Voir les prospects chauds', route: '/prospects?status=replied' },
        color: 'purple',
      };
    }

    // Par défaut
    return {
      icon: Lightbulb,
      message: 'Configure tes objectifs pour recevoir des conseils personnalisés',
      action: null,
      color: 'warm',
    };
  };

  const coachSuggestion = getCoachSuggestion();

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

  const getProgressGradient = (percent) => {
    if (percent >= 100) return 'from-green-400 to-green-600';
    if (percent >= 70) return 'from-brand-400 to-brand-600';
    if (percent >= 40) return 'from-amber-400 to-amber-600';
    return 'from-warm-300 to-warm-400';
  };

  const CoachIcon = coachSuggestion.icon;

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-warm-900">Mon objectif du mois</h3>
              <p className="text-xs text-warm-500">
                {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })} • {daysRemaining} jours restants
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

        {/* Barres de progression améliorées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Réponses */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-600 font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-500" />
                Réponses obtenues
              </span>
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
                <span className="font-bold text-warm-900 text-lg">
                  {currentResponses}<span className="text-warm-400 font-normal text-sm">/{goalResponses}</span>
                </span>
              )}
            </div>
            <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getProgressGradient(responsesPercent)}`}
                style={{ width: `${responsesPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-warm-400">{responsesPercent}% atteint</p>
              {responsesRemaining > 0 && (
                <p className="text-xs text-brand-600 font-medium">-{responsesRemaining} restantes</p>
              )}
            </div>
          </div>

          {/* RDV */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-warm-600 font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-accent-500" />
                RDV décrochés
              </span>
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
                <span className="font-bold text-warm-900 text-lg">
                  {currentMeetings}<span className="text-warm-400 font-normal text-sm">/{goalMeetings}</span>
                </span>
              )}
            </div>
            <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getProgressGradient(meetingsPercent)}`}
                style={{ width: `${meetingsPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs text-warm-400">{meetingsPercent}% atteint</p>
              {meetingsRemaining > 0 && (
                <p className="text-xs text-accent-600 font-medium">-{meetingsRemaining} restants</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Coach - Suggestion d'action */}
      <div className={`px-6 py-4 border-t border-warm-100 ${
        coachSuggestion.color === 'green'
          ? 'bg-gradient-to-r from-green-50 to-emerald-50'
          : 'bg-gradient-to-r from-brand-50/50 to-accent-50/50'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
            coachSuggestion.color === 'green'
              ? 'bg-green-500'
              : coachSuggestion.color === 'brand'
              ? 'bg-brand-500'
              : coachSuggestion.color === 'accent'
              ? 'bg-accent-500'
              : coachSuggestion.color === 'purple'
              ? 'bg-purple-500'
              : 'bg-warm-500'
          }`}>
            <CoachIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-warm-700 font-medium flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Conseil du coach
            </p>
            <p className="text-sm text-warm-600 mt-0.5">{coachSuggestion.message}</p>
          </div>
          {coachSuggestion.action && (
            <button
              onClick={() => navigate(coachSuggestion.action.route)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-warm-50 border border-warm-200 hover:border-brand-300 rounded-lg text-sm font-medium text-warm-700 hover:text-brand-600 transition-all flex-shrink-0"
            >
              {coachSuggestion.action.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Message motivation pour objectifs atteints */}
      {(responsesPercent >= 100 || meetingsPercent >= 100) && (
        <div className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500">
          <p className="text-sm text-white font-medium text-center flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            {responsesPercent >= 100 && meetingsPercent >= 100
              ? 'Bravo ! Tous tes objectifs du mois sont atteints !'
              : responsesPercent >= 100
              ? 'Objectif réponses atteint ! Continue sur ta lancée !'
              : 'Objectif RDV atteint ! Excellente prospection !'}
            <Sparkles className="w-4 h-4" />
          </p>
        </div>
      )}
    </div>
  );
}
