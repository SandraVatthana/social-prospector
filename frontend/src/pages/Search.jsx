import { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Instagram,
  Users,
  Filter,
  Loader2,
  ChevronDown,
  ChevronUp,
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
  Play,
  RefreshCw,
  Eye
} from 'lucide-react';
import Header from '../components/layout/Header';
import GenerateMessageModal from '../components/dashboard/GenerateMessageModal';
import InfoTooltip from '../components/ui/InfoTooltip';
import { useTourContext } from '../App';

// Icône TikTok custom
const TikTokIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Générateur de prospects mock basé sur la recherche
function generateMockProspects(query, platform, count = 20) {
  const categories = {
    coach: [
      { suffix: 'coaching', bio: 'Coach certifié | Accompagnement personnalisé', tags: ['coaching', 'développement'] },
      { suffix: 'mindset', bio: 'Mindset coach | Transformation de vie', tags: ['mindset', 'motivation'] },
      { suffix: 'life', bio: 'Life coach | Aide à trouver ta voie', tags: ['lifegoals', 'coaching'] },
      { suffix: 'biz', bio: 'Business coach | Entrepreneuriat', tags: ['business', 'coaching'] },
    ],
    fitness: [
      { suffix: 'fit', bio: 'Personal trainer | Programmes sur-mesure', tags: ['fitness', 'workout'] },
      { suffix: 'training', bio: 'Coach sportif | Transformation physique', tags: ['training', 'health'] },
      { suffix: 'nutrition', bio: 'Nutrition & Fitness | Plans alimentaires', tags: ['nutrition', 'fitness'] },
      { suffix: 'gym', bio: 'Musculation & cardio | Résultats garantis', tags: ['gym', 'bodybuilding'] },
    ],
    entrepreneur: [
      { suffix: 'business', bio: 'Entrepreneur | Partage mon parcours', tags: ['entrepreneur', 'startup'] },
      { suffix: 'ecom', bio: 'E-commerce expert | Dropshipping & Print', tags: ['ecommerce', 'business'] },
      { suffix: 'startup', bio: 'Fondateur | Tech & Innovation', tags: ['startup', 'tech'] },
      { suffix: 'freelance', bio: 'Freelance | Liberté financière', tags: ['freelance', 'nomad'] },
    ],
    beaute: [
      { suffix: 'beauty', bio: 'Maquilleuse pro | Tutoriels beauté', tags: ['makeup', 'beauty'] },
      { suffix: 'skincare', bio: 'Routine skincare | Conseils naturels', tags: ['skincare', 'glow'] },
      { suffix: 'hair', bio: 'Coiffeuse | Colorations & Coupes', tags: ['hair', 'hairstyle'] },
      { suffix: 'nails', bio: 'Nail artist | Créations uniques', tags: ['nails', 'nailart'] },
    ],
    food: [
      { suffix: 'food', bio: 'Food lover | Recettes healthy', tags: ['food', 'healthy'] },
      { suffix: 'chef', bio: 'Chef à domicile | Cuisine créative', tags: ['chef', 'cooking'] },
      { suffix: 'vegan', bio: 'Recettes vegan | Plant-based', tags: ['vegan', 'plantbased'] },
      { suffix: 'pastry', bio: 'Pâtissière | Gâteaux sur commande', tags: ['pastry', 'dessert'] },
    ],
    photo: [
      { suffix: 'photo', bio: 'Photographe | Portraits & Lifestyle', tags: ['photography', 'portrait'] },
      { suffix: 'video', bio: 'Vidéaste | Contenus créatifs', tags: ['video', 'filmmaker'] },
      { suffix: 'creative', bio: 'Directeur créatif | Branding', tags: ['creative', 'branding'] },
      { suffix: 'content', bio: 'Content creator | Collaborations', tags: ['content', 'collab'] },
    ],
  };

  // Déterminer la catégorie basée sur la recherche
  let category = 'coach';
  const queryLower = query.toLowerCase();
  if (queryLower.includes('fit') || queryLower.includes('sport') || queryLower.includes('gym')) category = 'fitness';
  else if (queryLower.includes('entrepreneur') || queryLower.includes('business') || queryLower.includes('startup')) category = 'entrepreneur';
  else if (queryLower.includes('beaut') || queryLower.includes('makeup') || queryLower.includes('skin')) category = 'beaute';
  else if (queryLower.includes('food') || queryLower.includes('cuisine') || queryLower.includes('recette')) category = 'food';
  else if (queryLower.includes('photo') || queryLower.includes('video') || queryLower.includes('content')) category = 'photo';

  const templates = categories[category];
  const names = ['Emma', 'Léa', 'Marie', 'Julie', 'Sarah', 'Lucas', 'Thomas', 'Alex', 'Hugo', 'Nathan', 'Chloé', 'Camille', 'Laura', 'Manon', 'Océane', 'Antoine', 'Maxime', 'Théo', 'Romain', 'Arthur'];
  const lastNames = ['Martin', 'Bernard', 'Dubois', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'André', 'Lefebvre'];

  const prospects = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    const firstName = names[i % names.length];
    const lastName = lastNames[(i + 5) % lastNames.length];
    const followers = Math.floor(Math.random() * 45000) + 5000;
    const engagement = (Math.random() * 6 + 2).toFixed(1);
    const score = Math.floor(Math.random() * 25) + 75;

    prospects.push({
      id: i + 1,
      username: `${firstName.toLowerCase()}_${template.suffix}${i > 3 ? i : ''}`,
      platform,
      fullName: `${firstName} ${lastName}`,
      bio: `${template.bio} | ${template.tags.map(t => `#${t}`).join(' ')}`,
      followers,
      following: Math.floor(followers * (0.1 + Math.random() * 0.3)),
      posts: Math.floor(Math.random() * 400) + 50,
      engagement: parseFloat(engagement),
      avatar: `https://i.pravatar.cc/150?img=${(i % 70) + 1}`,
      isVerified: Math.random() > 0.85,
      lastActive: ['30min', '1h', '2h', '5h', '12h', '1j', '2j'][Math.floor(Math.random() * 7)],
      score,
      tags: template.tags,
      recentPosts: generateMockPosts(template.tags, platform),
    });
  }

  return prospects;
}

