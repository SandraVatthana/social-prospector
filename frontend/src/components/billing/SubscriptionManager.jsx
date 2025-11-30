import { useState } from 'react';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  XCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { api } from '../../lib/api';

/**
 * Panneau de gestion de l'abonnement actuel
 */
export default function SubscriptionManager({ subscription, plan, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null); // 'cancel' | 'resume' | 'portal'

  const handleCancel = async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Vous conserverez l\'accès jusqu\'à la fin de la période payée.')) {
      return;
    }

    setLoading(true);
    setAction('cancel');
    try {
      await api.cancelSubscription();
      onRefresh?.();
    } catch (error) {
      console.error('Error cancelling:', error);
      alert('Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleResume = async () => {
    setLoading(true);
    setAction('resume');
    try {
      await api.resumeSubscription();
      onRefresh?.();
    } catch (error) {
      console.error('Error resuming:', error);
      alert('Erreur lors de la réactivation');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handlePortal = async () => {
    setLoading(true);
    setAction('portal');
    try {
      const response = await api.getCustomerPortal();
      window.open(response.data.portal_url, '_blank');
    } catch (error) {
      console.error('Error getting portal:', error);
      alert('Erreur lors de l\'accès au portail');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  // Statut de l'abonnement
  const statusConfig = {
    active: { label: 'Actif', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    on_trial: { label: 'Période d\'essai', color: 'bg-blue-100 text-blue-700', icon: Calendar },
    cancelled: { label: 'Annulé', color: 'bg-amber-100 text-amber-700', icon: XCircle },
    past_due: { label: 'Paiement en retard', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    expired: { label: 'Expiré', color: 'bg-warm-100 text-warm-600', icon: XCircle },
    none: { label: 'Aucun', color: 'bg-warm-100 text-warm-600', icon: null },
  };

  const status = statusConfig[subscription?.status] || statusConfig.none;
  const StatusIcon = status.icon;

  // Si pas d'abonnement payant
  if (!subscription?.id || subscription.status === 'none') {
    return (
      <div className="card p-6 bg-warm-50 border-warm-200">
        <div className="text-center py-4">
          <p className="text-warm-600 mb-2">Vous êtes sur le plan gratuit</p>
          <p className="text-sm text-warm-500">
            Passez à un plan payant pour débloquer plus de fonctionnalités
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-warm-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-warm-900">
                Plan {plan?.name}
              </h3>
              <p className="text-sm text-warm-500">
                {plan?.price}€/mois
              </p>
            </div>
          </div>

          {/* Badge statut */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${status.color}`}>
            {StatusIcon && <StatusIcon className="w-4 h-4" />}
            {status.label}
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="p-6 space-y-4">
        {/* Date de fin */}
        {subscription.ends_at && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-warm-500">
              {subscription.status === 'cancelled' ? 'Accès jusqu\'au' : 'Prochain paiement'}
            </span>
            <span className="font-medium text-warm-900">
              {new Date(subscription.ends_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
        )}

        {/* Alerte annulation */}
        {subscription.status === 'cancelled' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Abonnement annulé</p>
              <p className="text-sm text-amber-700 mt-1">
                Votre abonnement est annulé mais reste actif jusqu'à la fin de la période payée.
                Vous pouvez le réactiver à tout moment.
              </p>
            </div>
          </div>
        )}

        {/* Alerte paiement échoué */}
        {subscription.status === 'past_due' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Paiement en retard</p>
              <p className="text-sm text-red-700 mt-1">
                Votre dernier paiement a échoué. Veuillez mettre à jour vos informations de paiement.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-warm-50 border-t border-warm-100 flex flex-wrap gap-3">
        {/* Portail client */}
        <button
          onClick={handlePortal}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 hover:border-warm-300 text-warm-700 rounded-lg transition-colors"
        >
          {loading && action === 'portal' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Gérer le paiement
        </button>

        {/* Annuler ou réactiver */}
        {subscription.status === 'cancelled' ? (
          <button
            onClick={handleResume}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            {loading && action === 'resume' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Réactiver l'abonnement
          </button>
        ) : subscription.status === 'active' ? (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            {loading && action === 'cancel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            Annuler l'abonnement
          </button>
        ) : null}
      </div>
    </div>
  );
}
