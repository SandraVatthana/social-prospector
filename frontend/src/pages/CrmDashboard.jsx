import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutGrid,
  Filter,
  ChevronDown,
  Instagram,
  MessageSquare,
  ExternalLink,
  Check,
  Clock,
  Flame,
  Calendar,
  HelpCircle,
  Shield,
  X,
  CircleDot,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Send,
  StickyNote,
  Save,
  UserPlus
} from 'lucide-react';
import Header from '../components/layout/Header';
import ExportDropdown from '../components/ui/ExportDropdown';
import { API_BASE_URL } from '../lib/api';

// Icone LinkedIn custom
const LinkedInIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Configuration des categories
const CATEGORY_CONFIG = {
  new: {
    label: 'Nouveaux',
    emoji: '🆕',
    icon: UserPlus,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    priority: 0,
    action: 'Premier contact'
  },
  hot_lead: {
    label: 'Lead chaud',
    emoji: '🔥',
    icon: Flame,
    color: 'bg-red-100 text-red-700 border-red-200',
    cardBg: 'bg-gradient-to-br from-red-50 to-orange-50',
    priority: 1,
    action: 'Relancer rapidement'
  },
  meeting_request: {
    label: 'Demande RDV',
    emoji: '📅',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    cardBg: 'bg-gradient-to-br from-purple-50 to-pink-50',
    priority: 2,
    action: 'Planifier immédiatement'
  },
  warm_lead: {
    label: 'Lead tiède',
    emoji: '🟡',
    icon: CircleDot,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    priority: 3,
    action: 'Nurturing'
  },
  question: {
    label: 'Question',
    emoji: '❓',
    icon: HelpCircle,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    cardBg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
    priority: 4,
    action: 'Répondre'
  },
  objection: {
    label: 'Objection',
    emoji: '🛡️',
    icon: Shield,
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    cardBg: 'bg-gradient-to-br from-orange-50 to-red-50',
    priority: 5,
    action: 'Traiter l\'objection'
  },
  not_interested: {
    label: 'Pas intéressé',
    emoji: '🔴',
    icon: X,
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    cardBg: 'bg-gray-50',
    priority: 6,
    action: 'Archiver'
  },
  negative: {
    label: 'Négatif',
    emoji: '🚫',
    icon: AlertCircle,
    color: 'bg-red-100 text-red-600 border-red-200',
    cardBg: 'bg-red-50',
    priority: 7,
    action: 'Ne plus contacter'
  },
  neutral: {
    label: 'Neutre',
    emoji: '⚪',
    icon: CircleDot,
    color: 'bg-gray-100 text-gray-500 border-gray-200',
    cardBg: 'bg-gray-50',
    priority: 8,
    action: 'Clarifier'
  }
};

// Helper pour obtenir les initiales
const getInitials = (username, fullName) => {
  if (fullName && fullName !== username) {
    const parts = fullName.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length >= 2) return parts[0].substring(0, 2).toUpperCase();
  }
  if (username) return username.substring(0, 2).toUpperCase();
  return '??';
};

