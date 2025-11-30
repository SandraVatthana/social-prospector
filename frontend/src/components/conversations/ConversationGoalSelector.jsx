/**
 * Sélecteur d'objectif de conversation
 * Permet à l'utilisateur de choisir son objectif avant de démarrer une conversation
 */

import { useState } from 'react';
import { Phone, Link, MessageCircle, Users, ChevronRight, Target } from 'lucide-react';

const GOALS = [
  {
    id: 'call',
    icon: Phone,
    label: 'Obtenir un appel',
    description: 'Séquence pour proposer un call de 15-20 min',
    color: 'blue',
    stages: [
      { name: 'Ouverture', desc: 'Accroche + question ouverte' },
      { name: 'Transition', desc: 'Valeur + proposition de call' },
      { name: 'Relance', desc: 'Rappel sans pression' },
    ],
  },
  {
    id: 'link',
    icon: Link,
    label: 'Amener vers mon lien',
    description: 'Séquence pour diriger vers une page/ressource',
    color: 'green',
    stages: [
      { name: 'Teaser', desc: 'Accroche + teaser ressource' },
      { name: 'Partage', desc: 'Valeur + lien' },
      { name: 'Suivi', desc: 'Relance pour feedback' },
    ],
  },
  {
    id: 'qualify',
    icon: MessageCircle,
    label: 'Qualifier et orienter',
    description: 'Séquence pour comprendre le besoin',
    color: 'purple',
    stages: [
      { name: 'Question', desc: 'Comprendre leur situation' },
      { name: 'Creuser', desc: 'Approfondir le besoin' },
      { name: 'Proposer', desc: 'Solution sur-mesure' },
    ],
  },
  {
    id: 'network',
    icon: Users,
    label: 'Créer une relation',
    description: 'Séquence douce, pas de vente directe',
    color: 'amber',
    stages: [
      { name: 'Connexion', desc: 'Compliment + point commun' },
      { name: 'Valeur', desc: 'Partage désintéressé' },
      { name: 'Échange', desc: 'Call optionnel' },
    ],
  },
];

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    bgHover: 'hover:bg-blue-100',
    border: 'border-blue-200',
    borderSelected: 'border-blue-500',
    icon: 'bg-blue-100 text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-500',
  },
  green: {
    bg: 'bg-green-50',
    bgHover: 'hover:bg-green-100',
    border: 'border-green-200',
    borderSelected: 'border-green-500',
    icon: 'bg-green-100 text-green-600',
    badge: 'bg-green-100 text-green-700',
    ring: 'ring-green-500',
  },
  purple: {
    bg: 'bg-purple-50',
    bgHover: 'hover:bg-purple-100',
    border: 'border-purple-200',
    borderSelected: 'border-purple-500',
    icon: 'bg-purple-100 text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
    ring: 'ring-purple-500',
  },
  amber: {
    bg: 'bg-amber-50',
    bgHover: 'hover:bg-amber-100',
    border: 'border-amber-200',
    borderSelected: 'border-amber-500',
    icon: 'bg-amber-100 text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
    ring: 'ring-amber-500',
  },
};

export default function ConversationGoalSelector({ onSelect, selectedGoal, compact = false }) {
  const [hoveredGoal, setHoveredGoal] = useState(null);

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const colors = colorClasses[goal.color];
          const isSelected = selectedGoal === goal.id;

          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                ${colors.bg} ${colors.bgHover}
                ${isSelected ? `${colors.borderSelected} ring-2 ${colors.ring}` : colors.border}
              `}
            >
              <div className={`w-10 h-10 rounded-lg ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-medium text-warm-800 text-sm">{goal.label}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-brand-500" />
        <h3 className="font-semibold text-warm-800">Quel est ton objectif avec ce prospect ?</h3>
      </div>

      <div className="space-y-3">
        {GOALS.map((goal) => {
          const Icon = goal.icon;
          const colors = colorClasses[goal.color];
          const isSelected = selectedGoal === goal.id;
          const isHovered = hoveredGoal === goal.id;

          return (
            <button
              key={goal.id}
              onClick={() => onSelect(goal.id)}
              onMouseEnter={() => setHoveredGoal(goal.id)}
              onMouseLeave={() => setHoveredGoal(null)}
              className={`
                w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                ${colors.bg} ${colors.bgHover}
                ${isSelected ? `${colors.borderSelected} ring-2 ${colors.ring}` : colors.border}
              `}
            >
              <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-warm-800">{goal.label}</p>
                  {isSelected && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                      Sélectionné
                    </span>
                  )}
                </div>
                <p className="text-sm text-warm-500 mt-0.5">{goal.description}</p>

                {/* Aperçu des étapes */}
                {(isHovered || isSelected) && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-warm-500">
                    {goal.stages.map((stage, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className={`w-5 h-5 rounded-full ${colors.icon} flex items-center justify-center text-xs font-medium`}>
                          {idx + 1}
                        </span>
                        <span>{stage.name}</span>
                        {idx < goal.stages.length - 1 && <ChevronRight className="w-3 h-3" />}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <ChevronRight className={`w-5 h-5 text-warm-400 transition-transform ${isSelected ? 'text-warm-600' : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
