import { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  Target,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

/**
 * Composant affichant la séquence de prospection Instagram en 4 phases
 * Philosophie : PULL marketing, messages 100% humains
 */
export default function ProspectSequence({
  sequence,
  prospect,
  objective,
  mode,
  isLoading,
  onRegenerate,
  onModeChange,
}) {
  const [copiedElement, setCopiedElement] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState('day1');

  const copyToClipboard = async (text, elementId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedElement(elementId);
      setTimeout(() => setCopiedElement(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = (element) => {
    if (onRegenerate) {
      onRegenerate(element);
    }
  };

  const togglePhase = (phase) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-warm-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-brand-500 animate-pulse mx-auto mb-3" />
            <p className="text-warm-600 font-medium">Génération de ta séquence...</p>
            <p className="text-warm-400 text-sm mt-1">Philosophie Instagram native</p>
          </div>
        </div>
      </div>
    );
  }

  if (!sequence) {
    return null;
  }

  // Mode DM Direct
  if (mode === 'direct' && sequence.mode === 'direct') {
    return (
      <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">DM Direct</h3>
              <p className="text-white/80 text-sm">Pour prospects déjà chauds</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Message */}
          <div className="bg-warm-50 rounded-xl p-4 mb-4">
            <p className="text-warm-700 whitespace-pre-wrap">{sequence.message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(sequence.message, 'direct-dm')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition-colors"
            >
              {copiedElement === 'direct-dm' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier le message</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleRegenerate('first-dm')}
              className="p-2.5 text-warm-500 hover:text-brand-600 hover:bg-warm-100 rounded-xl transition-colors"
              title="Régénérer"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Tips */}
          {sequence.tips && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-700">
                  {sequence.tips.map((tip, i) => (
                    <p key={i} className="mb-1 last:mb-0">{tip}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Mode Séquence Complète
  return (
    <div className="bg-white rounded-2xl border border-warm-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-white">Séquence de prospection</h3>
              <p className="text-white/80 text-sm">@{prospect?.username}</p>
            </div>
          </div>
          {objective && (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
              <Target className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-medium">{objective.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Phases */}
      <div className="divide-y divide-warm-100">
        {/* JOUR 1 - Warm-up */}
        <PhaseCard
          phase="day1"
          title="JOUR 1"
          subtitle="Interaction publique"
          icon={Heart}
          color="pink"
          isExpanded={expandedPhase === 'day1'}
          onToggle={() => togglePhase('day1')}
        >
          <div className="space-y-4">
            {/* Action: Like */}
            <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center">
                <Heart className="w-4 h-4 text-pink-600" />
              </div>
              <span className="text-warm-700">Liker 2-3 posts récents</span>
            </div>

            {/* Action: Comment */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-warm-500 text-sm">
                <MessageCircle className="w-4 h-4" />
                <span>Commentaire suggéré :</span>
              </div>
              <div className="bg-warm-50 rounded-xl p-4">
                <p className="text-warm-700 whitespace-pre-wrap">
                  {sequence.day1?.actions?.find(a => a.type === 'comment')?.content || 'Commentaire non disponible'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(
                    sequence.day1?.actions?.find(a => a.type === 'comment')?.content || '',
                    'comment'
                  )}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-warm-100 text-warm-600 rounded-lg hover:bg-warm-200 transition-colors"
                >
                  {copiedElement === 'comment' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copié !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleRegenerate('comment')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-warm-500 hover:text-brand-600 hover:bg-warm-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Régénérer</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-warm-400 italic">
              Objectif : Elle voit ton nom, tu existes dans son radar.
            </div>
          </div>
        </PhaseCard>

        {/* JOUR 2 - Premier DM */}
        <PhaseCard
          phase="day2"
          title="JOUR 2"
          subtitle="Premier DM"
          icon={Send}
          color="brand"
          isExpanded={expandedPhase === 'day2'}
          onToggle={() => togglePhase('day2')}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warm-500 text-sm">
              <Send className="w-4 h-4" />
              <span>Message suggéré (100% humain, zéro pitch) :</span>
            </div>
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
              <p className="text-warm-700 whitespace-pre-wrap">{sequence.day2?.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(sequence.day2?.message || '', 'first-dm')}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                {copiedElement === 'first-dm' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le DM</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleRegenerate('first-dm')}
                className="flex items-center gap-2 px-3 py-2 text-warm-500 hover:text-brand-600 hover:bg-warm-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Régénérer</span>
              </button>
            </div>
            <div className="text-xs text-warm-400 italic">
              Objectif : Elle répond + elle va voir ton profil par curiosité.
            </div>
          </div>
        </PhaseCard>

        {/* JOUR 3-5 - Conversation */}
        <PhaseCard
          phase="day3_5"
          title="JOUR 3-5"
          subtitle="Si réponse positive"
          icon={MessageCircle}
          color="green"
          isExpanded={expandedPhase === 'day3_5'}
          onToggle={() => togglePhase('day3_5')}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warm-500 text-sm">
              <Lightbulb className="w-4 h-4" />
              <span>Conseils pour la suite :</span>
            </div>
            <ul className="space-y-2">
              {sequence.day3_5?.tips?.map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-warm-600 text-sm">{tip}</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-warm-400 italic">
              Objectif : Créer du lien, de la confiance, de la sympathie.
            </div>
          </div>
        </PhaseCard>

        {/* JOUR 5+ - Transition */}
        <PhaseCard
          phase="day5_plus"
          title="JOUR 5+"
          subtitle={`Transition — ${sequence.day5_plus?.objective?.name || 'Selon objectif'}`}
          icon={Target}
          color="purple"
          isExpanded={expandedPhase === 'day5_plus'}
          onToggle={() => togglePhase('day5_plus')}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-warm-500 text-sm">
              <Target className="w-4 h-4" />
              <span>Message de transition suggéré :</span>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <p className="text-warm-700 whitespace-pre-wrap">{sequence.day5_plus?.message}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(sequence.day5_plus?.message || '', 'transition')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                {copiedElement === 'transition' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleRegenerate('transition')}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-warm-500 hover:text-brand-600 hover:bg-warm-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Régénérer</span>
              </button>
            </div>
            <div className="text-xs text-warm-400 italic">
              Seulement après avoir établi la confiance !
            </div>
          </div>
        </PhaseCard>
      </div>
    </div>
  );
}

/**
 * Composant pour une phase de la séquence
 */
function PhaseCard({ phase, title, subtitle, icon: Icon, color, isExpanded, onToggle, children }) {
  const colorClasses = {
    pink: {
      bg: 'bg-pink-100',
      icon: 'text-pink-600',
      border: 'border-pink-200',
    },
    brand: {
      bg: 'bg-brand-100',
      icon: 'text-brand-600',
      border: 'border-brand-200',
    },
    green: {
      bg: 'bg-green-100',
      icon: 'text-green-600',
      border: 'border-green-200',
    },
    purple: {
      bg: 'bg-purple-100',
      icon: 'text-purple-600',
      border: 'border-purple-200',
    },
  };

  const colors = colorClasses[color] || colorClasses.brand;

  return (
    <div className="group">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.icon}`} />
          </div>
          <div className="text-left">
            <h4 className="font-display font-semibold text-warm-800">{title}</h4>
            <p className="text-warm-500 text-sm">{subtitle}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-warm-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-warm-400" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className={`p-4 rounded-xl border ${colors.border} bg-white`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Toggle pour choisir le mode de séquence
 */
export function SequenceModeToggle({ mode, onChange, disabled }) {
  return (
    <div className="flex items-center gap-2 p-1 bg-warm-100 rounded-xl">
      <button
        onClick={() => onChange('full')}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'full'
            ? 'bg-white text-brand-600 shadow-sm'
            : 'text-warm-500 hover:text-warm-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Calendar className="w-4 h-4" />
        <span>Séquence complète</span>
      </button>
      <button
        onClick={() => onChange('direct')}
        disabled={disabled}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          mode === 'direct'
            ? 'bg-white text-brand-600 shadow-sm'
            : 'text-warm-500 hover:text-warm-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Send className="w-4 h-4" />
        <span>DM direct</span>
      </button>
    </div>
  );
}

/**
 * Sélecteur d'objectif
 */
export function ObjectiveSelector({ objectives, selected, onChange, disabled }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-warm-600">Objectif de la prospection</label>
      <div className="grid grid-cols-2 gap-2">
        {objectives.map((obj) => (
          <button
            key={obj.id}
            onClick={() => onChange(obj.id)}
            disabled={disabled}
            className={`p-3 rounded-xl border text-left transition-all ${
              selected === obj.id
                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
                : 'border-warm-200 hover:border-brand-300 hover:bg-warm-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="font-medium text-warm-800 text-sm">{obj.name}</div>
            <div className="text-warm-500 text-xs mt-0.5">{obj.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
