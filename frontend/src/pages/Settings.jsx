import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Download,
  Trash2,
  LogOut,
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Send,
  Info,
  Building2,
  Users,
  RotateCcw
} from 'lucide-react';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useClient } from '../contexts/ClientContext';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';

export default function Settings() {
  const { user, logout } = useAuth();
  const { isAgencyMode, hasAgencyPlan, agencyOverride, toggleAgencyMode, agencyName } = useClient();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [tempAgencyName, setTempAgencyName] = useState(agencyOverride?.name || '');

  const [settings, setSettings] = useState({
    full_name: '',
    email: '',
    notifications_email: true,
    notifications_weekly_report: true,
    theme: 'light',
    language: 'fr',
  });
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  // Charger les settings
  useEffect(() => {
    if (user) {
      setSettings(s => ({
        ...s,
        full_name: user.full_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  // Sauvegarder
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        full_name: settings.full_name,
      });
      toast.success('Paramètres sauvegardés');
    } catch (error) {
      toast.error('Erreur', 'Impossible de sauvegarder les paramètres');
    } finally {
      setSaving(false);
    }
  };

  // Réinitialiser l'onboarding
  const handleResetOnboarding = async () => {
    setResettingOnboarding(true);
    try {
      await api.resetOnboarding();
      toast.success('Onboarding réinitialisé', 'Rafraîchissez la page pour recommencer');
      // Optionnel: recharger la page après 1s
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast.error('Erreur', 'Impossible de réinitialiser l\'onboarding');
    } finally {
      setResettingOnboarding(false);
    }
  };

  // Export des données
  const handleExportData = async () => {
    setLoading(true);
    try {
      const response = await api.exportUserData();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `social-prospector-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast.success('Export terminé');
    } catch (error) {
      toast.error('Erreur', 'Impossible d\'exporter les données');
    } finally {
      setLoading(false);
    }
  };

  // Suppression de compte
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') return;
    
    setLoading(true);
    try {
      await api.deleteAccount();
      toast.success('Compte supprimé');
      logout();
    } catch (error) {
      toast.error('Erreur', 'Impossible de supprimer le compte');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <Header
        title="Paramètres"
        subtitle="Gérez votre compte et vos préférences"
      />

      <div className="p-6 lg:p-8 max-w-4xl space-y-6">
        {/* Profil */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                <User className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Profil</h2>
                <p className="text-sm text-warm-500">Informations de votre compte</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={settings.full_name}
                onChange={(e) => setSettings(s => ({ ...s, full_name: e.target.value }))}
                className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.email}
                disabled
                className="w-full px-4 py-2 border border-warm-200 rounded-xl bg-warm-50 text-warm-500"
              />
              <p className="text-xs text-warm-400 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        </section>

        {/* Onboarding */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Mon profil business</h2>
                <p className="text-sm text-warm-500">Activité, cible et suggestions personnalisées</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
              <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-purple-800">
                <p className="font-medium">Modifier mon profil</p>
                <p className="text-purple-700">
                  Vos données actuelles seront pré-remplies.
                  Vous pourrez modifier votre activité, client idéal, etc. et de nouvelles suggestions seront générées.
                </p>
              </div>
            </div>

            <button
              onClick={handleResetOnboarding}
              disabled={resettingOnboarding}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {resettingOnboarding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Modifier mon profil
            </button>
          </div>
        </section>

        {/* Mode Agence */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Mode Agence</h2>
                <p className="text-sm text-warm-500">Gerez plusieurs clients depuis un seul compte</p>
              </div>
              {isAgencyMode && (
                <span className="ml-auto px-3 py-1 text-xs font-semibold bg-gradient-to-r from-brand-500 to-accent-500 text-white rounded-full">
                  ACTIF
                </span>
              )}
            </div>
          </div>

          <div className="p-6 space-y-4">
            {hasAgencyPlan ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">Plan Agence actif</p>
                  <p className="text-green-700">Votre abonnement inclut le mode agence multi-clients.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 bg-warm-50 border border-warm-200 rounded-xl">
                  <Info className="w-5 h-5 text-warm-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-warm-600">
                    <p className="font-medium text-warm-800">Mode demonstration</p>
                    <p>Activez le mode agence pour tester les fonctionnalites multi-clients. En production, ce mode necessite un abonnement Agence ou Agence+.</p>
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-medium text-warm-900">Activer le mode Agence</p>
                    <p className="text-sm text-warm-500">Pour tester les fonctionnalites multi-clients</p>
                  </div>
                  <button
                    onClick={() => {
                      if (agencyOverride?.enabled) {
                        toggleAgencyMode(false);
                        setTempAgencyName('');
                        toast.success('Mode Agence desactive');
                      }
                    }}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agencyOverride?.enabled ? 'bg-brand-500' : 'bg-warm-300'
                    }`}
                    disabled={!agencyOverride?.enabled}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      agencyOverride?.enabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </label>

                {!agencyOverride?.enabled && (
                  <div className="pt-2 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-warm-700 mb-1">
                        Nom de votre agence
                      </label>
                      <input
                        type="text"
                        value={tempAgencyName}
                        onChange={(e) => setTempAgencyName(e.target.value)}
                        placeholder="Ex: Studio Digital, Agence Marketing..."
                        className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (tempAgencyName.trim()) {
                          toggleAgencyMode(true, tempAgencyName.trim());
                          toast.success('Mode Agence active !', `Bienvenue ${tempAgencyName.trim()}`);
                        } else {
                          toast.error('Nom requis', 'Veuillez entrer un nom d\'agence');
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white font-medium rounded-xl transition-all"
                    >
                      <Building2 className="w-4 h-4" />
                      Activer le mode Agence
                    </button>
                  </div>
                )}

                {agencyOverride?.enabled && agencyName && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-brand-50 to-accent-50 border border-brand-200 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold">
                      {agencyName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-warm-900">{agencyName}</p>
                      <p className="text-sm text-warm-500">Mode demonstration actif</p>
                    </div>
                    <Users className="w-5 h-5 text-brand-500" />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Notifications</h2>
                <p className="text-sm text-warm-500">Gérez vos préférences de notification</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-warm-900">Notifications par email</p>
                <p className="text-sm text-warm-500">Recevez des alertes sur votre activité</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, notifications_email: !s.notifications_email }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications_email ? 'bg-brand-500' : 'bg-warm-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.notifications_email ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-medium text-warm-900">Rapport hebdomadaire</p>
                <p className="text-sm text-warm-500">Résumé de vos performances chaque lundi</p>
              </div>
              <button
                onClick={() => setSettings(s => ({ ...s, notifications_weekly_report: !s.notifications_weekly_report }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.notifications_weekly_report ? 'bg-brand-500' : 'bg-warm-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.notifications_weekly_report ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </label>
          </div>
        </section>


        {/* Données */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Données & Confidentialité</h2>
                <p className="text-sm text-warm-500">Gérez vos données personnelles</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <button
              onClick={handleExportData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter mes données
            </button>

            <div className="pt-4 border-t border-warm-100">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer mon compte
              </button>
              <p className="text-xs text-warm-400 mt-2">
                Cette action est irréversible et supprimera toutes vos données
              </p>
            </div>
          </div>
        </section>

        {/* Protection Anti-Ban */}
        <section className="card">
          <div className="p-6 border-b border-warm-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-warm-900">Protection Anti-Ban</h2>
                <p className="text-sm text-warm-500">Limites d'envoi de messages</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <Info className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-2">Limites recommandees</p>
                <ul className="space-y-1 text-orange-700">
                  <li>• Maximum 5 DMs par heure</li>
                  <li>• Maximum 40 DMs par jour</li>
                  <li>• Pause automatique de 30 min apres 5 envois consecutifs</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-warm-50 border border-warm-200 rounded-xl">
              <p className="text-sm text-warm-600 leading-relaxed">
                <strong className="text-warm-900">Avertissement :</strong> Social Prospector propose des limites d'envoi
                pour proteger votre compte, mais nous ne garantissons pas l'absence de restrictions ou
                de blocages par Instagram/TikTok. Chaque compte est evalue differemment par les plateformes
                en fonction de son historique, de son age et de son comportement.
              </p>
              <p className="text-sm text-warm-500 mt-2">
                En utilisant cet outil, vous acceptez d'utiliser la prospection de maniere responsable
                et de ne pas envoyer de messages non sollicites en masse.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="https://help.instagram.com/477434105621119"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700"
              >
                <ExternalLink className="w-4 h-4" />
                Regles de la communaute Instagram
              </a>
            </div>
          </div>
        </section>

        {/* Déconnexion */}
        <section className="card p-6">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-warm-600 hover:bg-warm-100 font-medium rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </section>
      </div>

      {/* Modal suppression */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Supprimer le compte"
        size="small"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium">Cette action est irréversible</p>
              <p>Toutes vos données seront définitivement supprimées : prospects, messages, profils MA VOIX, etc.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">
              Tapez <strong>SUPPRIMER</strong> pour confirmer
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-warm-200 rounded-xl focus:border-red-500 focus:ring-0 outline-none"
              placeholder="SUPPRIMER"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-warm-600 hover:text-warm-800 font-medium"
            >
              Annuler
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'SUPPRIMER' || loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-warm-300 text-white font-medium rounded-xl transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Supprimer définitivement
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
