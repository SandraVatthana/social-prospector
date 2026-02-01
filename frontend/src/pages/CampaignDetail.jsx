import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '../components/layout';
import { useAuth } from '../contexts/AuthContext';
import CSVImportModal from '../components/campaigns/CSVImportModal';
import {
  ArrowLeft,
  Users,
  FileSpreadsheet,
  Settings,
  BarChart3,
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  Loader2,
  Target,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  PIPELINE_STATUS,
  FUNNEL_ORDER,
  getNextActionDate,
  countByStatus,
  calculateFunnelStats,
  getCampaignStatusColor,
  CAMPAIGN_STATUS_LABELS,
} from '../config/pipelineStatus';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [campaign, setCampaign] = useState(null);
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prospects');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState({
    accroche: '',
    relance_j3: '',
    relance_j7: '',
    relance_j14: '',
  });
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    fetchCampaignDetail();
  }, [id]);

  async function fetchCampaignDetail() {
    try {
      const res = await fetch(`${API_URL}/api/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCampaign(json.data);
        setProspects(json.data.prospects || []);
        setTemplates(json.data.message_templates || templates);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProspectStatus(prospectId, newStatus) {
    setUpdatingStatus(prospectId);
    try {
      const nextActionDate = getNextActionDate(newStatus);
      await fetch(`${API_URL}/api/prospects/${prospectId}/pipeline-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pipeline_status: newStatus,
          next_action_date: nextActionDate,
        }),
      });

      setProspects(
        prospects.map(cp =>
          cp.prospect?.id === prospectId
            ? { ...cp, prospect: { ...cp.prospect, pipeline_status: newStatus, next_action_date: nextActionDate } }
            : cp
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(null);
      setMenuOpen(null);
    }
  }

  async function removeProspectFromCampaign(prospectId) {
    if (!confirm('Retirer ce prospect de la campagne ?')) return;
    try {
      await fetch(`${API_URL}/api/campaigns/${id}/prospects`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prospect_ids: [prospectId] }),
      });
      setProspects(prospects.filter(cp => cp.prospect?.id !== prospectId));
    } catch (error) {
      console.error('Error removing prospect:', error);
    }
    setMenuOpen(null);
  }

  async function saveTemplates() {
    setSavingTemplates(true);
    try {
      await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message_templates: templates }),
      });
      setCampaign({ ...campaign, message_templates: templates });
      setShowTemplatesModal(false);
    } catch (error) {
      console.error('Error saving templates:', error);
    } finally {
      setSavingTemplates(false);
    }
  }

  function handleImportComplete(count) {
    fetchCampaignDetail();
    setShowImportModal(false);
  }

  const stats = countByStatus(prospects.map(cp => cp.prospect).filter(Boolean));
  const funnelStats = calculateFunnelStats(stats);

  const filteredProspects = prospects.filter(cp => {
    const prospect = cp.prospect;
    if (!prospect) return false;

    const matchesSearch =
      !searchTerm ||
      prospect.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.company?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || prospect.pipeline_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <>
        <Header title="Chargement..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-brand-500" size={32} />
        </div>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <Header title="Campagne non trouvée" />
        <div className="p-6 text-center">
          <p className="text-warm-500 mb-4">Cette campagne n'existe pas ou a été supprimée.</p>
          <Link to="/campaigns" className="text-brand-600 hover:text-brand-700 font-medium">
            Retour aux campagnes
          </Link>
        </div>
      </>
    );
  }

  const statusColor = getCampaignStatusColor(campaign.status);

  return (
    <>
      <Header
        title={campaign.name}
        subtitle={campaign.target_description || 'Campagne de prospection'}
      />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Back link + Status */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/campaigns" className="flex items-center gap-2 text-warm-600 hover:text-warm-800">
            <ArrowLeft size={18} />
            Retour aux campagnes
          </Link>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>
            {CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status}
          </span>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-warm-100">
            <div className="flex items-center gap-2 text-warm-500 mb-1">
              <Users size={16} />
              <span className="text-sm">Total prospects</span>
            </div>
            <p className="text-2xl font-bold text-warm-900">{prospects.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-warm-100">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle size={16} />
              <span className="text-sm">Taux connexion</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{funnelStats.connectionRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-warm-100">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <BarChart3 size={16} />
              <span className="text-sm">Taux réponse</span>
            </div>
            <p className="text-2xl font-bold text-purple-700">{funnelStats.responseRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-warm-100">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <Target size={16} />
              <span className="text-sm">RDV pris</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.rdv_pris || 0}</p>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="bg-white rounded-xl p-6 border border-warm-100 mb-6">
          <h3 className="text-sm font-semibold text-warm-700 mb-4">Funnel de conversion</h3>
          <div className="flex items-end gap-1 h-32">
            {FUNNEL_ORDER.map((status, index) => {
              const count = stats[status] || 0;
              const maxCount = Math.max(...Object.values(stats), 1);
              const height = (count / maxCount) * 100;
              const config = PIPELINE_STATUS[status];

              return (
                <div key={status} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-warm-700">{count}</span>
                  <div
                    className={`w-full rounded-t transition-all ${config?.bgColor || 'bg-warm-200'}`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-[10px] text-warm-500 text-center leading-tight truncate w-full" title={config?.label}>
                    {config?.label?.split(' ')[0] || status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-warm-200">
          {[
            { key: 'prospects', label: 'Prospects', icon: Users },
            { key: 'templates', label: 'Templates', icon: FileSpreadsheet },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Prospects Tab */}
        {activeTab === 'prospects' && (
          <div>
            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" size={18} />
                <input
                  type="text"
                  placeholder="Rechercher un prospect..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white"
              >
                <option value="all">Tous les statuts</option>
                {Object.entries(PIPELINE_STATUS).map(([value, config]) => (
                  <option key={value} value={value}>
                    {config.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
              >
                <Plus size={18} />
                Importer CSV
              </button>
            </div>

            {/* Prospects List */}
            {filteredProspects.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border border-warm-100">
                <Users className="mx-auto text-warm-300 mb-4" size={48} />
                <h3 className="text-lg font-medium text-warm-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'Aucun prospect trouvé' : 'Aucun prospect dans cette campagne'}
                </h3>
                <p className="text-warm-500 mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Essayez de modifier vos filtres'
                    : 'Importez un fichier CSV pour commencer'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                  >
                    <Plus size={18} />
                    Importer des prospects
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-warm-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-warm-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-warm-600">Prospect</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-warm-600 hidden md:table-cell">Entreprise</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-warm-600">Statut</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-warm-600 hidden sm:table-cell">Prochaine action</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-warm-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-100">
                    {filteredProspects.map(cp => {
                      const prospect = cp.prospect;
                      if (!prospect) return null;

                      const statusConfig = PIPELINE_STATUS[prospect.pipeline_status] || PIPELINE_STATUS.demande_envoyee;
                      const StatusIcon = statusConfig.icon;

                      return (
                        <tr key={cp.id} className="hover:bg-warm-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-warm-900">{prospect.full_name || prospect.username}</p>
                              <p className="text-sm text-warm-500">{prospect.job_title || prospect.username}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <span className="text-warm-600">{prospect.company || '-'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                              <StatusIcon size={12} />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {prospect.next_action_date ? (
                              <span className="text-sm text-warm-600">
                                {new Date(prospect.next_action_date).toLocaleDateString('fr-FR')}
                              </span>
                            ) : (
                              <span className="text-sm text-warm-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="relative inline-block">
                              <button
                                onClick={() => setMenuOpen(menuOpen === prospect.id ? null : prospect.id)}
                                className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {menuOpen === prospect.id && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-warm-100 py-1 z-20">
                                  <div className="px-3 py-2 border-b border-warm-100">
                                    <p className="text-xs font-semibold text-warm-500 uppercase">Changer statut</p>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {Object.entries(PIPELINE_STATUS).map(([value, config]) => (
                                      <button
                                        key={value}
                                        onClick={() => updateProspectStatus(prospect.id, value)}
                                        disabled={updatingStatus === prospect.id}
                                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-warm-50 ${
                                          prospect.pipeline_status === value ? 'bg-brand-50 text-brand-700' : 'text-warm-700'
                                        }`}
                                      >
                                        <config.icon size={14} />
                                        {config.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="border-t border-warm-100 mt-1 pt-1">
                                    {prospect.profile_url && (
                                      <a
                                        href={prospect.profile_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-warm-600 hover:bg-warm-50"
                                      >
                                        <ExternalLink size={14} />
                                        Voir profil LinkedIn
                                      </a>
                                    )}
                                    <button
                                      onClick={() => removeProspectFromCampaign(prospect.id)}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 size={14} />
                                      Retirer de la campagne
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="bg-white rounded-xl p-6 border border-warm-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-warm-900">Templates de messages</h3>
                <p className="text-sm text-warm-500">Définissez vos messages types pour cette campagne</p>
              </div>
              <button
                onClick={saveTemplates}
                disabled={savingTemplates}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {savingTemplates ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Enregistrer
              </button>
            </div>

            <div className="space-y-6">
              {[
                { key: 'accroche', label: "Message d'accroche", description: 'Premier message après connexion' },
                { key: 'relance_j3', label: 'Relance J+3', description: 'Si pas de réponse après 3 jours' },
                { key: 'relance_j7', label: 'Relance J+7', description: 'Si pas de réponse après 7 jours' },
                { key: 'relance_j14', label: 'Relance J+14', description: 'Dernière relance après 14 jours' },
              ].map(template => (
                <div key={template.key}>
                  <label className="block text-sm font-medium text-warm-700 mb-1">{template.label}</label>
                  <p className="text-xs text-warm-500 mb-2">{template.description}</p>
                  <textarea
                    value={templates[template.key] || ''}
                    onChange={e => setTemplates({ ...templates, [template.key]: e.target.value })}
                    rows={4}
                    placeholder={`Votre ${template.label.toLowerCase()}...`}
                    className="w-full px-4 py-3 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-brand-50 rounded-lg">
              <p className="text-sm text-brand-700">
                <strong>Variables disponibles :</strong> {'{prenom}'}, {'{nom}'}, {'{entreprise}'}, {'{poste}'}
              </p>
            </div>
          </div>
        )}

        {/* Click outside to close menus */}
        {menuOpen && <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />}

        {/* Import Modal */}
        {showImportModal && (
          <CSVImportModal
            campaignId={id}
            onClose={() => setShowImportModal(false)}
            onImportComplete={handleImportComplete}
          />
        )}
      </div>
    </>
  );
}
