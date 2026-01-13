import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  Search,
  Plus,
  PenLine,
  BarChart3,
  Zap,
  Flame,
  Mic2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { GoalCard, VoiceWidget } from '../components/dashboard';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

// Profil MA VOIX par défaut (non configuré)
const defaultVoiceProfile = {
  name: 'MA VOIX',
  tone: 'Non configuré',
  tutoiement: '-',
  emojis: [],
  isActive: false,
};

// Générer les actions suggérées dynamiquement
function getSuggestedActions(stats, voiceProfile, goals) {
  const actions = [];

  // Action 1: Configurer Ma Voix si pas fait
  if (!voiceProfile.isActive) {
    actions.push({
      id: 'configure-voice',
      icon: Mic2,
      title: 'Configurer ta Voix',
      description: 'Personnalise tes messages pour plus d\'impact',
      priority: 'high',
      route: '/voice',
      color: 'brand',
    });
  }

  // Action 2: Relancer les prospects chauds
  if (stats.prospects.total > 0) {
    actions.push({
      id: 'hot-prospects',
      icon: Flame,
      title: 'Relancer 3 prospects chauds',
      description: 'Ils n\'attendent que toi !',
      priority: 'high',
      route: '/prospects?status=contacted',
      color: 'orange',
    });
  }

  // Action 3: Générer des messages si prospects sans message
  if (stats.prospects.total > stats.messages.total) {
    actions.push({
      id: 'generate-messages',
      icon: PenLine,
      title: `Générer ${Math.min(5, stats.prospects.total - stats.messages.total)} messages`,
      description: 'Des prospects attendent un premier contact',
      priority: 'medium',
      route: '/messages',
      color: 'accent',
    });
  }

  // Action 4: Lancer une recherche si peu de prospects
  if (stats.prospects.total < 10) {
    actions.push({
      id: 'new-search',
      icon: Search,
      title: 'Trouver de nouveaux prospects',
      description: 'Lance une recherche pour alimenter ton pipeline',
      priority: 'medium',
      route: '/search',
      color: 'purple',
    });
  }

  // Action 5: Voir les analytics si activité
  if (stats.messages.envoyes > 0) {
    actions.push({
      id: 'check-analytics',
      icon: BarChart3,
      title: 'Analyser tes performances',
      description: 'Découvre ce qui fonctionne le mieux',
      priority: 'low',
      route: '/analytics',
      color: 'green',
    });
  }

  // Retourner max 3 actions, triées par priorité
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3);
}

