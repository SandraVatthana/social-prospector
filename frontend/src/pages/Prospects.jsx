import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  Instagram,
  MessageSquare,
  Sparkles,
  ExternalLink,
  MoreVertical,
  Check,
  X,
  Clock,
  Send,
  Trash2,
  Tag,
  Heart,
  Calendar,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle,
  Mail,
  Image,
  Play,
  Loader2,
  RefreshCw,
  MessagesSquare
} from 'lucide-react';
import Header from '../components/layout/Header';
import GenerateMessageModal from '../components/dashboard/GenerateMessageModal';
import InfoTooltip from '../components/ui/InfoTooltip';
import { useTourContext } from '../App';
import { API_BASE_URL } from '../lib/api';

// Icone TikTok custom
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Statuts possibles
const STATUS_CONFIG = {
  new: { label: 'Nouveau', color: 'bg-blue-100 text-blue-700', icon: Clock },
  contacted: { label: 'Contacte', color: 'bg-orange-100 text-orange-700', icon: Send },
  replied: { label: 'A repondu', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  interested: { label: 'Interesse', color: 'bg-purple-100 text-purple-700', icon: Heart },
  converted: { label: 'Converti', color: 'bg-brand-100 text-brand-700', icon: Check },
  not_interested: { label: 'Pas interesse', color: 'bg-warm-100 text-warm-500', icon: X },
};

// Pas de données mock - liste vide par défaut

export default function Prospects() {
  const [prospects, setProspects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('addedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [prospectForMessage, setProspectForMessage] = useState(null);

  // Filtrer les prospects
  const filteredProspects = prospects
    .filter(p => {
      if (searchQuery && !p.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.fullName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'addedAt' || sortBy === 'lastContactedAt') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  // Stats
  const stats = {
    total: prospects.length,
    new: prospects.filter(p => p.status === 'new').length,
    contacted: prospects.filter(p => p.status === 'contacted').length,
    replied: prospects.filter(p => p.status === 'replied').length,
    converted: prospects.filter(p => p.status === 'converted').length,
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.length === filteredProspects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProspects.map(p => p.id));
    }
  };

  // Changer le statut
  const changeStatus = (id, newStatus) => {
    setProspects(prev =>
      prev.map(p => p.id === id ? { ...p, status: newStatus } : p)
    );
  };

  // State pour les posts du prospect selectionne
  const [postsForMessage, setPostsForMessage] = useState([]);

  // Ouvrir le modal de generation de message
  const openGenerateModal = (prospect, posts = []) => {
    setProspectForMessage(prospect);
    setPostsForMessage(posts);
    setShowGenerateModal(true);
  };

  // Formater nombre
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Formater date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const tourContext = useTourContext();

  return (
    <>
      <Header
        title="Mes Prospects"
        subtitle={`${stats.total} prospects sauvegardés • ${stats.contacted + stats.replied} contactés`}
        onStartTour={tourContext?.startTour}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-warm-100 text-warm-700' },
            { label: 'Nouveaux', value: stats.new, color: 'bg-blue-100 text-blue-700' },
            { label: 'Contactes', value: stats.contacted, color: 'bg-orange-100 text-orange-700' },
            { label: 'Ont repondu', value: stats.replied, color: 'bg-green-100 text-green-700' },
            { label: 'Convertis', value: stats.converted, color: 'bg-brand-100 text-brand-700' },
          ].map(stat => (
            <div key={stat.label} className="card p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color.split(' ')[1]}`}>{stat.value}</p>
              <p className="text-sm text-warm-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Barre d'outils */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Recherche */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrer mes prospects..."
                className="w-full pl-10 pr-4 py-2 border border-warm-200 rounded-lg focus:border-brand-500 outline-none text-sm"
              />
            </div>

            {/* Filtre statut */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Filtre plateforme */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
            >
              <option value="all">Toutes les plateformes</option>
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
            </select>

            {/* Tri */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 px-3 py-2 border border-warm-200 rounded-lg text-sm hover:bg-warm-50"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortBy === 'addedAt' ? 'Date ajout' : 'Followers'}
            </button>
          </div>

          {/* Actions groupees */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-warm-100">
              <span className="text-sm text-warm-500">{selectedIds.length} selectionne(s)</span>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg">
                <Sparkles className="w-4 h-4" />
                Generer messages
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg">
                <Tag className="w-4 h-4" />
                Ajouter tag
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg">
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          )}
        </div>

        {/* Liste prospects */}
        <div className="flex gap-6">
          {/* Table */}
          <div className={`flex-1 ${selectedProspect ? 'max-w-2xl' : ''}`}>
            <div className="card overflow-hidden">
              {/* Header table */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-warm-50 border-b border-warm-100 text-sm font-medium text-warm-600">
                <div className="col-span-1">
                  <button
                    onClick={selectAll}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedIds.length === filteredProspects.length && filteredProspects.length > 0
                        ? 'bg-brand-500 border-brand-500'
                        : 'border-warm-300'
                    }`}
                  >
                    {selectedIds.length === filteredProspects.length && filteredProspects.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                </div>
                <div className="col-span-4">Prospect</div>
                <div className="col-span-2 flex items-center gap-1" data-tour="status">
                  Statut
                  <InfoTooltip
                    text="Les statuts passent en 'Contacté' automatiquement quand tu génères un message. Pour 'A répondu', mets à jour manuellement."
                    position="bottom"
                    size="xs"
                  />
                </div>
                <div className="col-span-2">Stats</div>
                <div className="col-span-2">Ajouté le</div>
                <div className="col-span-1"></div>
              </div>

              {/* Rows */}
              {filteredProspects.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-warm-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-warm-700 mb-2">Aucun prospect sauvegardé</h3>
                  <p className="text-warm-500 mb-4">Lancez une recherche et sauvegardez des prospects pour les voir ici</p>
                  <button
                    onClick={() => window.location.href = '/search'}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
                  >
                    Lancer une recherche
                  </button>
                </div>
              ) : (
                filteredProspects.map(prospect => (
                  <div
                    key={prospect.id}
                    onClick={() => setSelectedProspect(prospect)}
                    className={`grid grid-cols-12 gap-4 p-4 border-b border-warm-100 hover:bg-warm-50 cursor-pointer transition-colors ${
                      selectedProspect?.id === prospect.id ? 'bg-brand-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(prospect.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedIds.includes(prospect.id)
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-warm-300 hover:border-brand-400'
                        }`}
                      >
                        {selectedIds.includes(prospect.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                    </div>

                    {/* Prospect info */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={prospect.avatar}
                          alt={prospect.username}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                          prospect.platform === 'instagram'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-black'
                        }`}>
                          {prospect.platform === 'instagram'
                            ? <Instagram className="w-2.5 h-2.5 text-white" />
                            : <TikTokIcon className="w-2.5 h-2.5 text-white" />
                          }
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-warm-900 truncate">@{prospect.username}</p>
                        <p className="text-xs text-warm-500 truncate">{prospect.fullName}</p>
                      </div>
                    </div>

                    {/* Statut */}
                    <div className="col-span-2 flex items-center">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_CONFIG[prospect.status].color}`}>
                        {STATUS_CONFIG[prospect.status].label}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="col-span-2 flex items-center gap-3 text-sm text-warm-500">
                      <span>{formatNumber(prospect.followers)}</span>
                      <span className="text-warm-300">•</span>
                      <span>{prospect.engagement}%</span>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 flex items-center text-sm text-warm-500">
                      {formatDate(prospect.addedAt)}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                      <button className="p-1 hover:bg-warm-100 rounded">
                        <MoreVertical className="w-4 h-4 text-warm-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel detail */}
          {selectedProspect && (
            <ProspectDetailPanel
              prospect={selectedProspect}
              onClose={() => setSelectedProspect(null)}
              onStatusChange={(status) => changeStatus(selectedProspect.id, status)}
              onGenerateMessage={(posts) => openGenerateModal(selectedProspect, posts)}
              formatNumber={formatNumber}
              formatDate={formatDate}
            />
          )}
        </div>
      </div>

      {/* Modal generation message */}
      <GenerateMessageModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setProspectForMessage(null);
          setPostsForMessage([]);
        }}
        prospect={prospectForMessage}
        posts={postsForMessage}
      />
    </>
  );
}

/**
 * Panel de detail prospect
 */
function ProspectDetailPanel({ prospect, onClose, onStatusChange, onGenerateMessage, formatNumber, formatDate }) {
  const [notes, setNotes] = useState(prospect.notes);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState(null);

  // Charger les posts au montage
  useEffect(() => {
    loadPosts();
  }, [prospect.username, prospect.platform]);

  const loadPosts = async () => {
    setLoadingPosts(true);
    setPostsError(null);

    try {
      // Appel API pour recuperer les posts
      const response = await fetch(`${API_BASE_URL}/prospects/${prospect.username}/posts?platform=${prospect.platform}&limit=3`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.data?.posts || []);
      } else {
        throw new Error('API error');
      }
    } catch (err) {
      // Mode demo - generer des posts mock
      setPosts(getMockPosts(prospect));
    } finally {
      setLoadingPosts(false);
    }
  };

  // Temps relatif
  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `il y a ${minutes}min`;
    if (hours < 24) return `il y a ${hours}h`;
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)} sem`;
  };

  return (
    <div className="w-96 card p-6 space-y-6 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={prospect.avatar}
              alt={prospect.username}
              className="w-14 h-14 rounded-xl object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
              prospect.platform === 'instagram'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : 'bg-black'
            }`}>
              {prospect.platform === 'instagram'
                ? <Instagram className="w-3 h-3 text-white" />
                : <TikTokIcon className="w-3 h-3 text-white" />
              }
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-warm-900">@{prospect.username}</h3>
            <p className="text-sm text-warm-500">{prospect.fullName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-warm-100 rounded-lg">
          <X className="w-5 h-5 text-warm-400" />
        </button>
      </div>

      {/* Bio */}
      <p className="text-sm text-warm-600">{prospect.bio}</p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-warm-50 rounded-xl">
          <p className="font-bold text-warm-900">{formatNumber(prospect.followers)}</p>
          <p className="text-xs text-warm-500">Abonnes</p>
        </div>
        <div className="text-center p-3 bg-warm-50 rounded-xl">
          <p className="font-bold text-warm-900">{prospect.engagement}%</p>
          <p className="text-xs text-warm-500">Engagement</p>
        </div>
        <div className="text-center p-3 bg-warm-50 rounded-xl">
          <p className="font-bold text-warm-900">{prospect.messagesSent}</p>
          <p className="text-xs text-warm-500">Messages</p>
        </div>
      </div>

      {/* Posts recents */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-warm-700">Posts recents</label>
          <button
            onClick={loadPosts}
            disabled={loadingPosts}
            className="p-1 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-warm-400 ${loadingPosts ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post, idx) => (
              <a
                key={post.id || idx}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 p-2 -mx-2 rounded-xl hover:bg-warm-50 transition-colors group"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-warm-100">
                  <img
                    src={post.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  {post.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-warm-700 line-clamp-2 leading-tight">
                    {post.caption?.substring(0, 100) || 'Pas de legende'}
                    {post.caption?.length > 100 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-warm-400">
                    <span>{getRelativeTime(post.publishedAt)}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}K` : post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {post.comments}
                    </span>
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-warm-300 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1" />
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-warm-400">
            <Image className="w-8 h-8 mx-auto mb-2 text-warm-300" />
            Aucun post trouve
          </div>
        )}
      </div>

      {/* Statut */}
      <div className="relative">
        <label className="block text-sm font-medium text-warm-700 mb-2">Statut</label>
        <button
          onClick={() => setShowStatusMenu(!showStatusMenu)}
          className={`w-full flex items-center justify-between px-4 py-2 rounded-xl border ${STATUS_CONFIG[prospect.status].color} border-transparent`}
        >
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = STATUS_CONFIG[prospect.status].icon;
              return <Icon className="w-4 h-4" />;
            })()}
            <span className="font-medium">{STATUS_CONFIG[prospect.status].label}</span>
          </div>
          <ChevronDown className="w-4 h-4" />
        </button>

        {showStatusMenu && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-warm-200 rounded-xl shadow-lg z-10 overflow-hidden">
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  onStatusChange(key);
                  setShowStatusMenu(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-warm-50 ${
                  prospect.status === key ? 'bg-warm-50' : ''
                }`}
              >
                {(() => {
                  const Icon = config.icon;
                  return <Icon className="w-4 h-4" />;
                })()}
                <span>{config.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">Tags</label>
        <div className="flex flex-wrap gap-2">
          {prospect.tags.map(tag => (
            <span key={tag} className="px-2 py-1 bg-warm-100 text-warm-600 text-sm rounded-lg">
              {tag}
            </span>
          ))}
          <button className="px-2 py-1 border border-dashed border-warm-300 text-warm-400 text-sm rounded-lg hover:border-brand-400 hover:text-brand-500">
            + Ajouter
          </button>
        </div>
      </div>

      {/* Dates */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-warm-600">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Ajoute le
          </span>
          <span className="font-medium">{formatDate(prospect.addedAt)}</span>
        </div>
        {prospect.lastContactedAt && (
          <div className="flex items-center justify-between text-warm-600">
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Dernier contact
            </span>
            <span className="font-medium">{formatDate(prospect.lastContactedAt)}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ajouter des notes..."
          className="w-full px-3 py-2 border border-warm-200 rounded-xl text-sm resize-none h-24 focus:border-brand-500 outline-none"
        />
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <button
            onClick={() => onGenerateMessage(posts)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Generer message
          </button>
          <a
            href={`https://${prospect.platform}.com/${prospect.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-warm-200 hover:bg-warm-50 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-warm-500" />
          </a>
        </div>

        {/* Lien vers la conversation */}
        <Link
          to={`/conversation/${prospect.id}`}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-colors"
        >
          <MessagesSquare className="w-4 h-4" />
          Voir la conversation
        </Link>
      </div>
    </div>
  );
}

