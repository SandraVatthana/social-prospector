import { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  RefreshCw,
  Download,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import Header from '../components/layout/Header';
import StatCard from '../components/analytics/StatCard';
import EvolutionChart from '../components/analytics/EvolutionChart';
import TopHooks from '../components/analytics/TopHooks';
import ConversionFunnel from '../components/analytics/ConversionFunnel';
import PlatformComparison from '../components/analytics/PlatformComparison';
import { api } from '../lib/api';

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('30d');
  const [stats, setStats] = useState(null);
  const [evolution, setEvolution] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [platforms, setPlatforms] = useState([]);

  // Charger les données
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, evolutionRes, hooksRes, platformsRes] = await Promise.all([
        api.getAnalytics(),
        api.getAnalyticsEvolution(periode),
        api.getAnalyticsHooks(),
        api.getAnalyticsPlatforms(),
      ]);

      setStats(statsRes.data);
      setEvolution(evolutionRes.data || []);
      setHooks(hooksRes.data || []);
      setPlatforms(platformsRes.data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periode]);

  // Export CSV
  const handleExport = () => {
    const csvContent = [
      ['Métrique', 'Valeur'],
      ['Prospects total', stats?.prospects?.total || 0],
      ['Messages générés', stats?.messages?.total || 0],
      ['Messages envoyés', stats?.messages?.envoyes || 0],
      ['Réponses reçues', stats?.messages?.repondus || 0],
      ['Taux de réponse', `${stats?.messages?.taux_reponse || 0}%`],
      ['Conversions', stats?.conversions?.total || 0],
      ['Taux de conversion', `${stats?.conversions?.taux || 0}%`],
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <>
      <Header
        title="Analytics"
        subtitle="Analysez vos performances de prospection"
        action={
          <div className="flex items-center gap-3">
            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 p-1 bg-warm-100 rounded-lg">
              {[
                { value: '7d', label: '7 jours' },
                { value: '30d', label: '30 jours' },
                { value: '90d', label: '90 jours' },
              ].map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriode(p.value)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    periode === p.value
                      ? 'bg-white text-warm-900 shadow-sm'
                      : 'text-warm-500 hover:text-warm-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Actions */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-lg bg-white border border-warm-200 hover:border-warm-300 text-warm-600 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-warm-200 hover:border-warm-300 text-warm-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exporter</span>
            </button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* KPIs principaux */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Prospects analysés"
            value={stats?.prospects?.total || 0}
            subValue={`Score moyen: ${stats?.prospects?.score_moyen || 0}`}
            color="brand"
          />
          <StatCard
            icon={MessageSquare}
            label="Messages générés"
            value={stats?.messages?.total || 0}
            color="amber"
          />
          <StatCard
            icon={Send}
            label="Messages envoyés"
            value={stats?.messages?.envoyes || 0}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Taux de réponse"
            value={`${stats?.messages?.taux_reponse || 0}%`}
            subValue={`${stats?.messages?.repondus || 0} réponses`}
            color="pink"
          />
        </div>

        {/* Graphique d'évolution + Funnel */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EvolutionChart data={evolution} loading={loading} />
          <ConversionFunnel stats={stats} loading={loading} />
        </div>

        {/* Hooks + Plateformes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <TopHooks hooks={hooks} loading={loading} />
          <PlatformComparison platforms={platforms} loading={loading} />
        </div>

        {/* Stats détaillées par statut */}
        <div className="card p-6">
          <h3 className="font-display font-semibold text-warm-900 mb-4">
            Répartition par statut
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'nouveau', label: 'Nouveaux', color: 'bg-warm-100 text-warm-600' },
              { key: 'message_genere', label: 'Message généré', color: 'bg-accent-100 text-accent-600' },
              { key: 'envoye', label: 'Envoyés', color: 'bg-blue-100 text-blue-600' },
              { key: 'repondu', label: 'Répondus', color: 'bg-green-100 text-green-600' },
              { key: 'converti', label: 'Convertis', color: 'bg-brand-100 text-brand-600' },
              { key: 'ignore', label: 'Ignorés', color: 'bg-warm-200 text-warm-500' },
            ].map(status => (
              <div
                key={status.key}
                className={`p-4 rounded-xl ${status.color.split(' ')[0]}`}
              >
                <p className={`text-2xl font-bold ${status.color.split(' ')[1]}`}>
                  {stats?.prospects?.par_statut?.[status.key] || 0}
                </p>
                <p className="text-sm text-warm-600">{status.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="card p-6 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-warm-900 mb-1">
                Conseils pour améliorer vos taux
              </h3>
              <ul className="space-y-2 text-warm-600">
                <li className="flex items-start gap-2">
                  <span className="text-brand-500 mt-1">•</span>
                  <span>
                    <strong>Personnalisez vos hooks</strong> — Les messages qui citent un contenu spécifique du prospect ont 3x plus de réponses
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-500 mt-1">•</span>
                  <span>
                    <strong>Envoyez au bon moment</strong> — Les messages envoyés entre 9h et 11h ont les meilleurs taux d'ouverture
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand-500 mt-1">•</span>
                  <span>
                    <strong>Analysez vos meilleurs hooks</strong> — Utilisez les formulations qui fonctionnent le mieux comme base pour vos prochains messages
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