// Générer un micro-texte encourageant pour les KPIs
function getKpiEncouragement(type, value, previousValue = 0) {
  if (type === 'prospects' && value > 0) {
    if (value >= 50) return 'Pipeline bien rempli !';
    if (value >= 20) return 'Bonne base de travail';
    return 'Continue à alimenter';
  }
  if (type === 'messages' && value > 0) {
    if (value >= 20) return 'Belle production !';
    if (value >= 10) return 'Bon rythme cette semaine';
    return 'Chaque message compte';
  }
  if (type === 'sent' && value > 0) {
    return `${value} envoyé${value > 1 ? 's' : ''} cette semaine`;
  }
  if (type === 'response' && value > 0) {
    if (value >= 30) return 'Excellent taux !';
    if (value >= 15) return 'Au-dessus de la moyenne';
    return 'Chaque réponse est une victoire';
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    prospects: { total: 0, trend: null },
    messages: { total: 0, envoyes: 0, repondus: 0, taux_reponse: 0, trend: null },
  });
  const [usage, setUsage] = useState({
    prospects: { used: 0, limit: 500 },
    messages: { used: 0, limit: 500 },
    searches: { used: 0, limit: 50 },
  });
  const [goals, setGoals] = useState({
    monthly_goal_responses: 10,
    monthly_goal_meetings: 3,
    current_responses: 0,
    current_meetings: 0,
  });

  // Charger les stats depuis l'API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getAnalytics();
        if (response.data) {
          const data = response.data;
          setStats({
            prospects: {
              total: data.prospects?.total || 0,
              trend: null,
            },
            messages: {
              total: data.messages?.total || 0,
              envoyes: data.messages?.envoyes || 0,
              repondus: data.messages?.repondus || 0,
              taux_reponse: data.messages?.taux_reponse || 0,
              trend: null,
            },
          });
          // Mettre à jour les objectifs avec les vraies valeurs
          setGoals(prev => ({
            ...prev,
            current_responses: data.messages?.repondus || 0,
            current_meetings: data.conversions?.total || 0,
          }));
          // Mettre à jour l'usage
          setUsage({
            prospects: { used: data.prospects?.total || 0, limit: 500 },
            messages: { used: data.messages?.total || 0, limit: 500 },
            searches: { used: 0, limit: 50 },
          });
        }
      } catch (error) {
        console.error('Erreur chargement analytics:', error);
      }
    };
    fetchStats();
  }, []);

  const handleSaveGoals = async (newGoals) => {
    setGoals((prev) => ({ ...prev, ...newGoals }));
  };

  // Récupérer le prénom de l'utilisateur
  const getUserFirstName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    if (user?.name) {
      return user.name;
    }
    return 'there';
  };

  const firstName = getUserFirstName();

  // Générer les actions suggérées
  const suggestedActions = getSuggestedActions(stats, defaultVoiceProfile, goals);

  return (
    <>
      <Header
        title={`Bonjour ${firstName} !`}
        subtitle="Voici un aperçu de votre activité"
        action={
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25"
          >
            <Search className="w-5 h-5" />
            Nouvelle recherche
          </button>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* NOUVEAU: Bloc "À faire maintenant" */}
        {suggestedActions.length > 0 && (
          <div className="card p-5 bg-gradient-to-r from-brand-50 via-white to-accent-50 border-brand-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-display font-semibold text-warm-900">À faire maintenant</h2>
              <span className="ml-auto text-xs text-warm-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Suggestions personnalisées
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {suggestedActions.map((action) => (
                <ActionSuggestion
                  key={action.id}
                  icon={action.icon}
                  title={action.title}
                  description={action.description}
                  color={action.color}
                  onClick={() => navigate(action.route)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Section haute: KPIs + Ma Voix côte à côte */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* KPIs principaux - cliquables */}
          <ClickableStatCard
            icon={Users}
            label="Prospects totaux"
            value={stats.prospects.total}
            trend={stats.prospects.trend}
            color="brand"
            encouragement={getKpiEncouragement('prospects', stats.prospects.total)}
            onClick={() => navigate('/prospects')}
          />
          <ClickableStatCard
            icon={MessageSquare}
            label="Messages générés"
            value={stats.messages.total}
            trend={stats.messages.trend}
            color="accent"
            encouragement={getKpiEncouragement('messages', stats.messages.total)}
            onClick={() => navigate('/messages')}
          />
          <ClickableStatCard
            icon={Send}
            label="Messages envoyés"
            value={stats.messages.envoyes}
            trend={null}
            color="green"
            encouragement={getKpiEncouragement('sent', stats.messages.envoyes)}
            onClick={() => navigate('/messages?tab=sent')}
          />
          <ClickableStatCard
            icon={TrendingUp}
            label="Taux de réponse"
            value={`${stats.messages.taux_reponse}%`}
            subValue={`${stats.messages.repondus} réponses`}
            color="purple"
            encouragement={getKpiEncouragement('response', stats.messages.taux_reponse)}
            onClick={() => navigate('/analytics')}
          />
        </div>

        {/* Section : Ma Voix + Prospects récents (remontés) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* MA VOIX Widget - remonté et agrandi */}
          <div className="lg:col-span-1">
            <VoiceWidget
              voiceProfile={defaultVoiceProfile}
              onEditProfile={() => navigate('/voice')}
            />
          </div>

          {/* Prospects récents - remonté */}
          <div className="lg:col-span-2 card">
            <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-semibold text-warm-900">Prospects récents</h2>
                <span className="text-xs bg-warm-100 text-warm-500 px-2 py-0.5 rounded-full">
                  {stats.prospects.total}
                </span>
              </div>
              <button
                onClick={() => navigate('/prospects')}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                Voir tout <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {/* État vide - aucun prospect */}
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="font-semibold text-warm-700 mb-2">Tes futurs clients t'attendent</h3>
              <p className="text-sm text-warm-500 mb-4">
                Lance une recherche pour découvrir des prospects qualifiés
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-brand-500/25 flex items-center gap-2 mx-auto"
              >
                <Search className="w-4 h-4" />
                Lancer une recherche
              </button>
            </div>
          </div>
        </div>

        {/* Objectif du mois - transformé en mini coach */}
        <GoalCard
          goalResponses={goals.monthly_goal_responses}
          goalMeetings={goals.monthly_goal_meetings}
          currentResponses={goals.current_responses}
          currentMeetings={goals.current_meetings}
          onSaveGoals={handleSaveGoals}
        />

        {/* Section basse: Usage + Astuce */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Usage */}
          <div className="lg:col-span-2 card p-6">
            <h3 className="font-semibold text-warm-900 mb-4">Usage ce mois</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <UsageBar
                label="Prospects analysés"
                used={usage.prospects.used}
                limit={usage.prospects.limit}
                color="brand"
              />
              <UsageBar
                label="Messages générés"
                used={usage.messages.used}
                limit={usage.messages.limit}
                color="accent"
              />
              <UsageBar
                label="Recherches aujourd'hui"
                used={usage.searches.used}
                limit={usage.searches.limit}
                color="green"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-warm-100">
              <p className="text-xs text-warm-400">
                Bêta gratuite &bull; Usage illimité
              </p>
            </div>
          </div>

          {/* Astuce du jour */}
          <div className="card p-6 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-warm-900 mb-1">Astuce du jour</h4>
                <p className="text-sm text-warm-600">
                  Les messages envoyés entre 9h et 11h ont un taux de réponse 34% plus élevé !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            icon={Plus}
            title="Ajouter des prospects"
            description="Import manuel ou recherche"
            color="brand"
            onClick={() => navigate('/search')}
          />
          <QuickAction
            icon={PenLine}
            title="Générer des messages"
            description="Pour vos prospects en attente"
            color="accent"
            onClick={() => navigate('/messages')}
          />
          <QuickAction
            icon={BarChart3}
            title="Voir les analytics"
            description="Performance de vos campagnes"
            color="purple"
            onClick={() => navigate('/analytics')}
          />
        </div>
      </div>
    </>
  );
}

// Composant ActionSuggestion pour le bloc "À faire maintenant"
function ActionSuggestion({ icon: Icon, title, description, color = 'brand', onClick }) {
  const colorClasses = {
    brand: 'bg-brand-100 text-brand-600 group-hover:bg-brand-200',
    accent: 'bg-accent-100 text-accent-600 group-hover:bg-accent-200',
    orange: 'bg-orange-100 text-orange-600 group-hover:bg-orange-200',
    purple: 'bg-purple-100 text-purple-600 group-hover:bg-purple-200',
    green: 'bg-green-100 text-green-600 group-hover:bg-green-200',
  };

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 p-3 bg-white hover:bg-warm-50 border border-warm-100 hover:border-brand-200 rounded-xl transition-all text-left"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-warm-900 text-sm truncate">{title}</p>
        <p className="text-xs text-warm-500 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-warm-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </button>
  );
}

// Composant ClickableStatCard amélioré avec couleurs dynamiques et micro-texte
function ClickableStatCard({ icon: Icon, label, value, trend, subValue, color = 'brand', encouragement, onClick }) {
  const colorClasses = {
    brand: {
      icon: 'bg-brand-100 text-brand-600',
      iconActive: 'bg-brand-500 text-white',
      glow: 'shadow-brand-500/20',
    },
    accent: {
      icon: 'bg-accent-100 text-accent-600',
      iconActive: 'bg-accent-500 text-white',
      glow: 'shadow-accent-500/20',
    },
    green: {
      icon: 'bg-green-100 text-green-600',
      iconActive: 'bg-green-500 text-white',
      glow: 'shadow-green-500/20',
    },
    purple: {
      icon: 'bg-purple-100 text-purple-600',
      iconActive: 'bg-purple-500 text-white',
      glow: 'shadow-purple-500/20',
    },
  };

  const isPositive = trend?.startsWith('+');
  const hasValue = value !== 0 && value !== '0%';
  const colors = colorClasses[color];

  return (
    <button
      onClick={onClick}
      className={`card stat-card p-5 text-left transition-all hover:shadow-lg group cursor-pointer ${hasValue ? colors.glow : ''}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${hasValue ? colors.iconActive : colors.icon} group-hover:scale-105`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {isPositive ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
            {trend}
          </span>
        )}
      </div>
      <p className={`text-3xl font-bold transition-colors ${hasValue ? 'text-warm-900' : 'text-warm-400'}`}>{value}</p>
      <p className="text-sm text-warm-500">{label}</p>
      {/* Micro-texte encourageant */}
      {encouragement && (
        <p className="text-xs text-brand-600 mt-2 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {encouragement}
        </p>
      )}
      {/* Indication cliquable */}
      <div className="flex items-center gap-1 text-xs text-warm-400 mt-2 group-hover:text-brand-500 transition-colors">
        <span>Voir détails</span>
        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </button>
  );
}

// Composant barre d'usage
function UsageBar({ label, used, limit, color = 'brand' }) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const colorClasses = {
    brand: 'bg-brand-500',
    accent: 'bg-accent-500',
    green: 'bg-green-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-warm-500">{label}</span>
        <span className="font-medium text-warm-700">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colorClasses[color]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// Composant action rapide
function QuickAction({ icon: Icon, title, description, color = 'brand', onClick }) {
  const colorClasses = {
    brand: 'bg-brand-100 group-hover:bg-brand-200 text-brand-600',
    accent: 'bg-accent-100 group-hover:bg-accent-200 text-accent-600',
    purple: 'bg-purple-100 group-hover:bg-purple-200 text-purple-600',
  };

  return (
    <button
      onClick={onClick}
      className="card p-4 flex items-center gap-4 hover:border-brand-300 transition-colors group text-left"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${colorClasses[color]}`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-semibold text-warm-900">{title}</p>
        <p className="text-sm text-warm-500">{description}</p>
      </div>
    </button>
  );
}
