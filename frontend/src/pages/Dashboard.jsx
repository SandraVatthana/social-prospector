import { useState } from 'react';
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
} from 'lucide-react';
import Header from '../components/layout/Header';
import { GoalCard, VoiceWidget } from '../components/dashboard';
import { useAuth } from '../contexts/AuthContext';

// Stats initiales (vides pour la bêta)
const initialStats = {
  prospects: { total: 0, trend: null },
  messages: { total: 0, envoyes: 0, repondus: 0, taux_reponse: 0, trend: null },
};

// Profil MA VOIX par défaut (non configuré)
const defaultVoiceProfile = {
  name: 'MA VOIX',
  tone: 'Non configuré',
  tutoiement: '-',
  emojis: [],
  isActive: false,
};

// Usage initial (bêta = illimité pour l'instant)
const initialUsage = {
  prospects: { used: 0, limit: 500 },
  messages: { used: 0, limit: 500 },
  searches: { used: 0, limit: 50 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [goals, setGoals] = useState({
    monthly_goal_responses: 10,
    monthly_goal_meetings: 3,
    current_responses: 0,
    current_meetings: 0,
  });

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
            value={initialStats.prospects.total}
            trend={initialStats.prospects.trend}
            color="brand"
          />
          <StatCard
            icon={MessageSquare}
            label="Messages générés"
            value={initialStats.messages.total}
            trend={initialStats.messages.trend}
            color="accent"
          />
          <StatCard
            icon={Send}
            label="Messages envoyés"
            value={initialStats.messages.envoyes}
            trend={null}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux de réponse"
            value={`${initialStats.messages.taux_reponse}%`}
            subValue={`${initialStats.messages.repondus} réponses`}
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
            {/* État vide - aucun prospect */}
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-warm-400" />
              </div>
              <h3 className="font-semibold text-warm-700 mb-2">Aucun prospect pour l'instant</h3>
              <p className="text-sm text-warm-500 mb-4">
                Lancez une recherche pour trouver vos premiers prospects
              </p>
              <button
                onClick={() => navigate('/search')}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors"
              >
                Lancer une recherche
              </button>
            </div>
          </div>

          {/* Sidebar droite */}
          <div className="space-y-6">
            {/* MA VOIX Widget */}
            <VoiceWidget
              voiceProfile={defaultVoiceProfile}
              onEditProfile={() => navigate('/voice')}
            />

            {/* Usage */}
            <div className="card p-6">
              <h3 className="font-semibold text-warm-900 mb-4">Usage ce mois</h3>

              <div className="space-y-4">
                <UsageBar
                  label="Prospects analysés"
                  used={initialUsage.prospects.used}
                  limit={initialUsage.prospects.limit}
                  color="brand"
                />
                <UsageBar
                  label="Messages générés"
                  used={initialUsage.messages.used}
                  limit={initialUsage.messages.limit}
                  color="accent"
                />
                <UsageBar
                  label="Recherches aujourd'hui"
                  used={initialUsage.searches.used}
                  limit={initialUsage.searches.limit}
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