// Générer des posts mock pour chaque prospect
function generateMockPosts(tags, platform) {
  const postTemplates = [
    { caption: `Nouvelle session aujourd'hui ! Les résultats arrivent quand on reste constant 💪 #${tags[0]}`, type: 'image' },
    { caption: `3 erreurs que font 90% des débutants (et comment les éviter) 👇 #${tags[1] || tags[0]}`, type: 'carousel' },
    { caption: `Behind the scenes de ma journée type. Beaucoup de travail mais tellement de passion ! #${tags[0]}`, type: 'video' },
  ];

  return postTemplates.map((template, idx) => ({
    id: `post_${idx}`,
    thumbnail: `https://picsum.photos/seed/${tags[0]}${idx}/400/400`,
    caption: template.caption,
    publishedAt: Date.now() - (idx + 1) * 86400000 * (idx + 1),
    likes: Math.floor(Math.random() * 2000) + 200,
    comments: Math.floor(Math.random() * 100) + 10,
    hashtags: tags,
    type: template.type,
    url: `https://${platform}.com/p/mock_${idx}`,
  }));
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

export default function Search() {
  // Charger l'état sauvegardé au montage
  const savedState = loadSearchState();

  const [searchQuery, setSearchQuery] = useState(savedState?.searchQuery || '');
  const [platform, setPlatform] = useState(savedState?.platform || 'instagram');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(savedState?.hasSearched || false);
  const [allProspects, setAllProspects] = useState(savedState?.allProspects || []);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage || 1);
  const itemsPerPage = 10;

  // Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [selectedPosts, setSelectedPosts] = useState([]);

  // Filtres
  const [filters, setFilters] = useState(savedState?.filters || {
    minFollowers: '',
    maxFollowers: '',
    minEngagement: '',
    hasEmail: false,
    isActive: true,
  });

  // Sauvegarder l'état quand il change
  useEffect(() => {
    if (hasSearched && allProspects.length > 0) {
      saveSearchState({
        searchQuery,
        platform,
        hasSearched,
        allProspects,
        currentPage,
        filters,
      });
    }
  }, [searchQuery, platform, hasSearched, allProspects, currentPage, filters]);

  // Prospects filtrés et paginés
  const filteredProspects = allProspects.filter(p => {
    if (filters.minFollowers && p.followers < parseInt(filters.minFollowers)) return false;
    if (filters.maxFollowers && p.followers > parseInt(filters.maxFollowers)) return false;
    if (filters.minEngagement && p.engagement < parseFloat(filters.minEngagement)) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredProspects.length / itemsPerPage);
  const prospects = filteredProspects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Recherche
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setCurrentPage(1);
    setSelectedProspects([]);

    try {
      // Essayer l'API Apify
      const response = await fetch(`/api/search/similar?query=${encodeURIComponent(searchQuery)}&platform=${platform}&limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllProspects(data.data?.prospects || []);
      } else {
        throw new Error('API non disponible');
      }
    } catch (err) {
      // Mode démo avec données générées
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockData = generateMockProspects(searchQuery, platform, 20);
      setAllProspects(mockData);
    } finally {
      setIsSearching(false);
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

  // Formater les nombres
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const tourContext = useTourContext();

  return (
    <>
      <Header
        title="Trouver de nouveaux prospects"
        subtitle="Recherchez sur Instagram et TikTok par hashtag, lieu ou compte similaire"
        onStartTour={tourContext?.startTour}
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Barre de recherche */}
        <div className="card p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Sélection plateforme */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPlatform('instagram')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  platform === 'instagram'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                }`}
              >
                <Instagram className="w-5 h-5" />
                Instagram
              </button>
              <button
                type="button"
                onClick={() => setPlatform('tiktok')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  platform === 'tiktok'
                    ? 'bg-black text-white shadow-lg shadow-black/25'
                    : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
                }`}
              >
                <TikTokIcon className="w-5 h-5" />
                TikTok
              </button>
            </div>

            {/* Input recherche */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-warm-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Entrez un @compte ${platform === 'instagram' ? 'Instagram' : 'TikTok'} ou un mot-clé (coach, fitness, entrepreneur...)`}
                  className="w-full pl-12 pr-4 py-3 border border-warm-200 rounded-xl focus:border-brand-500 focus:ring-0 outline-none transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                  showFilters
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-warm-200 text-warm-600 hover:bg-warm-50'
                }`}
              >
                <Filter className="w-5 h-5" />
                Filtres
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
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

            {/* Filtres avancés */}
            {showFilters && (
              <div className="pt-4 border-t border-warm-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">
                    Abonnés min
                  </label>
                  <input
                    type="number"
                    value={filters.minFollowers}
                    onChange={(e) => setFilters(f => ({ ...f, minFollowers: e.target.value }))}
                    placeholder="1000"
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
                    placeholder="100000"
                    className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-warm-700 mb-1">
                    Engagement min (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={filters.minEngagement}
                    onChange={(e) => setFilters(f => ({ ...f, minEngagement: e.target.value }))}
                    placeholder="2.0"
                    className="w-full px-3 py-2 border border-warm-200 rounded-lg text-sm focus:border-brand-500 outline-none"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isActive}
                      onChange={(e) => setFilters(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-warm-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm text-warm-700">Actifs récemment</span>
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Résultats */}
        {hasSearched && (
          <div className="space-y-4">
            {/* Header résultats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-semibold text-warm-900">
                  {isSearching ? 'Recherche en cours...' : `${filteredProspects.length} prospects trouvés`}
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

              {selectedProspects.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-warm-500">
                    {selectedProspects.length} sélectionné(s)
                  </span>
                  <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors">
                    <UserPlus className="w-4 h-4" />
                    Ajouter aux prospects
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-medium rounded-xl transition-colors">
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
                <p className="text-warm-600 font-medium">Analyse des profils similaires...</p>
                <p className="text-warm-400 text-sm mt-1">Récupération des posts récents pour personnalisation</p>
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

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
                    ))}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-warm-200 hover:bg-warm-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
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
                  Essayez avec un autre mot-clé ou ajustez vos filtres
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
            <p className="text-warm-500 max-w-md mx-auto mb-6">
              Entrez le @compte d'un influenceur ou un mot-clé pour découvrir des profils similaires
              qui pourraient être intéressés par vos services.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['coach fitness', 'entrepreneur', 'naturopathe', 'photographe', 'maquilleuse'].map(example => (
                <button
                  key={example}
                  onClick={() => setSearchQuery(example)}
                  className="px-3 py-1.5 bg-warm-100 hover:bg-warm-200 text-warm-600 text-sm rounded-lg transition-colors"
                >
                  {example}
                </button>
              ))}
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
 * Carte prospect individuelle avec posts récents
 */
function ProspectCard({ prospect, isSelected, onToggle, onGenerateMessage, formatNumber }) {
  const [showActions, setShowActions] = useState(false);
  const [showPosts, setShowPosts] = useState(false);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 75) return 'text-orange-500 bg-orange-50';
    return 'text-warm-500 bg-warm-100';
  };

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "aujourd'hui";
    if (days === 1) return 'hier';
    if (days < 7) return `il y a ${days}j`;
    return `il y a ${Math.floor(days / 7)} sem`;
  };

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
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-brand-500 border-brand-500'
              : 'border-warm-300 hover:border-brand-400'
          }`}
        >
          {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
        </button>

        {/* Avatar */}
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

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-warm-900">@{prospect.username}</h3>
            {prospect.isVerified && (
              <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            )}
            <span className="text-sm text-warm-400">• {prospect.fullName}</span>
          </div>

          <p className="text-sm text-warm-600 mt-1 line-clamp-2">{prospect.bio}</p>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1 text-warm-500">
              <Users className="w-4 h-4" />
              <span>{formatNumber(prospect.followers)}</span>
            </div>
            <div className="flex items-center gap-1 text-warm-500">
              <Heart className="w-4 h-4" />
              <span>{prospect.engagement}%</span>
            </div>
            <div className="flex items-center gap-1 text-warm-500">
              <MessageCircle className="w-4 h-4" />
              <span>{prospect.posts} posts</span>
            </div>
            <span className="text-warm-400">Actif {prospect.lastActive}</span>
            {prospect.recentPosts?.length > 0 && (
              <button
                onClick={() => setShowPosts(!showPosts)}
                className="flex items-center gap-1 text-brand-600 hover:text-brand-700"
              >
                <Eye className="w-4 h-4" />
                <span>{prospect.recentPosts.length} posts analysés</span>
              </button>
            )}
          </div>
        </div>

        {/* Score & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className={`px-3 py-1.5 rounded-lg font-semibold text-sm ${getScoreColor(prospect.score)}`}>
              {prospect.score}%
            </div>
            <InfoTooltip
              text="Score de pertinence basé sur : bio, engagement, activité récente, adéquation avec ta cible."
              position="left"
              size="xs"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
              title="Actions"
            >
              <MessageSquare className="w-5 h-5 text-warm-500" />
            </button>
            <a
              href={`https://${prospect.platform}.com/${prospect.username}`}
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
          <p className="text-xs font-medium text-warm-500 mb-3">Posts récents analysés :</p>
          <div className="grid grid-cols-3 gap-3">
            {prospect.recentPosts.map((post, idx) => (
              <a
                key={post.id || idx}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative"
              >
                <div className="relative aspect-square rounded-lg overflow-hidden bg-warm-100">
                  <img
                    src={post.thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {post.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <span className="flex items-center gap-0.5">
                        <Heart className="w-3 h-3" />
                        {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}K` : post.likes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageCircle className="w-3 h-3" />
                        {post.comments}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-warm-500 mt-1 line-clamp-1">{getRelativeTime(post.publishedAt)}</p>
              </a>
            ))}
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
            Ajouter aux prospects
          </button>
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