/**
 * Genere des posts mock pour la demo
 */
function getMockPosts(prospect) {
  const isFitness = prospect.bio?.toLowerCase().includes('fitness') || prospect.bio?.toLowerCase().includes('sport');
  const isCoach = prospect.bio?.toLowerCase().includes('coach');
  const isEntrepreneur = prospect.bio?.toLowerCase().includes('entrepreneur') || prospect.bio?.toLowerCase().includes('business');
  const isPhoto = prospect.bio?.toLowerCase().includes('photo') || prospect.bio?.toLowerCase().includes('video');

  if (isCoach) {
    return [
      {
        id: 'mock_1',
        thumbnail: 'https://picsum.photos/seed/coach1/400/400',
        caption: 'Les 3 piliers pour transformer ta vie professionnelle en 2024. Thread complet en commentaires',
        publishedAt: Date.now() - 86400000,
        likes: 342,
        comments: 67,
        hashtags: ['coaching', 'developpementpersonnel'],
        type: 'carousel',
        url: `https://${prospect.platform}.com/p/mock_1`,
      },
      {
        id: 'mock_2',
        thumbnail: 'https://picsum.photos/seed/coach2/400/400',
        caption: 'Client avant/apres - 3 mois de coaching et une transformation incroyable. Fiere de toi @client',
        publishedAt: Date.now() - 259200000,
        likes: 567,
        comments: 89,
        hashtags: ['transformation', 'coaching'],
        type: 'image',
        url: `https://${prospect.platform}.com/p/mock_2`,
      },
      {
        id: 'mock_3',
        thumbnail: 'https://picsum.photos/seed/coach3/400/400',
        caption: 'Live demain a 19h pour parler de gestion du stress au travail. Pose tes questions en commentaire',
        publishedAt: Date.now() - 432000000,
        likes: 234,
        comments: 45,
        hashtags: ['live', 'stressautravail'],
        type: 'video',
        url: `https://${prospect.platform}.com/p/mock_3`,
      },
    ];
  }

  if (isFitness) {
    return [
      {
        id: 'mock_1',
        thumbnail: 'https://picsum.photos/seed/fit1/400/400',
        caption: 'Seance jambes complete - 45min de pur bonheur (ou pas). Swipe pour voir les exercices',
        publishedAt: Date.now() - 43200000,
        likes: 892,
        comments: 156,
        hashtags: ['fitness', 'legday', 'workout'],
        type: 'carousel',
        url: `https://${prospect.platform}.com/p/mock_1`,
      },
      {
        id: 'mock_2',
        thumbnail: 'https://picsum.photos/seed/fit2/400/400',
        caption: 'Mon petit dejeuner healthy prefere - rapide et bourre de proteines. Recette en bio',
        publishedAt: Date.now() - 172800000,
        likes: 567,
        comments: 89,
        hashtags: ['healthyfood', 'nutrition'],
        type: 'image',
        url: `https://${prospect.platform}.com/p/mock_2`,
      },
      {
        id: 'mock_3',
        thumbnail: 'https://picsum.photos/seed/fit3/400/400',
        caption: '30 jours de transformation - le resultat depasse mes attentes. Merci pour votre soutien',
        publishedAt: Date.now() - 345600000,
        likes: 1234,
        comments: 234,
        hashtags: ['transformation', 'fitness'],
        type: 'video',
        url: `https://${prospect.platform}.com/p/mock_3`,
      },
    ];
  }

  if (isEntrepreneur) {
    return [
      {
        id: 'mock_1',
        thumbnail: 'https://picsum.photos/seed/biz1/400/400',
        caption: 'Mon setup de travail minimaliste. Moins c\'est plus quand on veut etre productif',
        publishedAt: Date.now() - 86400000,
        likes: 456,
        comments: 78,
        hashtags: ['entrepreneur', 'productivity'],
        type: 'image',
        url: `https://${prospect.platform}.com/p/mock_1`,
      },
      {
        id: 'mock_2',
        thumbnail: 'https://picsum.photos/seed/biz2/400/400',
        caption: 'De 0 a 10K€/mois en 6 mois. Voici exactement ce que j\'ai fait (thread)',
        publishedAt: Date.now() - 259200000,
        likes: 1567,
        comments: 289,
        hashtags: ['business', 'growth'],
        type: 'carousel',
        url: `https://${prospect.platform}.com/p/mock_2`,
      },
      {
        id: 'mock_3',
        thumbnail: 'https://picsum.photos/seed/biz3/400/400',
        caption: 'L\'erreur #1 qui tue 90% des side projects. Tu la fais probablement aussi',
        publishedAt: Date.now() - 432000000,
        likes: 892,
        comments: 156,
        hashtags: ['sideproject', 'startup'],
        type: 'video',
        url: `https://${prospect.platform}.com/p/mock_3`,
      },
    ];
  }

  // Default posts
  return [
    {
      id: 'mock_1',
      thumbnail: 'https://picsum.photos/seed/def1/400/400',
      caption: 'Nouveau projet en cours... Ca va etre fou. Stay tuned pour l\'annonce',
      publishedAt: Date.now() - 86400000,
      likes: 234,
      comments: 45,
      hashtags: ['teaser', 'comingsoon'],
      type: 'image',
      url: `https://${prospect.platform}.com/p/mock_1`,
    },
    {
      id: 'mock_2',
      thumbnail: 'https://picsum.photos/seed/def2/400/400',
      caption: 'Behind the scenes de ma journee type. Beaucoup de cafe et de bonne humeur',
      publishedAt: Date.now() - 259200000,
      likes: 345,
      comments: 56,
      hashtags: ['bts', 'dayinmylife'],
      type: 'carousel',
      url: `https://${prospect.platform}.com/p/mock_2`,
    },
    {
      id: 'mock_3',
      thumbnail: 'https://picsum.photos/seed/def3/400/400',
      caption: 'Merci pour tous vos messages. Cette communaute est incroyable',
      publishedAt: Date.now() - 432000000,
      likes: 567,
      comments: 89,
      hashtags: ['grateful', 'community'],
      type: 'video',
      url: `https://${prospect.platform}.com/p/mock_3`,
    },
  ];
}
