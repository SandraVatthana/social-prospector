import { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Instagram,
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
} from 'lucide-react';
import Header from '../components/layout/Header';
import GenerateMessageModal from '../components/dashboard/GenerateMessageModal';
import InfoTooltip from '../components/ui/InfoTooltip';
import { useTourContext } from '../App';
import { API_BASE_URL } from '../lib/api';
import { useToast } from '../components/ui/Toast';

// Helper pour obtenir l'URL de l'avatar via proxy si nécessaire
function getProxiedImageUrl(url) {
  if (!url) return null;
  // Si c'est une URL Instagram CDN, utiliser notre proxy
  const instagramDomains = ['instagram.com', 'cdninstagram.com', 'fbcdn.net', 'scontent'];
  const needsProxy = instagramDomains.some(domain => url.includes(domain));
  if (needsProxy) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
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

export default function Search() {
  const savedState = loadSearchState();

  // Source de recherche
  const [sourceType, setSourceType] = useState(savedState?.sourceType || SOURCE_TYPES.ACCOUNT);
  const [accountSubtype, setAccountSubtype] = useState(savedState?.accountSubtype || ACCOUNT_SUBTYPES.FOLLOWERS);

  // Inputs selon la source
  const [accountInput, setAccountInput] = useState(savedState?.accountInput || '');
  const [hashtagInput, setHashtagInput] = useState(savedState?.hashtagInput || '');
  const [locationInput, setLocationInput] = useState(savedState?.locationInput || '');

  // État recherche
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(savedState?.hasSearched || false);
  const [allProspects, setAllProspects] = useState(savedState?.allProspects || []);
  const [searchInfo, setSearchInfo] = useState(savedState?.searchInfo || null);
  const [selectedProspects, setSelectedProspects] = useState([]);
  const [searchOffset, setSearchOffset] = useState(savedState?.searchOffset || 0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const itemsPerPage = 10;

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

  // Sauvegarder l'état quand il change
  useEffect(() => {
    if (hasSearched || accountInput || hashtagInput || locationInput) {
      saveSearchState({
        sourceType,
        accountSubtype,
        accountInput,
        hashtagInput,
        locationInput,
        hasSearched,
        allProspects,
        searchInfo,
        currentPage,
        filters,
        showGenerateModal,
        selectedProspect,
        selectedPosts,
        searchOffset,
      });
    }
  }, [sourceType, accountSubtype, accountInput, hashtagInput, locationInput, hasSearched, allProspects, searchInfo, currentPage, filters, showGenerateModal, selectedProspect, selectedPosts, searchOffset]);

  // Prospects filtrés et paginés
  const filteredProspects = allProspects.filter(p => {
    if (filters.minFollowers && p.followers < parseInt(filters.minFollowers)) return false;
    if (filters.maxFollowers && p.followers > parseInt(filters.maxFollowers)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);
  const prospects = filteredProspects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
        setSearchInfo({
          type: sourceType,
          query: query,
          subtype: accountSubtype,
          count: data.data?.prospects?.length || 0,
        });
      } else {
        // Essayer de parser l'erreur du backend
        let errorMessage = 'API non disponible';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Ignorer si on ne peut pas parser la réponse
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Erreur recherche:', err);
      // Afficher l'erreur de manière user-friendly
      let friendlyError = err.message || 'Erreur lors de la recherche';
      if (friendlyError.includes('Apify') || friendlyError.includes('timeout')) {
        friendlyError = 'La recherche a pris trop de temps. Veuillez réessayer.';
      } else if (friendlyError.includes('SEARCH_ERROR')) {
        friendlyError = 'Erreur lors de la recherche. Veuillez réessayer.';
      }

      setAllProspects([]);
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

  // Charger plus de résultats
  const handleLoadMore = async () => {
    if (!searchInfo) return;

    setIsLoadingMore(true);
    const newOffset = allProspects.length;

    try {
      const params = new URLSearchParams({
        sourceType: searchInfo.type,
        query: searchInfo.query,
        limit: '50',
        offset: newOffset.toString(),
      });

      if (searchInfo.type === SOURCE_TYPES.ACCOUNT) {
        params.append('subtype', searchInfo.subtype);
      }

      const response = await fetch(`${API_BASE_URL}/search/source?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const newProspects = data.data?.prospects || [];

        if (newProspects.length > 0) {
          // Filtrer les doublons par username
          const existingUsernames = new Set(allProspects.map(p => p.username));
          const uniqueNewProspects = newProspects.filter(p => !existingUsernames.has(p.username));

          setAllProspects(prev => [...prev, ...uniqueNewProspects]);
          setSearchOffset(newOffset);
          setSearchInfo(prev => ({
            ...prev,
            count: prev.count + uniqueNewProspects.length,
          }));
        }
      } else {
        throw new Error('API non disponible');
      }
    } catch (err) {
      console.error('Erreur chargement supplémentaire:', err);
      // Ne pas ajouter de données fictives - juste logger l'erreur
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  // Toast pour notifications
  const toast = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [savingProspectId, setSavingProspectId] = useState(null);

  // Sauvegarder les prospects sélectionnés dans le CRM
  const saveSelectedProspects = async () => {
    if (selectedProspects.length === 0) return;

    setIsSaving(true);
    try {
      // Récupérer les données complètes des prospects sélectionnés
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
        setSelectedProspects([]); // Désélectionner après sauvegarde
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

  const tourContext = useTourContext();

  return (
    <>
      <Header
        title="Nouvelle recherche"
        subtitle="Choisissez votre source de prospection pour trouver des prospects qualifiés"
        onStartTour={tourContext?.startTour}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Card de recherche avec onglets */}
        <div className="card p-6">
          {/* Onglets de source */}
          <div className="flex border-b border-warm-200 mb-6">
            <button
              onClick={() => setSourceType(SOURCE_TYPES.ACCOUNT)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 -mb-[2px] ${
                sourceType === SOURCE_TYPES.ACCOUNT
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}
            >
              <AtSign className="w-5 h-5" />
              Compte
            </button>
            <button
              onClick={() => setSourceType(SOURCE_TYPES.HASHTAG)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 -mb-[2px] ${
                sourceType === SOURCE_TYPES.HASHTAG
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}
            >
              <Hash className="w-5 h-5" />
              Hashtag
            </button>
            <button
              onClick={() => setSourceType(SOURCE_TYPES.LOCATION)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2 -mb-[2px] ${
                sourceType === SOURCE_TYPES.LOCATION
                  ? 'border-brand-500 text-brand-600'
                  : 'border-transparent text-warm-500 hover:text-warm-700'
              }`}
            >
              <MapPin className="w-5 h-5" />
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
                <Instagram className="w-4 h-4" />
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
                  <button
                    disabled={selectedProspects.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-colors ${
                      selectedProspects.length > 0
                        ? 'bg-accent-500 hover:bg-accent-600 text-white'
                        : 'bg-warm-200 text-warm-400 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    Générer messages
                  </button>
                </div>
              )}
            </div>

            {/* Loading state */}
            {isSearching && (
              <div className="card p-12 text-center">
                <Loader2 className="w-12 h-12 text-brand-500 animate-spin mx-auto mb-4" />
                <p className="text-warm-600 font-medium">Analyse des profils...</p>
                <p className="text-brand-500 text-sm mt-1 font-medium">Merci de patienter</p>
                <p className="text-warm-400 text-sm mt-2">
                  {sourceType === SOURCE_TYPES.ACCOUNT && 'Récupération des profils liés au compte...'}
                  {sourceType === SOURCE_TYPES.HASHTAG && 'Récupération des posts avec ce hashtag...'}
                  {sourceType === SOURCE_TYPES.LOCATION && 'Récupération des posts géolocalisés...'}
                </p>
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

                {/* Bouton Charger plus */}
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-500 to-accent-500 hover:from-brand-600 hover:to-accent-600 disabled:from-warm-300 disabled:to-warm-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Charger plus de résultats
                      </>
                    )}
                  </button>
                </div>
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

        {/* Initial state */}
        {!hasSearched && (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-brand-600" />
            </div>
            <h3 className="font-display text-xl font-semibold text-warm-900 mb-2">
              Trouvez vos prochains clients
            </h3>
            <p className="text-warm-500 max-w-lg mx-auto mb-6">
              Choisissez une source de prospection locale pour trouver des profils déjà pré-qualifiés géographiquement.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <AtSign className="w-6 h-6 text-purple-600 mb-2" />
                <h4 className="font-semibold text-warm-900 mb-1">Par compte</h4>
                <p className="text-sm text-warm-500">
                  Ciblez les followers d'un concurrent local ou d'un influenceur de votre région
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Hash className="w-6 h-6 text-blue-600 mb-2" />
                <h4 className="font-semibold text-warm-900 mb-1">Par hashtag</h4>
                <p className="text-sm text-warm-500">
                  Trouvez les profils qui utilisent #bordeaux ou #madeinfrance
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                <MapPin className="w-6 h-6 text-green-600 mb-2" />
                <h4 className="font-semibold text-warm-900 mb-1">Par lieu</h4>
                <p className="text-sm text-warm-500">
                  Ciblez les gens qui postent depuis votre ville ou quartier
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal génération message */}
      <GenerateMessageModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setSelectedProspect(null);
          setSelectedPosts([]);
        }}
        prospect={selectedProspect}
        posts={selectedPosts}
      />
    </>
  );
}

/**
 * Carte prospect individuelle
 */
function ProspectCard({ prospect, isSelected, onToggle, onGenerateMessage, onSave, isSaving, formatNumber }) {
  const [showActions, setShowActions] = useState(false);
  const [showPosts, setShowPosts] = useState(false);
  const toast = useToast();

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-orange-500 bg-orange-50';
    return 'text-warm-500 bg-warm-100';
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';

    // Convertir en nombre si c'est une string
    let time = timestamp;
    if (typeof timestamp === 'string') {
      time = new Date(timestamp).getTime();
    }

    // Vérifier si c'est un timestamp en secondes (pas en ms)
    if (time && time < 1e12) {
      time = time * 1000;
    }

    // Vérifier si le timestamp est valide
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

  return (
    <div
      className={`card p-4 transition-all ${
        isSelected ? 'ring-2 ring-brand-500 bg-brand-50/30' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Checkbox - Plus visible */}
        <button
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-brand-500 border-brand-500 scale-110'
              : 'border-warm-300 hover:border-brand-500 hover:bg-brand-50'
          }`}
          title={isSelected ? 'Désélectionner' : 'Sélectionner pour sauvegarder'}
        >
          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>

        {/* Avatar */}
        <div className="relative">
          <img
            src={getProxiedImageUrl(prospect.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.username)}&background=f15a24&color=fff&size=150`}
            alt={prospect.username}
            className="w-14 h-14 rounded-xl object-cover bg-warm-200"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(prospect.username)}&background=f15a24&color=fff&size=150`;
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
            <Instagram className="w-3 h-3 text-white" />
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
            {/* Indicateur privé/public */}
            {prospect.isPrivate !== undefined && (
              <span
                className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                  prospect.isPrivate
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}
                title={prospect.isPrivate ? 'Compte privé' : 'Compte public'}
              >
                {prospect.isPrivate ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
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
            {prospect.location && (
              <div className="flex items-center gap-1 text-brand-600">
                <MapPin className="w-4 h-4" />
                <span>{prospect.location}</span>
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
              <InfoTooltip
                text="Score de pertinence basé sur l'engagement et l'activité"
                position="left"
                size="xs"
              />
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
              href={`https://instagram.com/${prospect.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
              title="Voir le profil Instagram"
            >
              <ExternalLink className="w-5 h-5 text-warm-500" />
            </a>
          </div>
        </div>
      </div>

      {/* Posts récents */}
      {showPosts && prospect.recentPosts?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warm-100">
          <p className="text-xs font-medium text-warm-500 mb-2 flex items-center gap-1">
            <span>📌</span> Derniers posts
          </p>
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
                      {truncatedCaption || '📷 Post sans légende'}
                    </span>
                    <span className="text-brand-600 group-hover:text-brand-700 ml-2 whitespace-nowrap">
                      [Voir le post]
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

      {/* Actions panel */}
      {showActions && (
        <div className="mt-4 pt-4 border-t border-warm-100 flex items-center gap-3">
          <button
            onClick={() => {
              onGenerateMessage();
              setShowActions(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Générer un message
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium rounded-lg transition-colors">
            <UserPlus className="w-4 h-4" />
            Sauvegarder
          </button>
          <a
            href={`https://instagram.com/${prospect.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Instagram className="w-4 h-4" />
            Voir le profil
          </a>
          <button
            onClick={() => setShowActions(false)}
            className="ml-auto p-2 hover:bg-warm-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-warm-400" />
          </button>
        </div>
      )}
    </div>
  );
}

