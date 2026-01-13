import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Crown,
  AlertTriangle,
  Users,
  TrendingUp,
  Shield,
  Check,
  X,
  Eye,
  Ban,
  Mail,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

// Liste des admins autorisés (accès illimité + page admin)
const ADMIN_EMAILS = [
  'sandra.devonssay@gmail.com',
  'contact@sosprospection.com',
];

export default function Admin() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [optOutRequests, setOptOutRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('alerts');

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, alertsRes, usersRes, optOutRes] = await Promise.all([
        api.request('/admin/dashboard'),
        api.request('/admin/alerts'),
        api.request('/admin/top-users'),
        api.request('/admin/opt-out-requests'),
      ]);

      setDashboardData(dashboardRes.data);
      setAlerts(alertsRes.data || []);
      setTopUsers(usersRes.data || []);
      setOptOutRequests(optOutRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAlertRead = async (alertId) => {
    try {
      await api.request(`/admin/alerts/${alertId}/read`, { method: 'POST' });
      setAlerts(alerts.map(a => a.id === alertId ? { ...a, is_read: true } : a));
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const handleProcessOptOut = async (requestId) => {
    try {
      await api.request(`/admin/opt-out/${requestId}/process`, { method: 'POST' });
      setOptOutRequests(optOutRequests.map(r =>
        r.id === requestId ? { ...r, status: 'processed', processed_at: new Date().toISOString() } : r
      ));
    } catch (error) {
      console.error('Error processing opt-out:', error);
    }
  };

  const handleSuspendUser = async (userId) => {
    if (!confirm('Voulez-vous vraiment suspendre cet utilisateur ?')) return;
    try {
      await api.request(`/admin/users/${userId}/suspend`, { method: 'POST' });
      fetchData();
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  // Rediriger si non admin
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-warm-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-warm-900">
                Dashboard Admin
              </h1>
              <p className="text-warm-500">Bienvenue, {user?.email}</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-warm-200 rounded-lg hover:border-warm-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Nouveaux ce mois"
            value={dashboardData?.new_users_this_month || 0}
            icon={Users}
            color="brand"
          />
          <StatCard
            label="Utilisateurs payants"
            value={dashboardData?.paying_users || 0}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            label="Opt-out en attente"
            value={dashboardData?.pending_opt_outs || 0}
            icon={Shield}
            color="amber"
          />
          <StatCard
            label="Alertes non lues"
            value={dashboardData?.unread_alerts || 0}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-warm-200">
          {[
            { id: 'alerts', label: 'Alertes', count: alerts.filter(a => !a.is_read).length },
            { id: 'users', label: 'Top Utilisateurs' },
            { id: 'optout', label: 'Demandes Opt-Out', count: optOutRequests.filter(r => r.status === 'pending').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-brand-600 border-b-2 border-brand-600'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-warm-400 mb-4" />
              <p className="text-warm-500">Chargement...</p>
            </div>
          ) : (
            <>
              {/* Alertes */}
              {activeTab === 'alerts' && (
                <div className="space-y-4">
                  {alerts.length === 0 ? (
                    <p className="text-center py-8 text-warm-500">Aucune alerte</p>
                  ) : (
                    alerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-xl border ${
                          alert.is_read ? 'bg-warm-50 border-warm-200' : 'bg-amber-50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                              alert.severity === 'warning' ? 'bg-amber-100 text-amber-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-medium text-warm-900">{alert.title}</h4>
                              <p className="text-sm text-warm-600">{alert.message}</p>
                              <p className="text-xs text-warm-400 mt-1">
                                {new Date(alert.created_at).toLocaleString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!alert.is_read && (
                              <button
                                onClick={() => handleMarkAlertRead(alert.id)}
                                className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
                                title="Marquer comme lu"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                            )}
                            {alert.user_id && (
                              <button
                                onClick={() => handleSuspendUser(alert.user_id)}
                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                title="Suspendre l'utilisateur"
                              >
                                <Ban className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Top Users */}
              {activeTab === 'users' && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-warm-500 border-b border-warm-100">
                        <th className="pb-3 font-medium">Utilisateur</th>
                        <th className="pb-3 font-medium">Plan</th>
                        <th className="pb-3 font-medium">Prospects ce mois</th>
                        <th className="pb-3 font-medium">Messages</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((u, i) => (
                        <tr key={u.id} className="border-b border-warm-50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-warm-100 rounded-full flex items-center justify-center text-xs font-medium">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium text-warm-900">{u.full_name || 'Sans nom'}</p>
                                <p className="text-sm text-warm-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.plan === 'agency_plus' ? 'bg-purple-100 text-purple-700' :
                              u.plan === 'agence' ? 'bg-blue-100 text-blue-700' :
                              u.plan === 'solo' ? 'bg-green-100 text-green-700' :
                              'bg-warm-100 text-warm-600'
                            }`}>
                              {u.plan || 'free'}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.monthly_prospects || 0}</span>
                              <span className="text-warm-400">/ {u.monthly_limit}</span>
                              <div className="w-20 h-2 bg-warm-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    (u.monthly_prospects / u.monthly_limit) > 0.8 ? 'bg-red-500' :
                                    (u.monthly_prospects / u.monthly_limit) > 0.5 ? 'bg-amber-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min((u.monthly_prospects / u.monthly_limit) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-warm-700">{u.monthly_messages || 0}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <button className="p-2 hover:bg-warm-100 rounded-lg transition-colors" title="Voir détails">
                                <Eye className="w-4 h-4 text-warm-500" />
                              </button>
                              <button className="p-2 hover:bg-warm-100 rounded-lg transition-colors" title="Envoyer email">
                                <Mail className="w-4 h-4 text-warm-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Opt-Out Requests */}
              {activeTab === 'optout' && (
                <div className="space-y-4">
                  {optOutRequests.length === 0 ? (
                    <p className="text-center py-8 text-warm-500">Aucune demande</p>
                  ) : (
                    optOutRequests.map(req => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border ${
                          req.status === 'pending' ? 'bg-amber-50 border-amber-200' : 'bg-warm-50 border-warm-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-warm-900">@{req.username}</span>
                              <span className="text-xs px-2 py-0.5 bg-warm-200 text-warm-600 rounded-full">
                                {req.platform}
                              </span>
                              {req.status !== 'pending' && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                  Traité
                                </span>
                              )}
                            </div>
                            {req.email && <p className="text-sm text-warm-500">{req.email}</p>}
                            {req.reason && <p className="text-sm text-warm-600 mt-1">Raison : {req.reason}</p>}
                            <p className="text-xs text-warm-400 mt-1">
                              Demandé le {new Date(req.requested_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                          {req.status === 'pending' && (
                            <button
                              onClick={() => handleProcessOptOut(req.id)}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                            >
                              Traiter
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-warm-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-warm-900">{value}</p>
          <p className="text-sm text-warm-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
