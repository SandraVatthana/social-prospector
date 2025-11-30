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
  Sparkles,
  X,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { GoalCard, VoiceWidget } from '../components/dashboard';
import { ProspectCard } from '../components/prospects';
import { useAuth } from '../contexts/AuthContext';

// Données mock pour la démo
const mockStats = {
  prospects: { total: 127, trend: '+23%' },
  messages: { total: 84, envoyes: 52, repondus: 12, taux_reponse: 23, trend: '+18%' },
};

const mockProspects = [
  {
    id: 1,
    username: 'marie_coaching',
    platform: 'instagram',
    bio: 'Coach en développement personnel',
    followers: 12400,
    status: 'a_contacter',
    score: 87,
    added_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 2,
    username: 'julie_business',
    platform: 'instagram',
    bio: 'Consultante marketing digital',
    followers: 8200,
    status: 'envoye',
    score: 92,
    added_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 3,
    username: 'emma.creatrice',
    platform: 'tiktok',
    bio: 'Créatrice de contenu lifestyle',
    followers: 45600,
    status: 'repondu',
    score: 78,
    added_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 4,
    username: 'sophie_mindset',
    platform: 'instagram',
    bio: 'Coach mindset & productivité',
    followers: 5800,
    status: 'nouveau',
    score: 65,
    added_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const mockVoiceProfile = {
  name: 'MA VOIX — Sandra',
  tone: 'Décontracté, Direct',
  tutoiement: 'Toujours',
  emojis: ['🚀', '✨', '💪', '🔥'],
  isActive: true,
};

const mockUsage = {
  prospects: { used: 127, limit: 500 },
  messages: { used: 84, limit: 500 },
  searches: { used: 3, limit: 50 },
};

const mockUser = {
  name: 'Sandra',
  plan: 'Solo',
  days_until_renewal: 23,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [goals, setGoals] = useState({
    monthly_goal_responses: 20,
    monthly_goal_meetings: 5,
    current_responses: 12,
    current_meetings: 3,
  });

  // Afficher le message de bienvenue pour les nouveaux utilisateurs
  useEffect(() => {
    const welcomeKey = 'social-prospector-welcome-shown';
    const hasSeenWelcome = localStorage.getItem(welcomeKey);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem(welcomeKey, 'true');
    }
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

  return (
    <>
      {/* Message de bienvenue pour les nouveaux utilisateurs */}
      {showWelcome && (
        <div className="mx-6 mt-6 lg:mx-8 lg:mt-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 via-brand-600 to-accent-500 p-6 text-white shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

            <button
              onClick={() => setShowWelcome(false)}
              className="absolute top-4 right-4 p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">
                  Bienvenue sur Social Prospector, {firstName} !
                </h2>
                <p className="text-white/90 mb-4">
                  Vous venez de faire le premier pas vers une prospection Instagram & TikTok
                  vraiment efficace. Voici comment commencer :
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setShowWelcome(false); navigate('/voice'); }}
                    className="px-4 py-2 bg-white text-brand-600 rounded-lg font-semibold hover:bg-white/90 transition-colors"
                  >
                    Configurer ma voix
                  </button>
                  <button
                    onClick={() => { setShowWelcome(false); navigate('/search'); }}
                    className="px-4 py-2 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition-colors"
                  >
                    Lancer une recherche
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="p-6 lg:p-8 space-y-8">
        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Users}
            label="Prospects totaux"
            value={mockStats.prospects.total}
            trend={mockStats.prospects.trend}
            color="brand"
          />
          <StatCard
            icon={MessageSquare}
            label="Messages générés"
            value={mockStats.messages.total}
            trend={mockStats.messages.trend}
            color="accent"
          />
          <StatCard
            icon={Send}
            label="Messages envoyés"
            value={mockStats.messages.envoyes}
            trend="+0%"
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux de réponse"
            value={`${mockStats.messages.taux_reponse}%`}
            subValue={`${mockStats.messages.repondus} réponses`}
            color="purple"
          />
        </div>

        {/* Objectif du mois - NOUVEAU */}
        <GoalCard
          goalResponses={goals.monthly_goal_responses}
          goalMeetings={goals.monthly_goal_meetings}
          currentResponses={goals.current_responses}
          currentMeetings={goals.current_meetings}
          onSaveGoals={handleSaveGoals}
        />

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Prospects récents */}
          <div className="lg:col-span-2 card">
            <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between">
              <h2 className="font-display font-semibold text-warm-900">Prospects récents</h2>
              <button
                onClick={() => navigate('/prospects')}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Voir tout &rarr;
              </button>
            </div>
            <div className="divide-y divide-warm-100">
              {mockProspects.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  onClick={() => navigate(`/prospects/${prospect.id}`)}
                  onGenerateMessage={() => navigate(`/messages/new?prospect=${prospect.id}`)}
                  compact
                />
              ))}
            </div>
          </div>

          {/* Sidebar droite */}
          <div className="space-y-6">
            {/* MA VOIX Widget */}
            <VoiceWidget
              voiceProfile={mockVoiceProfile}
              onEditProfile={() => navigate('/voice')}
            />

            {/* Usage */}
            <div className="card p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Usage ce mois</h3>

              <div className="space-y-4">
                <UsageBar
                  label="Prospects analysés"
                  used={mockUsage.prospects.used}
                  limit={mockUsage.prospects.limit}
                  color="brand"
                />
                <UsageBar
                  label="Messages générés"
                  used={mockUsage.messages.used}
                  limit={mockUsage.messages.limit}
                  color="accent"
                />
                <UsageBar
                  label="Recherches aujourd'hui"
                  used={mockUsage.searches.used}
                  limit={mockUsage.searches.limit}
                  color="green"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-warm-100">
                <p className="text-xs text-warm-400">
                  Plan {mockUser.plan} &bull; Renouvellement dans {mockUser.days_until_renewal} jours
                </p>
              </div>
            </div>

            {/* Astuce du jour */}
            <div className="card p-6 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
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

// Composant StatCard simplifié
function StatCard({ icon: Icon, label, value, trend, subValue, color = 'brand' }) {
  const colorClasses = {
    brand: 'bg-brand-100 text-brand-600',
    accent: 'bg-accent-100 text-accent-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const isPositive = trend?.startsWith('+');

  return (
    <div className="card stat-card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
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
      <p className="text-3xl font-bold text-warm-900">{value}</p>
      <p className="text-sm text-warm-500">{subValue || label}</p>
    </div>
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
