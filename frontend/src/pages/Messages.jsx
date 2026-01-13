import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Instagram,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  ChevronDown,
  ExternalLink,
  MoreVertical,
  Edit3,
  MessageCircle,
  ThumbsUp,
  Trophy,
  Loader2
} from 'lucide-react';
import Header from '../components/layout/Header';
import { api } from '../lib/api';

// Icone TikTok custom
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Statuts des messages
const MESSAGE_STATUS = {
  draft: { label: 'Brouillon', color: 'bg-warm-100 text-warm-600', icon: Edit3 },
  sent: { label: 'Envoyé', color: 'bg-blue-100 text-blue-700', icon: Send },
  delivered: { label: 'Délivré', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  read: { label: 'Lu', color: 'bg-purple-100 text-purple-700', icon: Eye },
  replied: { label: 'Réponse reçue', color: 'bg-brand-100 text-brand-700', icon: MessageCircle },
  converted: { label: 'Converti', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Échec', color: 'bg-red-100 text-red-600', icon: XCircle },
};

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Charger les messages depuis l'API
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await api.getMessages();
        // Transformer les données pour correspondre au format attendu
        const formattedMessages = (response.data || []).map(msg => ({
          id: msg.id,
          prospect: {
            username: msg.prospect?.username || msg.prospect_username || 'unknown',
            fullName: msg.prospect?.full_name || msg.prospect_name || '',
            avatar: msg.prospect?.profile_pic_url || `https://i.pravatar.cc/150?u=${msg.id}`,
            platform: msg.prospect?.platform || msg.platform || 'instagram',
          },
          content: msg.content || msg.message_content || '',
          status: msg.status || 'draft',
          createdAt: msg.created_at,
          sentAt: msg.sent_at,
          repliedAt: msg.replied_at,
          hook: msg.hook || msg.approach_method || '-',
          voiceProfile: msg.voice_profile || 'MA VOIX',
          prospectId: msg.prospect_id,
        }));
        setMessages(formattedMessages);
      } catch (error) {
        console.error('Erreur chargement messages:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, []);

  // Stats
  const stats = {
    total: messages.length,
    sent: messages.filter(m => ['sent', 'delivered', 'read', 'replied', 'converted'].includes(m.status)).length,
    replied: messages.filter(m => m.status === 'replied' || m.status === 'converted').length,
    converted: messages.filter(m => m.status === 'converted').length,
    drafts: messages.filter(m => m.status === 'draft').length,
  };

  // Filtrage
  const filteredMessages = messages.filter(m => {
    if (searchQuery && !m.prospect.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !m.content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  // Copier le message
  const copyMessage = async (id, content) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Marquer comme réponse reçue
  const handleMarkReplied = async (messageId) => {
    try {
      await api.markMessageReplied(messageId);
      // Mettre à jour le message localement
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, status: 'replied' } : m
      ));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => ({ ...prev, status: 'replied' }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Marquer comme converti
  const handleMarkConverted = async (messageId) => {
    try {
      await api.markMessageConverted(messageId);
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, status: 'converted' } : m
      ));
      if (selectedMessage?.id === messageId) {
        setSelectedMessage(prev => ({ ...prev, status: 'converted' }));
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Formater la date
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  // Taux de reponse
  const responseRate = stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;

  return (
    <>
      <Header
        title="Messages"
        subtitle={`${stats.total} messages generes • ${responseRate}% de reponses`}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total generes', value: stats.total, icon: MessageSquare, color: 'text-warm-600' },
            { label: 'Envoyes', value: stats.sent, icon: Send, color: 'text-blue-600' },
            { label: 'Reponses', value: stats.replied, icon: MessageCircle, color: 'text-green-600' },
            { label: 'Taux reponse', value: `${responseRate}%`, icon: CheckCircle2, color: 'text-brand-600' },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-warm-900">{stat.value}</p>
                  <p className="text-xs text-warm-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Recherche */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un message..."
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
              {Object.entries(MESSAGE_STATUS).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Nouveau message */}
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors">
              <Sparkles className="w-4 h-4" />
              Nouveau message
            </button>
          </div>
        </div>

        {/* Liste des messages */}
        <div className="flex gap-6">
          {/* Liste */}
          <div className={`flex-1 space-y-3 ${selectedMessage ? 'max-w-2xl' : ''}`}>
            {loading ? (
              <div className="card p-12 text-center">
                <Loader2 className="w-12 h-12 text-brand-500 mx-auto mb-4 animate-spin" />
                <p className="text-warm-500">Chargement des messages...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="card p-12 text-center">
                <MessageSquare className="w-12 h-12 text-warm-300 mx-auto mb-4" />
                <p className="text-warm-500">Aucun message trouve</p>
              </div>
            ) : (
              filteredMessages.map(message => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isSelected={selectedMessage?.id === message.id}
                  onClick={() => setSelectedMessage(message)}
                  onCopy={() => copyMessage(message.id, message.content)}
                  isCopied={copiedId === message.id}
                  formatDate={formatDate}
                />
              ))
            )}
          </div>

          {/* Detail */}
          {selectedMessage && (
            <MessageDetailPanel
              message={selectedMessage}
              onClose={() => setSelectedMessage(null)}
              onCopy={() => copyMessage(selectedMessage.id, selectedMessage.content)}
              isCopied={copiedId === selectedMessage.id}
              formatDate={formatDate}
              onMarkReplied={() => handleMarkReplied(selectedMessage.id)}
              onMarkConverted={() => handleMarkConverted(selectedMessage.id)}
            />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Carte message
 */
function MessageCard({ message, isSelected, onClick, onCopy, isCopied, formatDate }) {
  const status = MESSAGE_STATUS[message.status];
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onClick}
      className={`card p-4 cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-brand-500 bg-brand-50/30' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Avatar prospect */}
        <div className="relative flex-shrink-0">
          <img
            src={message.prospect.avatar}
            alt={message.prospect.username}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
            message.prospect.platform === 'instagram'
              ? 'bg-gradient-to-br from-purple-500 to-pink-500'
              : 'bg-black'
          }`}>
            {message.prospect.platform === 'instagram'
              ? <Instagram className="w-3 h-3 text-white" />
              : <TikTokIcon className="w-3 h-3 text-white" />
            }
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-warm-900">@{message.prospect.username}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <span className="text-xs text-warm-400">{formatDate(message.sentAt || message.createdAt)}</span>
          </div>

          <p className="text-sm text-warm-600 line-clamp-2">{message.content}</p>

          {/* Footer */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs text-warm-400">
              <span className="px-2 py-0.5 bg-warm-100 rounded">{message.hook}</span>
              <span>•</span>
              <span>{message.voiceProfile}</span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs text-warm-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
            >
              {isCopied ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Copie !</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Panel detail message
 */
function MessageDetailPanel({ message, onClose, onCopy, isCopied, formatDate, onMarkReplied, onMarkConverted }) {
  const status = MESSAGE_STATUS[message.status] || MESSAGE_STATUS.draft;
  const StatusIcon = status.icon;
  const [isMarking, setIsMarking] = useState(false);

  const canMarkReplied = message.status === 'sent' || message.status === 'delivered' || message.status === 'read';
  const canMarkConverted = message.status === 'replied';

  return (
    <div className="w-96 card p-6 space-y-6 sticky top-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={message.prospect.avatar}
              alt={message.prospect.username}
              className="w-14 h-14 rounded-xl object-cover"
            />
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
              message.prospect.platform === 'instagram'
                ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                : 'bg-black'
            }`}>
              {message.prospect.platform === 'instagram'
                ? <Instagram className="w-3 h-3 text-white" />
                : <TikTokIcon className="w-3 h-3 text-white" />
              }
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-warm-900">@{message.prospect.username}</h3>
            <p className="text-sm text-warm-500">{message.prospect.fullName}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-warm-100 rounded-lg">
          <XCircle className="w-5 h-5 text-warm-400" />
        </button>
      </div>

      {/* Statut */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl ${status.color}`}>
        <StatusIcon className="w-5 h-5" />
        <span className="font-medium">{status.label}</span>
        {message.status === 'failed' && message.errorMessage && (
          <span className="text-sm">- {message.errorMessage}</span>
        )}
      </div>

      {/* Message */}
      <div>
        <label className="block text-sm font-medium text-warm-700 mb-2">Message</label>
        <div className="p-4 bg-warm-50 rounded-xl text-sm text-warm-700 leading-relaxed">
          {message.content}
        </div>
      </div>

      {/* Infos */}
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-warm-600">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Cree le
          </span>
          <span className="font-medium">{formatDate(message.createdAt)}</span>
        </div>
        {message.sentAt && (
          <div className="flex items-center justify-between text-warm-600">
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Envoye le
            </span>
            <span className="font-medium">{formatDate(message.sentAt)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-warm-600">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Hook utilise
          </span>
          <span className="font-medium">{message.hook}</span>
        </div>
        <div className="flex items-center justify-between text-warm-600">
          <span className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Profil vocal
          </span>
          <span className="font-medium">{message.voiceProfile}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Boutons de tracking */}
        {canMarkReplied && (
          <button
            onClick={onMarkReplied}
            disabled={isMarking}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
            J'ai reçu une réponse
          </button>
        )}
        {canMarkConverted && (
          <button
            onClick={onMarkConverted}
            disabled={isMarking}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <Trophy className="w-4 h-4" />
            Converti (RDV, vente...)
          </button>
        )}

        {/* Autres actions */}
        <div className="flex gap-3">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier
              </>
            )}
          </button>
          {message.status === 'draft' && (
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
              <Send className="w-4 h-4" />
              Envoyer
            </button>
          )}
        </div>
      </div>

      {/* Lien profil */}
      <a
        href={`https://${message.prospect.platform}.com/${message.prospect.username}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-brand-600 hover:text-brand-700"
      >
        <ExternalLink className="w-4 h-4" />
        Voir le profil {message.prospect.platform === 'instagram' ? 'Instagram' : 'TikTok'}
      </a>
    </div>
  );
}
