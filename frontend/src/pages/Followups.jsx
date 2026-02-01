import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertCircle,
  CalendarDays,
  Copy,
  Check,
} from 'lucide-react';
import {
  PIPELINE_STATUS,
  getNextActionDate,
  getNextStatus,
} from '../config/pipelineStatus';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Followups() {
  const { token } = useAuth();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [stats, setStats] = useState({ today: 0, overdue: 0, upcoming: 0 });
  const [updatingId, setUpdatingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchFollowups();
    fetchStats();
  }, [filter]);

  async function fetchFollowups() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/followups?period=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setFollowups(json.data);
      }
    } catch (error) {
      console.error('Error fetching followups:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_URL}/api/followups/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function markAsContacted(prospect) {
    setUpdatingId(prospect.id);
    const nextStatus = getNextStatus(prospect.pipeline_status);
    if (!nextStatus) {
      setUpdatingId(null);
      return;
    }

    try {
      const nextActionDate = getNextActionDate(nextStatus);
      await fetch(`${API_URL}/api/prospects/${prospect.id}/pipeline-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipeline_status: nextStatus,
          next_action_date: nextActionDate,
        }),
      });

      setFollowups(followups.filter(f => f.id !== prospect.id));
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function postponeFollowup(prospect, days) {
    setUpdatingId(prospect.id);
    try {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + days);
      const nextActionDate = newDate.toISOString().split('T')[0];

      await fetch(`${API_URL}/api/prospects/${prospect.id}/pipeline-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipeline_status: prospect.pipeline_status,
          next_action_date: nextActionDate,
        }),
      });

      setFollowups(followups.filter(f => f.id !== prospect.id));
      fetchStats();
    } catch (error) {
      console.error('Error postponing:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAsIgnored(prospect) {
    setUpdatingId(prospect.id);
    try {
      await fetch(`${API_URL}/api/prospects/${prospect.id}/pipeline-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipeline_status: 'ignore',
          next_action_date: null,
        }),
      });

      setFollowups(followups.filter(f => f.id !== prospect.id));
      fetchStats();
    } catch (error) {
      console.error('Error marking as ignored:', error);
    } finally {
      setUpdatingId(null);
    }
  }

  function copyMessage(prospect) {
    const campaign = prospect.campaign_prospects?.[0]?.campaign;
    const templates = campaign?.message_templates || {};

    let messageKey = 'accroche';
    if (prospect.pipeline_status === 'message_1') messageKey = 'relance_j3';
    else if (prospect.pipeline_status === 'relance_1') messageKey = 'relance_j7';
    else if (prospect.pipeline_status === 'relance_2') messageKey = 'relance_j14';

    let message = templates[messageKey] || '';

    // Remplacer les variables
    message = message
      .replace(/{prenom}/g, prospect.full_name?.split(' ')[0] || '')
      .replace(/{nom}/g, prospect.full_name?.split(' ').slice(1).join(' ') || '')
      .replace(/{entreprise}/g, prospect.company || '')
      .replace(/{poste}/g, prospect.job_title || '');

    navigator.clipboard.writeText(message);
    setCopiedId(prospect.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filterTabs = [
    { key: 'today', label: 'Aujourd\'hui', count: stats.today, icon: Calendar, color: 'text-brand-600' },
    { key: 'overdue', label: 'En retard', count: stats.overdue, icon: AlertCircle, color: 'text-red-600' },
    { key: 'upcoming', label: 'Cette semaine', count: stats.upcoming, icon: CalendarDays, color: 'text-blue-600' },
  ];

  return (
    <>
      <Header
        title="Relances"
        subtitle="Gérez vos relances quotidiennes"
      />

      <div className="p-6 max-w-4xl mx-auto">
        {/* Stats Tabs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                filter === tab.key
                  ? 'bg-white border-brand-200 shadow-sm'
                  : 'bg-warm-50 border-warm-100 hover:bg-white'
              }`}
            >
              <tab.icon className={`mb-2 ${filter === tab.key ? tab.color : 'text-warm-400'}`} size={24} />
              <span className={`text-2xl font-bold ${filter === tab.key ? 'text-warm-900' : 'text-warm-600'}`}>
                {tab.count}
              </span>
              <span className="text-sm text-warm-500">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Followups List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin text-brand-500" size={32} />
          </div>
        ) : followups.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-warm-100">
            <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-warm-900 mb-2">
              {filter === 'today' && 'Aucune relance pour aujourd\'hui'}
              {filter === 'overdue' && 'Aucune relance en retard'}
              {filter === 'upcoming' && 'Aucune relance prévue cette semaine'}
            </h3>
            <p className="text-warm-500">
              {filter === 'today' ? 'Vous êtes à jour !' : 'Tout est en ordre.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {followups.map(prospect => {
              const statusConfig = PIPELINE_STATUS[prospect.pipeline_status] || PIPELINE_STATUS.demande_envoyee;
              const StatusIcon = statusConfig.icon;
              const campaign = prospect.campaign_prospects?.[0]?.campaign;
              const isOverdue = prospect.next_action_date && new Date(prospect.next_action_date) < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <div
                  key={prospect.id}
                  className={`bg-white rounded-xl border p-4 transition-all ${
                    isOverdue ? 'border-red-200' : 'border-warm-100'
                  } ${updatingId === prospect.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusConfig.bgColor}`}>
                      <StatusIcon className={statusConfig.color} size={20} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-warm-900">{prospect.full_name || prospect.username}</h4>
                          <p className="text-sm text-warm-500">
                            {prospect.job_title && `${prospect.job_title} • `}
                            {prospect.company || prospect.username}
                          </p>
                        </div>
                        {campaign && (
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="text-xs px-2 py-1 bg-warm-100 text-warm-600 rounded-full hover:bg-warm-200 transition-colors"
                          >
                            {campaign.name}
                          </Link>
                        )}
                      </div>

                      {/* Status & Date */}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {prospect.next_action_date && (
                          <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-warm-500'}`}>
                            <Clock size={12} />
                            {isOverdue ? 'En retard: ' : ''}
                            {new Date(prospect.next_action_date).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <button
                          onClick={() => markAsContacted(prospect)}
                          disabled={updatingId === prospect.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white text-sm rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                        >
                          {updatingId === prospect.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          Contacté
                        </button>

                        {campaign?.message_templates && (
                          <button
                            onClick={() => copyMessage(prospect)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-warm-200 text-warm-700 text-sm rounded-lg hover:bg-warm-50 transition-colors"
                          >
                            {copiedId === prospect.id ? (
                              <>
                                <Check size={14} className="text-green-600" />
                                Copié !
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                Copier message
                              </>
                            )}
                          </button>
                        )}

                        {prospect.profile_url && (
                          <a
                            href={prospect.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-warm-200 text-warm-700 text-sm rounded-lg hover:bg-warm-50 transition-colors"
                          >
                            <ExternalLink size={14} />
                            Profil
                          </a>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            onClick={() => postponeFollowup(prospect, 1)}
                            disabled={updatingId === prospect.id}
                            className="p-1.5 text-warm-500 hover:text-warm-700 hover:bg-warm-100 rounded-lg transition-colors"
                            title="Reporter à demain"
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button
                            onClick={() => markAsIgnored(prospect)}
                            disabled={updatingId === prospect.id}
                            className="p-1.5 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Ignorer"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tip */}
        <div className="mt-6 p-4 bg-brand-50 rounded-xl">
          <p className="text-sm text-brand-700">
            <strong>Astuce :</strong> Marquez un prospect comme "Contacté" pour passer automatiquement à l'étape suivante du pipeline.
          </p>
        </div>
      </div>
    </>
  );
}
