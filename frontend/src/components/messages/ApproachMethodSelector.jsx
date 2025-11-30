import { useState } from 'react';
import { Target, ArrowRight, Copy, BookOpen, Lightbulb, ChevronDown, ChevronUp, Info } from 'lucide-react';

/**
 * Configuration des méthodes d'approche
 */
const APPROACH_METHODS = {
  mini_aida: {
    id: 'mini_aida',
    name: 'Mini-AIDA',
    description: 'Accroche → Intérêt → Désir → Action',
    shortDescription: 'Structure classique et efficace',
    icon: Target,
    color: 'brand',
    structure: [
      { label: 'Attention', desc: 'Accroche liée à un post / détail perso' },
      { label: 'Interest', desc: 'Mini-histoire / constat' },
      { label: 'Desire', desc: 'Résultat souhaité' },
      { label: 'Action', desc: 'Question simple' },
    ],
  },
  avant_apres: {
    id: 'avant_apres',
    name: 'Avant/Après',
    description: 'Situation → Déclic → Résultat',
    shortDescription: 'Montre la transformation possible',
    icon: ArrowRight,
    color: 'accent',
    structure: [
      { label: 'Avant', desc: 'Situation actuelle du prospect' },
      { label: 'Déclic', desc: 'Insight ou changement' },
      { label: 'Après', desc: 'Résultat possible' },
      { label: 'Question', desc: 'Proposition concrète' },
    ],
  },
  miroir: {
    id: 'miroir',
    name: 'Miroir',
    description: 'Reformuler → Valider → Proposer',
    shortDescription: 'Empathie et validation',
    icon: Copy,
    color: 'green',
    structure: [
      { label: 'Miroir', desc: 'Reformuler ce que la personne vit' },
      { label: 'Validation', desc: 'Montrer que c\'est normal' },
      { label: 'Proposition', desc: 'Aide concrète' },
      { label: 'Question', desc: 'Offre spécifique' },
    ],
  },
  story_seed: {
    id: 'story_seed',
    name: 'Story Seed',
    description: 'Micro-histoire → Lien → Question',
    shortDescription: 'Anecdote qui crée la connexion',
    icon: BookOpen,
    color: 'amber',
    structure: [
      { label: 'Histoire', desc: 'Micro-anecdote (2 phrases max)' },
      { label: 'Lien', desc: 'Connexion avec son cas' },
      { label: 'Question', desc: 'Partager quelque chose de concret' },
    ],
  },
};

const colorClasses = {
  brand: {
    bg: 'bg-brand-50',
    border: 'border-brand-200',
    borderActive: 'border-brand-500',
    ring: 'ring-brand-500',
    icon: 'text-brand-600',
    iconBg: 'bg-brand-100',
  },
  accent: {
    bg: 'bg-accent-50',
    border: 'border-accent-200',
    borderActive: 'border-accent-500',
    ring: 'ring-accent-500',
    icon: 'text-accent-600',
    iconBg: 'bg-accent-100',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    borderActive: 'border-green-500',
    ring: 'ring-green-500',
    icon: 'text-green-600',
    iconBg: 'bg-green-100',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    borderActive: 'border-amber-500',
    ring: 'ring-amber-500',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
};

/**
 * Carte d'une méthode d'approche
 */
function MethodCard({ method, isSelected, onClick, recommendation, stats }) {
  const [showDetails, setShowDetails] = useState(false);
  const Icon = method.icon;
  const colors = colorClasses[method.color];
  const isRecommended = recommendation?.method === method.id;

  return (
    <div
      className={`relative rounded-xl border-2 transition-all cursor-pointer ${
        isSelected
          ? `${colors.borderActive} ${colors.bg} ring-2 ${colors.ring}`
          : `border-warm-200 hover:border-warm-300 bg-white`
      }`}
      onClick={onClick}
    >
      {/* Badge recommandé */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-brand-500 to-accent-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          Recommandé
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg}`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-warm-900">{method.name}</h4>
              {stats && stats.response_rate !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  stats.response_rate >= 20 ? 'bg-green-100 text-green-700' :
                  stats.response_rate >= 10 ? 'bg-amber-100 text-amber-700' :
                  'bg-warm-100 text-warm-600'
                }`}>
                  {stats.response_rate.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-sm text-warm-500">{method.description}</p>
          </div>

          {/* Radio button */}
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            isSelected ? `${colors.borderActive}` : 'border-warm-300'
          }`}>
            {isSelected && (
              <div className={`w-2.5 h-2.5 rounded-full ${colors.iconBg.replace('bg-', 'bg-').replace('-100', '-500')}`} />
            )}
          </div>
        </div>

        {/* Structure preview */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="mt-3 flex items-center gap-1 text-xs text-warm-400 hover:text-warm-600 transition-colors"
        >
          <Info className="w-3 h-3" />
          {showDetails ? 'Masquer' : 'Voir'} la structure
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Structure details */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-warm-100 space-y-2">
            {method.structure.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className={`w-5 h-5 rounded flex items-center justify-center font-medium ${colors.iconBg} ${colors.icon}`}>
                  {i + 1}
                </span>
                <div>
                  <span className="font-medium text-warm-700">{step.label}</span>
                  <span className="text-warm-500"> : {step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sélecteur de méthode d'approche
 */
export default function ApproachMethodSelector({
  selectedMethod,
  onSelect,
  recommendation = null,
  stats = {},
  compact = false,
}) {
  const methods = Object.values(APPROACH_METHODS);

  if (compact) {
    // Version compacte (dropdown)
    return (
      <div className="relative">
        <label className="block text-sm font-medium text-warm-700 mb-1.5">
          Méthode d'approche
        </label>
        <div className="relative">
          <select
            value={selectedMethod}
            onChange={(e) => onSelect(e.target.value)}
            className="w-full appearance-none bg-white border border-warm-200 rounded-lg px-4 py-2.5 pr-10 text-warm-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          >
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name} - {method.shortDescription}
                {recommendation?.method === method.id ? ' ★' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400 pointer-events-none" />
        </div>
        {recommendation && (
          <p className="mt-1.5 text-xs text-warm-500 flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            {recommendation.reason}
          </p>
        )}
      </div>
    );
  }

  // Version complète (cartes)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-warm-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-500" />
          Choisis ta méthode d'approche
        </h3>
        {recommendation && (
          <div className="flex items-center gap-1.5 text-xs text-warm-500 bg-warm-50 px-2 py-1 rounded-lg">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            <span>{recommendation.reason}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {methods.map((method) => (
          <MethodCard
            key={method.id}
            method={method}
            isSelected={selectedMethod === method.id}
            onClick={() => onSelect(method.id)}
            recommendation={recommendation}
            stats={stats[method.id]}
          />
        ))}
      </div>
    </div>
  );
}

// Export des méthodes pour utilisation ailleurs
export { APPROACH_METHODS };
