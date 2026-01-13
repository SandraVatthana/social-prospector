import { Check, Sparkles, Zap } from 'lucide-react';

/**
 * Carte de plan tarifaire
 */
export default function PricingCard({
  plan,
  currentPlan,
  onSelect,
  loading,
  billingInterval = 'monthly', // 'monthly' | 'yearly'
}) {
  const isCurrentPlan = currentPlan === plan.id;
  const isUpgrade = getPlanOrder(plan.id) > getPlanOrder(currentPlan);
  const isDowngrade = getPlanOrder(plan.id) < getPlanOrder(currentPlan);

  // Prix annuel avec réduction
  const yearlyPrice = Math.round(plan.price * 12 * 0.8); // -20%
  const displayPrice = billingInterval === 'yearly' ? Math.round(yearlyPrice / 12) : plan.price;
  const savings = billingInterval === 'yearly' ? Math.round(plan.price * 12 - yearlyPrice) : 0;

  return (
    <div
      className={`relative rounded-2xl border-2 transition-all ${
        plan.popular
          ? 'border-brand-500 shadow-xl shadow-brand-500/10 scale-105'
          : isCurrentPlan
          ? 'border-green-500 bg-green-50/50'
          : 'border-warm-200 hover:border-warm-300'
      }`}
    >
      {/* Badge populaire */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-full">
            <Sparkles className="w-3 h-3" />
            POPULAIRE
          </span>
        </div>
      )}

      {/* Badge plan actuel */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            <Check className="w-3 h-3" />
            PLAN ACTUEL
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="font-display font-bold text-xl text-warm-900 mb-2">
            {plan.name}
          </h3>
          
          <div className="flex items-baseline justify-center gap-1">
            {plan.price === 0 ? (
              <span className="text-4xl font-bold text-warm-900">Gratuit</span>
            ) : (
              <>
                <span className="text-4xl font-bold text-warm-900">{displayPrice}€</span>
                <span className="text-warm-500">/mois</span>
              </>
            )}
          </div>

          {savings > 0 && plan.price > 0 && (
            <p className="text-sm text-green-600 mt-1">
              Économisez {savings}€/an
            </p>
          )}
        </div>

        {/* Limites principales */}
        <div className="bg-warm-50 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-warm-900">
                {plan.limits.prospects_par_mois === -1 ? '∞*' : plan.limits.prospects_par_mois}
              </p>
              <p className="text-xs text-warm-500">prospects/mois</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-900">
                {plan.limits.voix === -1 ? '∞*' : plan.limits.voix}
              </p>
              <p className="text-xs text-warm-500">profils MA VOIX</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-900">
                {plan.limits.comptes_sociaux === -1 ? '∞*' : plan.limits.comptes_sociaux}
              </p>
              <p className="text-xs text-warm-500">comptes sociaux</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warm-900">
                {plan.limits.prospects_par_jour === -1 ? '∞*' : plan.limits.prospects_par_jour}
              </p>
              <p className="text-xs text-warm-500">/jour</p>
            </div>
          </div>

          {/* Note Fair Use pour Agency+ */}
          {plan.id === 'agency_plus' && (
            <p className="text-xs text-warm-400 mt-3 text-center">
              *Fair use : jusqu'à 10 000/mois.{' '}
              <a href="mailto:contact@socialprospection.com" className="text-brand-500 hover:underline">
                Besoin de plus ?
              </a>
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-warm-700">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={() => onSelect(plan.id)}
          disabled={isCurrentPlan || loading}
          className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
            isCurrentPlan
              ? 'bg-green-100 text-green-700 cursor-default'
              : plan.popular
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/25'
              : isUpgrade
              ? 'bg-warm-900 hover:bg-warm-800 text-white'
              : 'bg-warm-100 hover:bg-warm-200 text-warm-700'
          }`}
        >
          {loading ? (
            <span className="animate-pulse">Chargement...</span>
          ) : isCurrentPlan ? (
            <>
              <Check className="w-4 h-4" />
              Plan actuel
            </>
          ) : isUpgrade ? (
            <>
              <Zap className="w-4 h-4" />
              Passer à {plan.name}
            </>
          ) : isDowngrade ? (
            'Rétrograder'
          ) : (
            'Sélectionner'
          )}
        </button>
      </div>
    </div>
  );
}

// Helper pour déterminer l'ordre des plans
function getPlanOrder(planId) {
  const order = { free: 0, solo: 1, agence: 2, agency_plus: 3 };
  return order[planId] ?? 0;
}
