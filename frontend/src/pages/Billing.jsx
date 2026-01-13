import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Sparkles,
  Users,
  Mic2,
  Search,
  BarChart3,
  Zap,
  Check,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import Header from '../components/layout/Header';
import { PricingCard, UsageBar, SubscriptionManager } from '../components/billing';
import { api } from '../lib/api';

export default function Billing() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [billingStatus, setBillingStatus] = useState(null);
  const [usage, setUsage] = useState(null);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [showSuccess, setShowSuccess] = useState(false);

  // Vérifier si on revient d'un checkout réussi
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    }
  }, [searchParams]);

  // Charger les données
  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, statusRes, usageRes] = await Promise.all([
        api.getBillingPlans(),
        api.getBillingStatus(),
        api.getBillingUsage(),
      ]);

      setPlans(plansRes.data || []);
      setBillingStatus(statusRes.data);
      setUsage(usageRes.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sélectionner un plan
  const handleSelectPlan = async (planId) => {
    if (planId === 'free' || planId === billingStatus?.plan?.id) {
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await api.createCheckout(planId);
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      alert('Erreur lors de la création du checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const currentPlan = billingStatus?.plan?.id || 'free';

  return (
    <>
      <Header
        title="Abonnement"
        subtitle="Gérez votre plan et votre facturation"
        action={
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-white border border-warm-200 hover:border-warm-300 text-warm-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="p-6 lg:p-8 space-y-8">
        {/* Message de succès */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Paiement réussi !</p>
              <p className="text-sm text-green-700">
                Votre abonnement est maintenant actif. Merci de votre confiance !
              </p>
            </div>
          </div>
        )}

        {/* Section abonnement actuel + usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gestion abonnement */}
          <SubscriptionManager
            subscription={billingStatus?.subscription}
            plan={billingStatus?.plan}
            onRefresh={fetchData}
          />

          {/* Usage */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-accent-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Utilisation
                </h3>
                <p className="text-sm text-warm-500">
                  Ce mois-ci
                </p>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-warm-100 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                <UsageBar
                  label="Prospects ce mois"
                  used={usage?.usage?.prospects_ce_mois?.used || 0}
                  limit={usage?.usage?.prospects_ce_mois?.limit || 0}
                  icon={Users}
                />
                <UsageBar
                  label="Prospects aujourd'hui"
                  used={usage?.usage?.prospects_aujourdhui?.used || 0}
                  limit={usage?.usage?.prospects_aujourdhui?.limit || 0}
                  icon={Search}
                />
                <UsageBar
                  label="Profils MA VOIX"
                  used={usage?.usage?.profils_voix?.used || 0}
                  limit={usage?.usage?.profils_voix?.limit || 0}
                  icon={Mic2}
                  color="green"
                />
              </div>
            )}
          </div>
        </div>

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium ${billingInterval === 'monthly' ? 'text-warm-900' : 'text-warm-500'}`}>
            Mensuel
          </span>
          <button
            onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingInterval === 'yearly' ? 'bg-brand-500' : 'bg-warm-300'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                billingInterval === 'yearly' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${billingInterval === 'yearly' ? 'text-warm-900' : 'text-warm-500'}`}>
            Annuel
          </span>
          {billingInterval === 'yearly' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              -20%
            </span>
          )}
        </div>

        {/* Grille de plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {loading ? (
            [1, 2, 3, 4].map(i => (
              <div key={i} className="h-[500px] bg-warm-100 rounded-2xl animate-pulse" />
            ))
          ) : (
            plans.map(plan => (
              <PricingCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                onSelect={handleSelectPlan}
                loading={checkoutLoading}
                billingInterval={billingInterval}
              />
            ))
          )}
        </div>

        {/* FAQ rapide */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-warm-400" />
            <h3 className="font-display font-semibold text-warm-900">
              Questions fréquentes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-warm-900 mb-2">
                Puis-je changer de plan à tout moment ?
              </h4>
              <p className="text-sm text-warm-600">
                Oui ! Vous pouvez upgrader immédiatement et la différence sera proratisée. 
                Pour un downgrade, il prendra effet à la prochaine période de facturation.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-warm-900 mb-2">
                Comment fonctionne l'annulation ?
              </h4>
              <p className="text-sm text-warm-600">
                Vous pouvez annuler à tout moment. Votre accès reste actif jusqu'à la fin 
                de la période déjà payée, puis vous passez au plan gratuit.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-warm-900 mb-2">
                Que se passe-t-il si je dépasse mes limites ?
              </h4>
              <p className="text-sm text-warm-600">
                Vous ne serez pas facturé de supplément. Vous devrez simplement attendre 
                le renouvellement de vos quotas ou upgrader votre plan.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-warm-900 mb-2">
                Proposez-vous des remboursements ?
              </h4>
              <p className="text-sm text-warm-600">
                Oui, nous offrons un remboursement complet dans les 14 jours suivant votre 
                premier paiement si le produit ne vous convient pas.
              </p>
            </div>
          </div>
        </div>

        {/* CTA final */}
        <div className="card p-8 bg-gradient-to-br from-brand-500 to-accent-500 text-white text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="font-display text-2xl font-bold mb-2">
            Besoin d'un plan personnalisé ?
          </h2>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Pour les équipes avec des besoins spécifiques ou des volumes importants, 
            contactez-nous pour un devis sur mesure.
          </p>
          <a
            href="mailto:contact@sosprospection.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-600 font-semibold rounded-xl hover:bg-warm-50 transition-colors"
          >
            <Zap className="w-4 h-4" />
            Nous contacter
          </a>
        </div>
      </div>
    </>
  );
}