// Couleurs avatar
const getAvatarColor = (username) => {
  const colors = ['bg-brand-500', 'bg-accent-500', 'bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-green-500'];
  const hash = (username || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// Composant Avatar
const ProspectAvatar = ({ avatar, username, fullName, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (!avatar || imgError) {
    return (
      <div className={`${sizeClass} rounded-lg ${getAvatarColor(username)} flex items-center justify-center text-white font-semibold`}>
        {getInitials(username, fullName)}
      </div>
    );
  }

  return (
    <img
      src={avatar}
      alt={username}
      className={`${sizeClass} rounded-lg object-cover`}
      onError={() => setImgError(true)}
    />
  );
};

export default function CrmDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' ou 'list'

  useEffect(() => {
    fetchDashboardData();
  }, [platformFilter]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const platformParam = platformFilter !== 'all' ? `?platform=${platformFilter}` : '';
      const response = await fetch(`${API_BASE_URL}/categorization/dashboard/me${platformParam}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.stats);
      } else {
        console.error('Erreur API:', response.status);
        setDashboardData(null);
      }
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setDashboardData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsHandled = async (prospectId) => {
    try {
      await fetch(`${API_BASE_URL}/categorization/mark-handled/${prospectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleUpdateNotes = async (prospectId, notes) => {
    try {
      const response = await fetch(`${API_BASE_URL}/prospects/${prospectId}/notes`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde');
      }

      // Mettre à jour localement les données
      fetchDashboardData();
    } catch (error) {
      console.error('Erreur sauvegarde notes:', error);
      throw error;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'À l\'instant';
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Stats globales
  const stats = dashboardData ? {
    total: dashboardData.total || 0,
    hotLeads: dashboardData.hotLeads || 0,
    needsAttention: dashboardData.needsAttention || 0,
    archived: dashboardData.archived || 0
  } : { total: 0, hotLeads: 0, needsAttention: 0, archived: 0 };

  // Categories triees par priorite
  const sortedCategories = Object.entries(CATEGORY_CONFIG)
    .sort((a, b) => a[1].priority - b[1].priority);

  return (
    <>
      <Header
        title="CRM Dashboard"
        subtitle={`${stats.total} prospects catégorisés • ${stats.hotLeads} leads chauds`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-warm-700">{stats.total}</p>
            <p className="text-sm text-warm-500">Total</p>
          </div>
          <div className="card p-4 text-center bg-gradient-to-br from-red-50 to-orange-50">
            <p className="text-2xl font-bold text-red-600">{stats.hotLeads}</p>
            <p className="text-sm text-red-500">Leads chauds</p>
          </div>
          <div className="card p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50">
            <p className="text-2xl font-bold text-blue-600">{stats.needsAttention}</p>
            <p className="text-sm text-blue-500">À traiter</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-500">{stats.archived}</p>
            <p className="text-sm text-gray-400">Archivés</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filtre plateforme */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-warm-400" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
              >
                <option value="all">Toutes les plateformes</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>

            {/* Toggle vue */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-warm-500 hover:bg-warm-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-warm-500 hover:bg-warm-50'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Export */}
            <ExportDropdown type="crm" filters={{ platform: platformFilter !== 'all' ? platformFilter : undefined }} />

            {/* Refresh */}
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-warm-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
          </div>
        ) : viewMode === 'kanban' ? (
          /* Vue Kanban */
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {sortedCategories
                .filter(([key]) => !['not_interested', 'negative', 'neutral'].includes(key))
                .map(([categoryKey, config]) => {
                  const categoryData = dashboardData?.byCategory?.[categoryKey];
                  const prospects = categoryData?.prospects || [];
                  const count = categoryData?.count || 0;

                  return (
                    <div key={categoryKey} className="w-72 flex-shrink-0">
                      {/* Header colonne */}
                      <div className={`p-3 rounded-t-xl ${config.cardBg} border border-b-0 ${config.color.split(' ')[2]}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.emoji}</span>
                            <span className="font-semibold text-warm-700">{config.label}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                            {count}
                          </span>
                        </div>
                        <p className="text-xs text-warm-500 mt-1">{config.action}</p>
                      </div>

                      {/* Liste prospects */}
                      <div className="bg-warm-50 border border-warm-200 rounded-b-xl p-2 min-h-[300px] space-y-2">
                        {prospects.length === 0 ? (
                          <div className="text-center py-8 text-warm-400 text-sm">
                            Aucun prospect
                          </div>
                        ) : (
                          prospects.slice(0, 5).map((prospect) => (
                            <ProspectCard
                              key={prospect.id}
                              prospect={prospect}
                              category={config}
                              formatDate={formatDate}
                              onMarkHandled={handleMarkAsHandled}
                              onUpdateNotes={handleUpdateNotes}
                            />
                          ))
                        )}
                        {prospects.length > 5 && (
                          <button className="w-full py-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
                            Voir les {prospects.length - 5} autres...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          /* Vue Liste */
          <div className="card overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-warm-50 border-b border-warm-100 text-sm font-medium text-warm-600">
              <div className="col-span-4">Prospect</div>
              <div className="col-span-2">Catégorie</div>
              <div className="col-span-3">Dernière réponse</div>
              <div className="col-span-2">Confiance</div>
              <div className="col-span-1">Action</div>
            </div>

            {sortedCategories.map(([categoryKey, config]) => {
              const categoryData = dashboardData?.byCategory?.[categoryKey];
              const prospects = categoryData?.prospects || [];

              return prospects.map((prospect) => (
                <div key={prospect.id} className="grid grid-cols-12 gap-4 p-4 border-b border-warm-100 hover:bg-warm-50 transition-colors">
                  {/* Prospect */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div className="relative">
                      <ProspectAvatar
                        avatar={prospect.avatar}
                        username={prospect.username || prospect.name}
                        fullName={prospect.name}
                        size="md"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                        prospect.platform === 'linkedin' ? 'bg-[#0A66C2]' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        {prospect.platform === 'linkedin'
                          ? <LinkedInIcon className="w-2.5 h-2.5 text-white" />
                          : <Instagram className="w-2.5 h-2.5 text-white" />
                        }
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-warm-900">{prospect.name}</p>
                      <p className="text-xs text-warm-500">{prospect.platform}</p>
                    </div>
                  </div>

                  {/* Categorie */}
                  <div className="col-span-2 flex items-center">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${config.color}`}>
                      {config.emoji} {config.label}
                    </span>
                  </div>

                  {/* Derniere reponse */}
                  <div className="col-span-3 flex items-center">
                    <p className="text-sm text-warm-600 truncate">
                      {prospect.lastResponse?.substring(0, 50) || '-'}
                      {prospect.lastResponse?.length > 50 ? '...' : ''}
                    </p>
                  </div>

                  {/* Confiance */}
                  <div className="col-span-2 flex items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-warm-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full"
                          style={{ width: `${(prospect.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-warm-500">
                        {Math.round((prospect.confidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <Link
                      to={`/conversation/${prospect.id}`}
                      className="p-2 hover:bg-brand-100 rounded-lg transition-colors text-brand-600"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ));
            })}
          </div>
        )}

        {/* Section archivée (collapsed) */}
        {dashboardData && (
          <details className="card">
            <summary className="p-4 cursor-pointer flex items-center justify-between hover:bg-warm-50 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <span className="font-medium text-warm-700">Archivés</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  {stats.archived}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-warm-400" />
            </summary>
            <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {['not_interested', 'negative', 'neutral'].map(categoryKey => {
                const config = CATEGORY_CONFIG[categoryKey];
                const categoryData = dashboardData?.byCategory?.[categoryKey];
                const prospects = categoryData?.prospects || [];

                return prospects.map((prospect) => (
                  <div key={prospect.id} className="flex items-center gap-3 p-3 bg-warm-50 rounded-lg">
                    <ProspectAvatar
                      avatar={prospect.avatar}
                      username={prospect.username || prospect.name}
                      fullName={prospect.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-warm-700 text-sm truncate">{prospect.name}</p>
                      <span className={`text-xs ${config.color.split(' ')[1]}`}>
                        {config.emoji} {config.label}
                      </span>
                    </div>
                  </div>
                ));
              })}
            </div>
          </details>
        )}
      </div>
    </>
  );
}

// Carte prospect pour le Kanban
function ProspectCard({ prospect, category, formatDate, onMarkHandled, onUpdateNotes }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(prospect.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveNotes = async () => {
    setIsSaving(true);
    try {
      await onUpdateNotes(prospect.id, notes);
      setIsEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-warm-200 p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="relative">
          <ProspectAvatar
            avatar={prospect.avatar}
            username={prospect.username || prospect.name}
            fullName={prospect.name}
            size="sm"
          />
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
            prospect.platform === 'linkedin' ? 'bg-[#0A66C2]' : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}>
            {prospect.platform === 'linkedin'
              ? <LinkedInIcon className="w-2 h-2 text-white" />
              : <Instagram className="w-2 h-2 text-white" />
            }
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-warm-900 text-sm truncate">{prospect.name}</p>
          <p className="text-xs text-warm-400">{formatDate(prospect.lastResponseAt)}</p>
        </div>
        {/* Bouton Notes */}
        <button
          onClick={() => setIsEditingNotes(!isEditingNotes)}
          className={`p-1 rounded transition-colors ${
            prospect.notes || isEditingNotes
              ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
              : 'text-warm-300 hover:text-warm-500 hover:bg-warm-50'
          }`}
          title={prospect.notes || 'Ajouter une note'}
        >
          <StickyNote className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Zone d'édition des notes */}
      {isEditingNotes && (
        <div className="mt-2 space-y-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: profil intéressant, ancienne cadre..."
            className="w-full p-2 text-xs border border-warm-200 rounded-lg resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => { setIsEditingNotes(false); setNotes(prospect.notes || ''); }}
              className="px-2 py-1 text-xs text-warm-500 hover:bg-warm-100 rounded"
            >
              Annuler
            </button>
            <button
              onClick={handleSaveNotes}
              disabled={isSaving}
              className="px-2 py-1 text-xs bg-brand-600 text-white rounded hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1"
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Sauver
            </button>
          </div>
        </div>
      )}

      {/* Affichage de la note existante (quand pas en édition) */}
      {!isEditingNotes && prospect.notes && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border-l-2 border-amber-400 line-clamp-2">
          📝 {prospect.notes}
        </p>
      )}

      {prospect.lastResponse && (
        <p className="mt-2 text-xs text-warm-600 line-clamp-2 bg-warm-50 p-2 rounded">
          "{prospect.lastResponse}"
        </p>
      )}

      {/* Confiance */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-warm-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: `${(prospect.confidence || 0) * 100}%` }}
          />
        </div>
        <span className="text-xs text-warm-400">
          {Math.round((prospect.confidence || 0) * 100)}%
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        <Link
          to={`/conversation/${prospect.id}`}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          Répondre
        </Link>
        <button
          onClick={() => onMarkHandled(prospect.id)}
          className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors text-warm-400 hover:text-green-600"
          title="Marquer comme traité"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

