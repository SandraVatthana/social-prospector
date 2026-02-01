import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus,
  Target,
  Users,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  ChevronRight,
} from 'lucide-react';
import {
  PIPELINE_STATUS,
  FUNNEL_ORDER,
  getCampaignStatusColor,
  CAMPAIGN_STATUS_LABELS,
} from '../config/pipelineStatus';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Campaigns() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', target_description: '' });
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  async function fetchCampaigns() {
    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCampaigns(json.data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!newCampaign.name.trim()) return;
    setCreating(true);

    try {
      const res = await fetch(`${API_URL}/api/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newCampaign.name,
          target_description: newCampaign.target_description || null,
          status: 'draft',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCampaigns([json.data, ...campaigns]);
        setShowCreateModal(false);
        setNewCampaign({ name: '', target_description: '' });
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setCreating(false);
    }
  }

  async function updateCampaignStatus(id, status) {
    try {
      await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      setCampaigns(campaigns.map(c => (c.id === id ? { ...c, status } : c)));
    } catch (error) {
      console.error('Error updating campaign:', error);
    }
    setMenuOpen(null);
  }

  async function deleteCampaign(id) {
    if (!confirm('Supprimer cette campagne ?')) return;
    try {
      await fetch(`${API_URL}/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
    setMenuOpen(null);
  }

  const filteredCampaigns = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <>
      <Header title="Campagnes" subtitle="Gérez vos campagnes de prospection LinkedIn" />

      <div className="p-6 max-w-6xl mx-auto">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'Toutes' },
              { key: 'active', label: 'Actives' },
              { key: 'draft', label: 'Brouillons' },
              { key: 'paused', label: 'En pause' },
              { key: 'completed', label: 'Terminées' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === key
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-white text-warm-600 hover:bg-warm-50 border border-warm-200'
                }`}
              >
                {label}
                {key === 'all' && ` (${campaigns.length})`}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
          >
            <Plus size={20} />
            Nouvelle campagne
          </button>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-6 animate-pulse shadow-sm">
                <div className="h-6 bg-warm-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-warm-100 rounded w-full mb-4" />
                <div className="h-8 bg-warm-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm">
            <Target className="mx-auto text-warm-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-warm-900 mb-2">
              {filter === 'all' ? 'Aucune campagne' : `Aucune campagne ${CAMPAIGN_STATUS_LABELS[filter]?.toLowerCase()}`}
            </h3>
            <p className="text-warm-500 mb-4">Créez votre première campagne pour commencer à prospecter</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
            >
              <Plus size={18} />
              Créer une campagne
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map(campaign => {
              const statusColor = getCampaignStatusColor(campaign.status);
              return (
                <div key={campaign.id} className="bg-white rounded-xl p-5 border border-warm-100 hover:shadow-lg transition-shadow">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/campaigns/${campaign.id}`}
                        className="font-semibold text-warm-900 hover:text-brand-600 transition-colors line-clamp-1"
                      >
                        {campaign.name}
                      </Link>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColor.bg} ${statusColor.text}`}>
                        {CAMPAIGN_STATUS_LABELS[campaign.status] || campaign.status}
                      </span>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === campaign.id ? null : campaign.id)}
                        className="p-1.5 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {menuOpen === campaign.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-warm-100 py-1 z-10">
                          <Link
                            to={`/campaigns/${campaign.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-warm-700 hover:bg-warm-50"
                          >
                            <Edit size={14} /> Modifier
                          </Link>
                          {campaign.status !== 'active' && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, 'active')}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              <Play size={14} /> Activer
                            </button>
                          )}
                          {campaign.status === 'active' && (
                            <button
                              onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-yellow-600 hover:bg-yellow-50"
                            >
                              <Pause size={14} /> Mettre en pause
                            </button>
                          )}
                          <button
                            onClick={() => deleteCampaign(campaign.id)}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {campaign.target_description && (
                    <p className="text-sm text-warm-500 mb-4 line-clamp-2">{campaign.target_description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 py-3 border-t border-warm-100">
                    <div className="flex items-center gap-2 text-warm-600">
                      <Users size={16} />
                      <span className="text-sm font-medium">
                        {campaign.prospect_count || 0} prospect{(campaign.prospect_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Mini Funnel */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-warm-100">
                    {FUNNEL_ORDER.slice(0, 5).map((status, i) => (
                      <div
                        key={status}
                        className={`flex-1 ${PIPELINE_STATUS[status]?.bgColor || 'bg-warm-200'}`}
                        style={{ opacity: 0.3 + i * 0.15 }}
                      />
                    ))}
                  </div>

                  {/* Link */}
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="flex items-center justify-center gap-1 mt-4 py-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Voir la campagne <ChevronRight size={16} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-warm-900 mb-4">Nouvelle campagne</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">Nom de la campagne *</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="Ex: Directeurs Marketing SaaS"
                    className="w-full px-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">Description de la cible</label>
                  <textarea
                    value={newCampaign.target_description}
                    onChange={e => setNewCampaign({ ...newCampaign, target_description: e.target.value })}
                    placeholder="Ex: Directeurs marketing dans les entreprises SaaS B2B, 50-500 employés"
                    rows={3}
                    className="w-full px-4 py-2.5 border border-warm-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 border border-warm-200 text-warm-700 rounded-lg hover:bg-warm-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={createCampaign}
                  disabled={!newCampaign.name.trim() || creating}
                  className="flex-1 px-4 py-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Click outside to close menu */}
        {menuOpen && <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />}
      </div>
    </>
  );
}
