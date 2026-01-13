import { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Instagram,
  Linkedin,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  MessageSquare,
  ExternalLink,
  Heart,
  MessageCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Eye,
  MapPin,
  Hash,
  AtSign,
  UserCheck,
  MessageSquarePlus,
  Lock,
  Globe,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Lightbulb,
  Clock,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Header from '../components/layout/Header';
import SequenceModal from '../components/prospect/SequenceModal';
import InfoTooltip from '../components/ui/InfoTooltip';
import { useTourContext } from '../App';
import { API_BASE_URL } from '../lib/api';
import { useToast } from '../components/ui/Toast';

// Icône TikTok custom
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Helper pour obtenir l'URL de l'avatar via proxy si nécessaire
function getProxiedImageUrl(url) {
  if (!url) return null;
  const instagramDomains = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'scontent'];
  const needsProxy = instagramDomains.some(domain => url.includes(domain));
  if (needsProxy) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

// Composant Avatar avec fallback automatique
function ProspectAvatar({ avatar, username, size = 'md' }) {
  const [hasError, setHasError] = useState(false);
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };
  const sizeValue = size === 'sm' ? 40 : size === 'lg' ? 80 : 56;

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username || '?')}&background=f15a24&color=fff&size=${sizeValue * 2}`;

  if (hasError || !avatar) {
    return (
      <img
        src={fallbackUrl}
        alt={username}
        className={`${sizeClasses[size]} rounded-xl object-cover bg-warm-200`}
      />
    );
  }

  return (
    <img
      src={getProxiedImageUrl(avatar)}
      alt={username}
      className={`${sizeClasses[size]} rounded-xl object-cover bg-warm-200`}
      onError={() => setHasError(true)}
    />
  );
}

// Clé pour persister les données de recherche
const SEARCH_STORAGE_KEY = 'social_prospector_search_state';

// Charger l'état depuis localStorage
function loadSearchState() {
  try {
    const saved = localStorage.getItem(SEARCH_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.log('Erreur chargement état recherche:', e);
  }
  return null;
}

// Sauvegarder l'état dans localStorage
function saveSearchState(state) {
  try {
    localStorage.setItem(SEARCH_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('Erreur sauvegarde état recherche:', e);
  }
}

// Types de sources
const SOURCE_TYPES = {
  ACCOUNT: 'account',
  HASHTAG: 'hashtag',
  LOCATION: 'location',
};

// Sous-types pour la recherche par compte
const ACCOUNT_SUBTYPES = {
  FOLLOWERS: 'followers',
  FOLLOWING: 'following',
  COMMENTERS: 'commenters',
};

// Plateformes
const PLATFORMS = {
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  LINKEDIN: 'linkedin',
};

export default function Search() {
  const savedState = loadSearchState();
  const toast = useToast();

  // Plateforme actuelle
  const [platform, setPlatform] = useState(savedState?.platform || PLATFORMS.INSTAGRAM);

  // Source de recherche
  const [sourceType, setSourceType] = useState(savedState?.sourceType || SOURCE_TYPES.ACCOUNT);
  const [accountSubtype, setAccountSubtype] = useState(savedState?.accountSubtype || ACCOUNT_SUBTYPES.FOLLOWERS);

  // Inputs selon la source
  const [accountInput, setAccountInput] = useState(savedState?.accountInput || '');
  const [hashtagInput, setHashtagInput] = useState(savedState?.hashtagInput || '');
  const [locationInput, setLocationInput] = useState(savedState?.locationInput || '');

  // État recherche
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(savedState?.hasSearched || false);
  const [allProspects, setAllProspects] = useState(savedState?.allProspects || []);
  const [searchInfo, setSearchInfo] = useState(savedState?.searchInfo || null);
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [searchOffset, setSearchOffset] = useState(savedState?.searchOffset || 0);

  // Pagination locale (affichage progressif)
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const itemsPerPage = 10;
  const [visibleCount, setVisibleCount] = useState(savedState?.visibleCount || 15); // Nombre de prospects affichés

  // Modal
  const [showGenerateModal, setShowGenerateModal] = useState(savedState?.showGenerateModal || false);
  const [selectedProspect, setSelectedProspect] = useState(savedState?.selectedProspect || null);
  const [selectedPosts, setSelectedPosts] = useState(savedState?.selectedPosts || []);

  // Filtres simples (followers min/max)
  const [filters, setFilters] = useState(savedState?.filters || {
    minFollowers: '',
    maxFollowers: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Suggestions de l'onboarding
  const [suggestions, setSuggestions] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showAllHashtags, setShowAllHashtags] = useState(false);
  const [isRegeneratingSuggestions, setIsRegeneratingSuggestions] = useState(false);

  // Modal LinkedIn
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);

  // Charger les suggestions au montage
  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/suggestions`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data?.suggestions || null);
        setUserProfile(data.data?.profile || null);
      }
    } catch (error) {
      console.error('Erreur chargement suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const regenerateSuggestions = async () => {
    setIsRegeneratingSuggestions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/regenerate-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data?.suggestions || null);
        toast.success('Suggestions régénérées !');
      } else {
        throw new Error('Erreur');
      }
    } catch (error) {
      console.error('Erreur régénération:', error);
      toast.error('Erreur', 'Impossible de régénérer les suggestions');
    } finally {
      setIsRegeneratingSuggestions(false);
    }
  };

  // Sauvegarder l'état quand il change
  useEffect(() => {
    if (hasSearched || accountInput || hashtagInput || locationInput) {
      saveSearchState({
        platform,
        sourceType,
        accountSubtype,
        accountInput,
        hashtagInput,
        locationInput,
        hasSearched,
        allProspects,
        searchInfo,
        currentPage,
        visibleCount,
        filters,
        showGenerateModal,
        selectedProspect,
        selectedPosts,
        searchOffset,
      });
    }
  }, [platform, sourceType, accountSubtype, accountInput, hashtagInput, locationInput, hasSearched, allProspects, searchInfo, currentPage, visibleCount, filters, showGenerateModal, selectedProspect, selectedPosts, searchOffset]);

  // Prospects filtrés et paginés
  const filteredProspects = allProspects.filter(p => {
    if (filters.minFollowers && p.followers < parseInt(filters.minFollowers)) return false;
    if (filters.maxFollowers && p.followers > parseInt(filters.maxFollowers)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);
  // Afficher les prospects jusqu'à visibleCount (pas de pagination classique pour la vue principale)
  const prospects = filteredProspects.slice(0, visibleCount);

  // Recherche par suggestion (hashtag cliqué)
  const handleSuggestionClick = (tag) => {
    const cleanTag = tag.replace('#', '').trim();
    setHashtagInput(cleanTag);
    setSourceType(SOURCE_TYPES.HASHTAG);
    // Lancer la recherche automatiquement
    handleSearchWithQuery(cleanTag, SOURCE_TYPES.HASHTAG);
  };

  // Recherche avec query directe
  const handleSearchWithQuery = async (query, type) => {
    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);
    setSelectedProspects([]);
    setSearchOffset(0);

    try {
      const params = new URLSearchParams({
        sourceType: type,
        query: query,
        limit: '50',
        platform: platform,
      });

      const response = await fetch(`${API_BASE_URL}/search/source?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllProspects(data.data?.prospects || []);
        setVisibleCount(15); // Réinitialiser le compteur d'affichage
        setSearchInfo({
          type: type,
          query: query,
          count: data.data?.prospects?.length || 0,
        });
      } else {
        throw new Error('API non disponible');
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      setAllProspects([]);
      setVisibleCount(15); // Réinitialiser le compteur d'affichage
      setSearchInfo({
        type: type,
        query: query,
        count: 0,
        error: err.message,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Recherche selon la source
  const handleSearch = async (e) => {
    e.preventDefault();

    let query = '';
    let searchType = sourceType;

    if (sourceType === SOURCE_TYPES.ACCOUNT) {
      query = accountInput.replace('@', '').trim();
      if (!query) return;
    } else if (sourceType === SOURCE_TYPES.HASHTAG) {
      query = hashtagInput.replace('#', '').trim();
      if (!query) return;
    } else if (sourceType === SOURCE_TYPES.LOCATION) {
      query = locationInput.trim();
      if (!query) return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);
    setSelectedProspects([]);
    setSearchOffset(0);

    try {
      const params = new URLSearchParams({
        sourceType: searchType,
        query: query,
        limit: '50',
        platform: platform,
      });

      if (sourceType === SOURCE_TYPES.ACCOUNT) {
        params.append('subtype', accountSubtype);
      }

      const response = await fetch(`${API_BASE_URL}/search/source?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllProspects(data.data?.prospects || []);
        setVisibleCount(15); // Réinitialiser le compteur d'affichage
        setSearchInfo({
          type: sourceType,
          query: query,
          subtype: accountSubtype,
          count: data.data?.prospects?.length || 0,
        });
      } else {
        let errorMessage = 'API non disponible';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {}
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      let friendlyError = err.message || 'Erreur lors de la recherche';
      if (friendlyError.includes('Apify') || friendlyError.includes('timeout')) {
        friendlyError = 'La recherche a pris trop de temps. Veuillez réessayer.';
      }

      setAllProspects([]);
      setVisibleCount(15); // Réinitialiser le compteur d'affichage
      setSearchInfo({
        type: sourceType,
        query: query,
        subtype: accountSubtype,
        count: 0,
        error: friendlyError,
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Charger plus de résultats (pagination locale - affiche plus de profils déjà chargés)
  const handleLoadMore = () => {
    // Augmenter le nombre de résultats visibles de 10
    setVisibleCount(prev => prev + 10);
  };

  // Vérifier s'il reste des résultats à afficher
  const hasMoreResults = visibleCount < filteredProspects.length;

  // Ouvrir le modal de génération
  const openGenerateModal = (prospect) => {
    setSelectedProspect(prospect);
    setSelectedPosts(prospect.recentPosts || []);
    setShowGenerateModal(true);
  };

  // Toggle selection
  const toggleSelect = (id) => {
    setSelectedProspects(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  // Sélectionner tous
  const selectAll = () => {
    if (selectedProspects.length === prospects.length) {
      setSelectedProspects([]);
    } else {
      setSelectedProspects(prospects.map(p => p.id));
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [savingProspectId, setSavingProspectId] = useState(null);

  // Sauvegarder les prospects sélectionnés dans le CRM
  const saveSelectedProspects = async () => {
    if (selectedProspects.length === 0) return;

    setIsSaving(true);
    try {
      const prospectsToSave = allProspects.filter(p => selectedProspects.includes(p.id));

      const response = await fetch(`${API_BASE_URL}/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ prospects: prospectsToSave }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Prospects sauvegardés !', data.data?.message || `${prospectsToSave.length} prospect(s) ajouté(s)`);
        setSelectedProspects([]);
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde prospects:', error);
      toast.error('Erreur', 'Impossible de sauvegarder les prospects');
    } finally {
      setIsSaving(false);
    }
  };

  // Sauvegarder un prospect individuel dans le CRM
  const saveSingleProspect = async (prospect) => {
    setSavingProspectId(prospect.id);
    try {
      const response = await fetch(`${API_BASE_URL}/prospects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ prospects: [prospect] }),
      });

      if (response.ok) {
        toast.success('Prospect ajouté !', `@${prospect.username} ajouté au CRM`);
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur sauvegarde prospect:', error);
      toast.error('Erreur', 'Impossible de sauvegarder le prospect');
    } finally {
      setSavingProspectId(null);
    }
  };

  // Formater les nombres
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  // Obtenir le placeholder selon l'onglet
  const getPlaceholder = () => {
    switch (sourceType) {
      case SOURCE_TYPES.ACCOUNT:
        return '@baborelaxationspa, @concurrent_local...';
      case SOURCE_TYPES.HASHTAG:
        return '#madeinfrance, #bordeaux, #entrepreneurfrançais...';
      case SOURCE_TYPES.LOCATION:
        return 'Bordeaux, France ou Centre commercial Mériadeck...';
      default:
        return '';
    }
  };

  // Description de la recherche
  const getSearchDescription = () => {
    switch (sourceType) {
      case SOURCE_TYPES.ACCOUNT:
        if (accountSubtype === ACCOUNT_SUBTYPES.FOLLOWERS) {
          return 'Récupère les abonnés de ce compte';
        } else if (accountSubtype === ACCOUNT_SUBTYPES.FOLLOWING) {
          return 'Récupère les comptes suivis par ce profil';
        } else {
          return 'Récupère les personnes qui commentent les posts';
        }
      case SOURCE_TYPES.HASHTAG:
        return 'Récupère les profils qui postent avec ce hashtag';
      case SOURCE_TYPES.LOCATION:
        return 'Récupère les profils qui postent depuis ce lieu';
      default:
        return '';
    }
  };

  // Obtenir les suggestions pour la plateforme actuelle
  const currentSuggestions = suggestions?.[platform] || null;

  const tourContext = useTourContext();

  // Copier dans le presse-papier
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié !');
  };

  return (
    <>
      <Header
        title="Recherche"
        subtitle="Trouvez des prospects qualifiés sur Instagram, TikTok et LinkedIn"
        onStartTour={tourContext?.startTour}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Sélecteur de plateforme */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setPlatform(PLATFORMS.INSTAGRAM);
              setHasSearched(false);
              setAllProspects([]);
            }}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
              platform === PLATFORMS.INSTAGRAM
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'
            }`}
          >
            <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Instagram</span>
            <span className="xs:hidden">Insta</span>
          </button>
          <button
            onClick={() => {
              setPlatform(PLATFORMS.TIKTOK);
              setHasSearched(false);
              setAllProspects([]);
            }}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
              platform === PLATFORMS.TIKTOK
                ? 'bg-gradient-to-r from-black to-gray-800 text-white shadow-lg'
                : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'
            }`}
          >
            <TikTokIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            TikTok
          </button>
          <button
            onClick={() => {
              setPlatform(PLATFORMS.LINKEDIN);
              setHasSearched(false);
              setAllProspects([]);
            }}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl font-medium transition-all text-sm sm:text-base ${
              platform === PLATFORMS.LINKEDIN
                ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white border border-warm-200 text-warm-600 hover:bg-warm-50'
            }`}
          >
            <Linkedin className="w-4 h-4 sm:w-5 sm:h-5" />
            LinkedIn
          </button>
        </div>

        {/* Mode LinkedIn - Suggestions uniquement */}
        {platform === PLATFORMS.LINKEDIN ? (
          <LinkedInMode
            suggestions={currentSuggestions}
            userProfile={userProfile}
            isLoading={isLoadingSuggestions}
            onRegenerate={regenerateSuggestions}
            isRegenerating={isRegeneratingSuggestions}
            onOpenMessageModal={() => setShowLinkedInModal(true)}
            copyToClipboard={copyToClipboard}
          />
        ) : (
          <>
            {/* Suggestions compactes au-dessus de la recherche */}
            {currentSuggestions?.hashtags?.length > 0 ? (
              <div className="card p-4 bg-gradient-to-r from-brand-50 to-accent-50 border-brand-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-warm-700">
                      Suggestions pour toi
                    </span>
                    <span className="text-xs text-warm-400">
                      • Clique pour rechercher
                    </span>
                  </div>
                  <button
                    onClick={regenerateSuggestions}
                    disabled={isRegeneratingSuggestions}
                    className="p-1.5 hover:bg-white/50 rounded-lg transition-colors"
                    title="Régénérer les suggestions"
                  >
                    <RefreshCw className={`w-4 h-4 text-warm-400 ${isRegeneratingSuggestions ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(showAllHashtags ? currentSuggestions.hashtags : currentSuggestions.hashtags.slice(0, 10)).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(item.tag)}
                      className="px-3 py-1.5 bg-white hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-medium transition-colors shadow-sm hover:shadow"
                      title={item.pertinence}
                    >
                      {item.tag}
                    </button>
                  ))}
                  {currentSuggestions.hashtags.length > 10 && (
                    <button
                      onClick={() => setShowAllHashtags(!showAllHashtags)}
                      className="px-3 py-1.5 text-brand-600 hover:text-brand-700 text-sm font-medium"
                    >
                      {showAllHashtags ? 'Voir moins' : `+${currentSuggestions.hashtags.length - 10} autres`}
                    </button>
                  )}
                </div>
                {/* Message explicatif */}
                <p className="text-xs text-warm-500 mt-3 flex items-center gap-1.5">
                  <span className="inline-block w-1 h-1 bg-amber-400 rounded-full"></span>
                  Ces hashtags nichés donnent moins de résultats mais plus ciblés. Clique sur "Charger plus" pour élargir ta recherche.
                </p>
              </div>
            ) : !isLoadingSuggestions && (
              <div className="card p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-warm-800">
                      Génère tes suggestions de hashtags personnalisées
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5">
                      Basées sur ton profil et ta cible idéale
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={regenerateSuggestions}
                      disabled={isRegeneratingSuggestions}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isRegeneratingSuggestions ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Générer
                        </>
                      )}
                    </button>
                    <a
                      href="/settings"
                      className="px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Modifier profil
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Card de recherche avec onglets - Instagram/TikTok */}
            <div className="card p-6">
              {/* Micro-phrase bénéfice + étapes */}
              <div className="mb-6">
                <p className="text-center text-lg font-medium text-warm-800 mb-3">
                  Trouve des prospects alignés avec ta voix en 1 clic
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-warm-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">1</span>
                    Choisis un hashtag
                  </span>
                  <ChevronRight className="w-4 h-4 text-warm-300" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">2</span>
                    Clique sur Rechercher
                  </span>
                  <ChevronRight className="w-4 h-4 text-warm-300" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold">3</span>
                    Ajoute au CRM
                  </span>
                </div>
              </div>

              {/* Onglets de source */}
              <div className="flex overflow-x-auto border-b border-warm-200 mb-6 -mx-2 px-2 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setSourceType(SOURCE_TYPES.ACCOUNT)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all border-b-2 -mb-[2px] whitespace-nowrap text-sm sm:text-base ${
                    sourceType === SOURCE_TYPES.ACCOUNT
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-warm-500 hover:text-warm-700'
                  }`}
                >
                  <AtSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  Compte
                </button>
                <button
                  onClick={() => setSourceType(SOURCE_TYPES.HASHTAG)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all border-b-2 -mb-[2px] whitespace-nowrap text-sm sm:text-base ${
                    sourceType === SOURCE_TYPES.HASHTAG
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-warm-500 hover:text-warm-700'
                  }`}
                >
                  <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
                  Hashtag
                </button>
                <button
                  onClick={() => setSourceType(SOURCE_TYPES.LOCATION)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 font-medium transition-all border-b-2 -mb-[2px] whitespace-nowrap text-sm sm:text-base ${
                    sourceType === SOURCE_TYPES.LOCATION
                      ? 'border-brand-500 text-brand-600'
                      : 'border-transparent text-warm-500 hover:text-warm-700'
                  }`}
                >
                  <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  Lieu
                </button>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Sous-options pour le type Compte */}
                {sourceType === SOURCE_TYPES.ACCOUNT && (
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setAccountSubtype(ACCOUNT_SUBTYPES.FOLLOWERS)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        accountSubtype === ACCOUNT_SUBTYPES.FOLLOWERS
                          ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500'
                          : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      Ses followers
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountSubtype(ACCOUNT_SUBTYPES.FOLLOWING)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        accountSubtype === ACCOUNT_SUBTYPES.FOLLOWING
                          ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500'
                          : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      Ses abonnements
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountSubtype(ACCOUNT_SUBTYPES.COMMENTERS)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        accountSubtype === ACCOUNT_SUBTYPES.COMMENTERS
                          ? 'bg-brand-100 text-brand-700 ring-2 ring-brand-500'
                          : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                      }`}
                    >
                      <MessageSquarePlus className="w-4 h-4" />
                      Commentateurs
                    </button>
                  </div>
                )}

                {/* Input de recherche */}
                <div className="space-y-2">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      {sourceType === SOURCE_TYPES.ACCOUNT && (
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
                      )}
                      {sourceType === SOURCE_TYPES.HASHTAG && (
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
                      )}
                      {sourceType === SOURCE_TYPES.LOCATION && (
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
                      )}
                      <input
                        type="text"
                        value={
                          sourceType === SOURCE_TYPES.ACCOUNT ? accountInput :
                          sourceType === SOURCE_TYPES.HASHTAG ? hashtagInput :
                          locationInput
                        }
                        onChange={(e) => {
                          if (sourceType === SOURCE_TYPES.ACCOUNT) setAccountInput(e.target.value);
                          else if (sourceType === SOURCE_TYPES.HASHTAG) setHashtagInput(e.target.value);
                          else setLocationInput(e.target.value);
                        }}
                        placeholder={getPlaceholder()}
                        className="w-full pl-12 pr-4 py-3 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching}
                      className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-warm-300 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Recherche...
                        </>
                      ) : (
                        <>
                          <SearchIcon className="w-5 h-5" />
                          Rechercher
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-warm-500 flex items-center gap-1">
                    {platform === PLATFORMS.INSTAGRAM ? (
                      <Instagram className="w-4 h-4" />
                    ) : (
                      <TikTokIcon className="w-4 h-4" />
                    )}
                    {getSearchDescription()}
                  </p>
                </div>

                {/* Filtres simples */}
                {hasSearched && allProspects.length > 0 && (
                  <div className="pt-4 border-t border-warm-100">
                    <button
                      type="button"
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      {showFilters ? '▼ Masquer les filtres' : '▶ Filtrer les résultats'}
                    </button>
                    {showFilters && (
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <label className="block text-sm font-medium text-warm-700 mb-1">
                            Abonnés min
                          </label>
                          <input
                            type="number"
                            value={filters.minFollowers}
                            onChange={(e) => setFilters(f => ({ ...f, minFollowers: e.target.value }))}
                            placeholder="500"
                            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-warm-700 mb-1">
                            Abonnés max
                          </label>
                          <input
                            type="number"
                            value={filters.maxFollowers}
                            onChange={(e) => setFilters(f => ({ ...f, maxFollowers: e.target.value }))}
                            placeholder="50000"
                            className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Info sur la recherche actuelle */}
            {searchInfo && !isSearching && (
              <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  searchInfo.type === SOURCE_TYPES.ACCOUNT ? 'bg-purple-100' :
                  searchInfo.type === SOURCE_TYPES.HASHTAG ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {searchInfo.type === SOURCE_TYPES.ACCOUNT && <AtSign className="w-5 h-5 text-purple-600" />}
                  {searchInfo.type === SOURCE_TYPES.HASHTAG && <Hash className="w-5 h-5 text-blue-600" />}
                  {searchInfo.type === SOURCE_TYPES.LOCATION && <MapPin className="w-5 h-5 text-green-600" />}
                </div>
                <div>
                  <p className="font-medium text-warm-900">
                    {searchInfo.type === SOURCE_TYPES.ACCOUNT && (
                      <>
                        {searchInfo.subtype === ACCOUNT_SUBTYPES.FOLLOWERS && 'Followers de '}
                        {searchInfo.subtype === ACCOUNT_SUBTYPES.FOLLOWING && 'Abonnements de '}
                        {searchInfo.subtype === ACCOUNT_SUBTYPES.COMMENTERS && 'Commentateurs de '}
                        <span className="text-brand-600">@{searchInfo.query}</span>
                      </>
                    )}
                    {searchInfo.type === SOURCE_TYPES.HASHTAG && (
                      <>Posts avec <span className="text-brand-600">#{searchInfo.query}</span></>
                    )}
                    {searchInfo.type === SOURCE_TYPES.LOCATION && (
                      <>Posts depuis <span className="text-brand-600">{searchInfo.query}</span></>
                    )}
                  </p>
                  <p className="text-sm text-warm-500">
                    {searchInfo.error ? (
                      <span className="text-red-500">{searchInfo.error}</span>
                    ) : (
                      `${searchInfo.count} profils trouvés`
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Résultats */}
            {hasSearched && (
              <div className="space-y-4">
                {/* Header résultats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display font-semibold text-warm-900">
                      {isSearching ? 'Recherche en cours...' : `${filteredProspects.length} prospects`}
                    </h2>
                    {!isSearching && prospects.length > 0 && (
                      <button
                        onClick={selectAll}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        {selectedProspects.length === prospects.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    )}
                  </div>

                  {/* Boutons toujours visibles */}
                  {!isSearching && prospects.length > 0 && (
                    <div className="flex items-center gap-3">
                      {selectedProspects.length > 0 && (
                        <span className="text-sm text-warm-500">
                          {selectedProspects.length} sélectionné(s)
                        </span>
                      )}
                      <button
                        onClick={saveSelectedProspects}
                        disabled={isSaving || selectedProspects.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-colors ${
                          selectedProspects.length > 0
                            ? 'bg-brand-600 hover:bg-brand-700 text-white'
                            : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                        } disabled:opacity-50`}
                        title={selectedProspects.length === 0 ? 'Sélectionne des prospects en cliquant sur la checkbox à gauche' : ''}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        {isSaving ? 'Sauvegarde...' : 'Ajouter au CRM'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Loading state */}
                {isSearching && (
                  <div className="card p-12 text-center">
                    <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                    <p className="text-warm-600 font-medium">Analyse des profils...</p>
                    <p className="text-brand-500 text-sm mt-1 font-medium">Merci de patienter, cela peut prendre quelques minutes</p>
                  </div>
                )}

                {/* Liste des prospects */}
                {!isSearching && prospects.length > 0 && (
                  <>
                    <div className="space-y-3">
                      {prospects.map((prospect) => (
                        <ProspectCard
                          key={prospect.id}
                          prospect={prospect}
                          isSelected={selectedProspects.includes(prospect.id)}
                          onToggle={() => toggleSelect(prospect.id)}
                          onGenerateMessage={() => openGenerateModal(prospect)}
                          onSave={() => saveSingleProspect(prospect)}
                          isSaving={savingProspectId === prospect.id}
                          formatNumber={formatNumber}
                          platform={platform}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-4">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-warm-200 hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let page;
                          if (totalPages <= 5) {
                            page = i + 1;
                          } else if (currentPage <= 3) {
                            page = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            page = totalPages - 4 + i;
                          } else {
                            page = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                                currentPage === page
                                  ? 'bg-brand-600 text-white'
                                  : 'border border-warm-200 hover:bg-warm-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-warm-200 hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    {/* Bouton Charger plus - affiché seulement s'il reste des résultats */}
                    {hasMoreResults ? (
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={handleLoadMore}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30"
                        >
                          <Plus className="w-5 h-5" />
                          Charger plus de résultats ({filteredProspects.length - visibleCount} restants)
                        </button>
                      </div>
                    ) : filteredProspects.length > 0 && (
                      <div className="flex justify-center pt-4">
                        <p className="text-warm-500 text-sm">
                          ✓ Tous les résultats sont affichés ({filteredProspects.length} prospects)
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Empty state */}
                {!isSearching && filteredProspects.length === 0 && (
                  <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-warm-400" />
                    </div>
                    <h3 className="font-display font-semibold text-warm-700 mb-2">
                      Aucun prospect trouvé
                    </h3>
                    <p className="text-warm-500 text-sm">
                      Essayez avec une autre source ou ajustez vos filtres
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Initial state - pas de recherche encore */}
            {!hasSearched && !currentSuggestions && (
              <div className="card p-12 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-brand-600" />
                </div>
                <h3 className="font-display text-xl font-semibold text-warm-900 mb-2">
                  Trouvez vos prochains clients
                </h3>
                <p className="text-warm-500 max-w-lg mx-auto mb-6">
                  Choisissez une source de prospection pour trouver des profils qualifiés.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                  <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                    <AtSign className="w-6 h-6 text-purple-600 mb-2" />
                    <h4 className="font-semibold text-warm-900 mb-1">Par compte</h4>
                    <p className="text-sm text-warm-500">
                      Ciblez les followers d'un concurrent ou d'un influenceur
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <Hash className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-semibold text-warm-900 mb-1">Par hashtag</h4>
                    <p className="text-sm text-warm-500">
                      Trouvez les profils qui utilisent des hashtags pertinents
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <MapPin className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-semibold text-warm-900 mb-1">Par lieu</h4>
                    <p className="text-sm text-warm-500">
                      Ciblez les gens qui postent depuis votre zone
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal séquence Instagram */}
      <SequenceModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedProspect(null);
          setSelectedPosts([]);
        }}
        prospect={selectedProspect}
      />

      {/* Modal LinkedIn */}
      <LinkedInMessageModal
        isOpen={showLinkedInModal}
        onClose={() => setShowLinkedInModal(false)}
      />
    </>
  );
}

/**
 * Panel de suggestions basé sur l'onboarding
 */
function SuggestionsPanel({
  suggestions,
  userProfile,
  platform,
  isLoading,
  onHashtagClick,
  onRegenerate,
  isRegenerating,
  showAllHashtags,
  setShowAllHashtags,
}) {
  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
        <p className="text-warm-500 text-sm">Chargement des suggestions...</p>
      </div>
    );
  }

  if (!suggestions) return null;

  const hashtags = suggestions.hashtags || [];
  const visibleHashtags = showAllHashtags ? hashtags : hashtags.slice(0, 8);
  const typesComptes = suggestions.types_comptes || [];

  return (
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-warm-900">
              Suggestions pour toi
            </h3>
          </div>
          <p className="text-sm text-warm-500">
            Basées sur ton profil • {userProfile?.metier || 'Ton métier'} • {userProfile?.client_ideal?.substring(0, 30) || 'Ton client idéal'}...
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Régénérer
          </button>
        </div>
      </div>

      {/* Hashtags recommandés */}
      <div>
        <h4 className="text-sm font-medium text-warm-700 mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          Hashtags recommandés
        </h4>
        <div className="flex flex-wrap gap-2">
          {visibleHashtags.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onHashtagClick(item.tag)}
              className="group relative px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-sm font-medium transition-colors"
              title={item.pertinence}
            >
              {item.tag}
            </button>
          ))}
        </div>
        {hashtags.length > 8 && (
          <button
            onClick={() => setShowAllHashtags(!showAllHashtags)}
            className="mt-3 text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            {showAllHashtags ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Voir tous ({hashtags.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Types de comptes */}
      {typesComptes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-warm-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Types de comptes à chercher
          </h4>
          <ul className="space-y-2">
            {typesComptes.map((type, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-warm-600">
                <span className="text-brand-500 mt-0.5">•</span>
                {type}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Astuce TikTok */}
      {platform === 'tiktok' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex gap-3">
            <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Astuce TikTok</p>
              <p>
                Sur TikTok, les commentaires convertissent mieux que les DM.
                Commence par commenter leurs vidéos !
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mode LinkedIn - Suggestions uniquement, pas de scraping
 */
function LinkedInMode({
  suggestions,
  userProfile,
  isLoading,
  onRegenerate,
  isRegenerating,
  onOpenMessageModal,
  copyToClipboard,
}) {
  const [copiedSection, setCopiedSection] = useState(null);

  const handleCopy = (text, section) => {
    copyToClipboard(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-warm-500">Chargement des suggestions LinkedIn...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avertissement LinkedIn */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Mode LinkedIn</p>
            <p>
              Pour respecter les règles LinkedIn, on ne peut pas analyser les profils automatiquement.
              Utilise ces suggestions pour chercher sur LinkedIn directement, puis reviens ici
              pour générer un message personnalisé.
            </p>
          </div>
        </div>
      </div>

      {/* Header suggestions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-display font-semibold text-warm-900">
              Suggestions de recherche LinkedIn
            </h3>
          </div>
          {userProfile && (
            <p className="text-sm text-warm-500">
              Basées sur : {userProfile.metier} • {userProfile.secteur_niche}
            </p>
          )}
        </div>
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
          Régénérer
        </button>
      </div>

      {suggestions ? (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Titres de poste */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-warm-800">Titres de poste à rechercher</h4>
              <button
                onClick={() => handleCopy(suggestions.titres_poste?.join(' • ') || '', 'titres')}
                className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors"
              >
                {copiedSection === 'titres' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-warm-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.titres_poste?.map((titre, idx) => (
                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  "{titre}"
                </span>
              ))}
            </div>
          </div>

          {/* Secteurs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-warm-800">Secteurs à filtrer</h4>
              <button
                onClick={() => handleCopy(suggestions.secteurs?.join(' • ') || '', 'secteurs')}
                className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors"
              >
                {copiedSection === 'secteurs' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-warm-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.secteurs?.map((secteur, idx) => (
                <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm">
                  "{secteur}"
                </span>
              ))}
            </div>
          </div>

          {/* Hashtags LinkedIn */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-warm-800">Hashtags LinkedIn</h4>
              <button
                onClick={() => handleCopy(suggestions.hashtags?.join(' ') || '', 'hashtags')}
                className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors"
              >
                {copiedSection === 'hashtags' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-warm-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.hashtags?.map((tag, idx) => (
                <span key={idx} className="px-3 py-1 bg-brand-50 text-brand-700 rounded-lg text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Mots-clés de recherche */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-warm-800">Mots-clés de recherche</h4>
              <button
                onClick={() => handleCopy(suggestions.mots_cles_recherche?.join(' • ') || '', 'mots')}
                className="p-1.5 hover:bg-warm-100 rounded-lg transition-colors"
              >
                {copiedSection === 'mots' ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-warm-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.mots_cles_recherche?.map((mot, idx) => (
                <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm">
                  {mot}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <AlertCircle className="w-10 h-10 text-warm-300 mx-auto mb-3" />
          <p className="text-warm-500">
            Aucune suggestion LinkedIn disponible.
            <br />
            Complète ton profil pour générer des suggestions.
          </p>
        </div>
      )}

      {/* Section génération de message */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Edit3 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-semibold text-warm-900 mb-1">
              Générer un message LinkedIn
            </h3>
            <p className="text-sm text-warm-500 mb-4">
              Tu as trouvé un prospect sur LinkedIn ? Décris-le et on te génère
              un message personnalisé.
            </p>
            <button
              onClick={onOpenMessageModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/25"
            >
              <Sparkles className="w-4 h-4" />
              Générer un message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal de génération de message LinkedIn
 */
function LinkedInMessageModal({ isOpen, onClose }) {
  const [prospectDescription, setProspectDescription] = useState('');
  const [recentPost, setRecentPost] = useState('');
  const [objective, setObjective] = useState('network');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState(null);
  const [error, setError] = useState(null);
  const toast = useToast();

  const objectives = [
    { id: 'network', label: 'Créer une relation' },
    { id: 'understand', label: 'Comprendre ses besoins' },
    { id: 'service', label: 'Proposer un service' },
    { id: 'call', label: 'Obtenir un appel' },
  ];

  const handleGenerate = async () => {
    if (!prospectDescription.trim()) {
      setError('Décris ton prospect');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/linkedin-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          prospectDescription,
          recentPost,
          objective,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération');
      }

      const data = await response.json();
      setGeneratedMessage(data.data);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (generatedMessage?.message) {
      navigator.clipboard.writeText(generatedMessage.message);
      toast.success('Message copié !');
    }
  };

  const handleReset = () => {
    setGeneratedMessage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-warm-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <h2 className="font-display font-semibold text-warm-800">
              Générer un message LinkedIn
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-warm-400 hover:text-warm-600 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {!generatedMessage ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Décris ton prospect <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-warm-500 mb-2">
                  Copie-colle sa bio LinkedIn ou résume son profil
                </p>
                <textarea
                  value={prospectDescription}
                  onChange={(e) => setProspectDescription(e.target.value)}
                  placeholder="Ex: Marie Dupont, coach en reconversion professionnelle pour femmes 40+. Fondatrice de 'Nouvelle Vie'. Basée à Lyon. A lancé son podcast en 2023..."
                  rows={4}
                  className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Son dernier post / un contenu récent (optionnel)
                </label>
                <textarea
                  value={recentPost}
                  onChange={(e) => setRecentPost(e.target.value)}
                  placeholder="Ex: Elle a posté sur le fait de quitter son CDI à 45 ans et les réactions négatives de son entourage..."
                  rows={3}
                  className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-700 mb-2">
                  Ton objectif avec ce prospect
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full px-4 py-3 border border-warm-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none appearance-none bg-white"
                >
                  {objectives.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.label}</option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-warm-300 text-white font-medium rounded-xl transition-colors"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Générer le message
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-warm-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Message suggéré
                </h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-warm-800 whitespace-pre-wrap">
                    {generatedMessage.message}
                  </p>
                </div>
              </div>

              {generatedMessage.metadata?.why_it_works && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm text-amber-800">
                    <strong>Pourquoi ça fonctionne :</strong> {generatedMessage.metadata.why_it_works}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-warm-100 hover:bg-warm-200 text-warm-700 font-medium rounded-xl transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Régénérer
                </button>
              </div>

              <p className="text-xs text-warm-400 text-center">
                Ce message est conçu pour créer une relation. Aucun pitch, juste de la curiosité sincère.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Carte prospect individuelle
 */
function ProspectCard({ prospect, isSelected, onToggle, onGenerateMessage, onSave, isSaving, formatNumber, platform }) {
  const [showPosts, setShowPosts] = useState(false);
  const toast = useToast();

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-orange-500 bg-orange-50';
    return 'text-warm-500 bg-warm-100';
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';

    let time = timestamp;
    if (typeof timestamp === 'string') {
      time = new Date(timestamp).getTime();
    }

    if (time && time < 1e12) {
      time = time * 1000;
    }

    if (!time || isNaN(time)) return '';

    const now = Date.now();
    const diff = now - time;
    const days = Math.floor(diff / 86400000);

    if (isNaN(days) || days < 0) return '';
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `il y a ${weeks} sem`;
    return `il y a ${Math.floor(days / 30)} mois`;
  };

  const PlatformIcon = platform === 'tiktok' ? TikTokIcon : Instagram;

  return (
    <div
      className={`card p-4 transition-all ${
        isSelected ? 'ring-2 ring-brand-500 bg-brand-50/30' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-brand-500 border-brand-500 scale-110'
              : 'border-warm-300 hover:border-brand-500 hover:bg-brand-50'
          }`}
        >
          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>

        {/* Avatar */}
        <div className="relative">
          <ProspectAvatar avatar={prospect.avatar} username={prospect.username} size="md" />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
            platform === 'tiktok' ? 'bg-black' : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}>
            <PlatformIcon className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-warm-900">@{prospect.username}</h3>
            {prospect.isVerified && (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            )}
            {prospect.isPrivate !== undefined && (
              <span
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                  prospect.isPrivate
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {prospect.isPrivate ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
              </span>
            )}
            {prospect.fullName && (
              <span className="text-sm text-warm-400">• {prospect.fullName}</span>
            )}
          </div>

          <p className="text-sm text-warm-600 mt-1 line-clamp-2">{prospect.bio || 'Pas de bio'}</p>

          {/* Stats */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <div className="flex items-center gap-1 text-warm-500">
              <Users className="w-4 h-4" />
              <span>{formatNumber(prospect.followers)}</span>
            </div>
            {prospect.engagement && (
              <div className="flex items-center gap-1 text-warm-500">
                <Heart className="w-4 h-4" />
                <span>{prospect.engagement}%</span>
              </div>
            )}
            {prospect.posts && (
              <div className="flex items-center gap-1 text-warm-500">
                <MessageCircle className="w-4 h-4" />
                <span>{prospect.posts} posts</span>
              </div>
            )}
            {prospect.recentPosts?.length > 0 && (
              <button
                onClick={() => setShowPosts(!showPosts)}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
              >
                <Eye className="w-4 h-4" />
                <span>{prospect.recentPosts.length} posts</span>
              </button>
            )}
          </div>
        </div>

        {/* Score & Actions */}
        <div className="flex items-center gap-3">
          {prospect.score && (
            <div className="flex items-center gap-1">
              <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${getScoreColor(prospect.score)}`}>
                {prospect.score}%
              </div>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={onGenerateMessage}
              className="p-2 hover:bg-brand-50 rounded-lg transition-colors"
              title="Générer un message"
            >
              <MessageSquare className="w-5 h-5 text-brand-500" />
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="p-2 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
              title="Ajouter au CRM"
            >
              <UserPlus className="w-5 h-5 text-green-600" />
            </button>
            <a
              href={platform === 'tiktok'
                ? `https://tiktok.com/@${prospect.username}`
                : `https://instagram.com/${prospect.username}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
              title="Voir le profil"
            >
              <ExternalLink className="w-5 h-5 text-warm-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Posts récents */}
      {showPosts && prospect.recentPosts?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warm-100">
          <p className="text-xs font-medium text-warm-500 mb-2">Derniers posts</p>
          <div className="space-y-2">
            {prospect.recentPosts.slice(0, 3).map((post, idx) => {
              const caption = post.caption?.trim();
              const truncatedCaption = caption
                ? (caption.length > 60 ? caption.substring(0, 60) + '...' : caption)
                : null;

              return (
                <a
                  key={post.id || idx}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm hover:bg-warm-50 rounded-lg p-2 -mx-2 transition-colors group"
                >
                  <span className="text-warm-400 mt-0.5">•</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-warm-700">
                      {truncatedCaption || 'Post sans légende'}
                    </span>
                    <div className="flex items-center gap-3 mt-1 text-xs text-warm-400">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}K` : post.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments}
                      </span>
                      <span>{getRelativeTime(post.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
