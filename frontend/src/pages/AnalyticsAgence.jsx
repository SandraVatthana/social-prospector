import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  MessageSquare,
  Send,
  TrendingUp,
  RefreshCw,
  Download,
  FileText,
  Mail,
  Clock,
  Trophy,
  Mic2,
  Calendar,
  DollarSign,
  Zap,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from 'lucide-react';
import Header from '../components/layout/Header';
import { useAuth } from '../contexts/AuthContext';
import { generateAgencyClientPDF, generateAgencyGlobalPDF } from '../lib/pdfExport';

// Données mock pour la démo agence
const mockAgencyStats = {
  total_prospects: 847,
  total_messages: 612,
  total_responses: 141,
  response_rate: 23,
  total_conversions: 42,
  conversion_rate: 6.9,
  average_basket: 500,
  estimated_revenue: 21000,
};

const mockClients = [
  {
    id: 1,
    name: 'Marie Coach',
    avatar: 'MC',
    prospects: 234,
    messages_sent: 180,
    responses: 51,
    response_rate: 28,
    conversions: 12,
    status: 'excellent', // >20%
    voice_style: 'Chaleureux, emojis',
    platform: 'instagram',
  },
  {
    id: 2,
    name: 'FitJulie',
    avatar: 'FJ',
    prospects: 189,
    messages_sent: 145,
    responses: 45,
    response_rate: 31,
    conversions: 15,
    status: 'excellent',
    voice_style: 'Direct, énergie haute',
    platform: 'instagram',
  },
  {
    id: 3,
    name: 'Alex Immo',
    avatar: 'AI',
    prospects: 156,
    messages_sent: 89,
    responses: 11,
    response_rate: 12,
    conversions: 3,
    status: 'medium', // 10-20%
    voice_style: 'Pro, vouvoiement',
    platform: 'instagram',
  },
  {
    id: 4,
    name: 'Sophie Naturo',
    avatar: 'SN',
    prospects: 78,
    messages_sent: 45,
    responses: 4,
    response_rate: 8,
    conversions: 1,
    status: 'low', // <10%
    voice_style: 'Doux, bienveillant',
    platform: 'tiktok',
  },
];

const mockTopHooks = [
  {
    pattern: "J'ai vu ton post sur [sujet]...",
    type: 'post_reference',
    response_rate: 28,
    count: 89,
    isTop: true,
  },
  {
    pattern: "Ta story sur [thème] m'a parlé...",
    type: 'story_reference',
    response_rate: 24,
    count: 67,
    isTop: false,
  },
  {
    pattern: 'On a [point commun] en commun...',
    type: 'common_point',
    response_rate: 19,
    count: 54,
    isTop: false,
  },
  {
    pattern: "J'aide les [cible] à [résultat]...",
    type: 'direct_offer',
    response_rate: 12,
    count: 112,
    isLow: true,
  },
];

const mockBestTimes = {
  days: [
    { day: 'Lundi', percent: 8 },
    { day: 'Mardi', percent: 24, isBest: true },
    { day: 'Mercredi', percent: 21, isBest: true },
    { day: 'Jeudi', percent: 15 },
    { day: 'Vendredi', percent: 12 },
    { day: 'Weekend', percent: 20 },
  ],
  hours: {
    morning: { label: '9h-11h', percent: 31 },
    evening: { label: '18h-20h', percent: 28 },
  },
  total_responses: 51,
};

const mockResponseTime = {
  average: '4h32',
  distribution: [
    { label: '< 1h', percent: 35 },
    { label: '1-6h', percent: 28 },
    { label: '6-24h', percent: 22 },
    { label: '> 24h', percent: 15 },
  ],
};

const mockVoicePerformance = [
  {
    client: 'FitJulie',
    response_rate: 31,
    conversions: 15,
    style: 'Direct, énergie haute',
    stars: 2,
  },
  {
    client: 'Marie Coaching',
    response_rate: 28,
    conversions: 12,
    style: 'Chaleureux, emojis',
    stars: 1,
  },
  {
    client: 'Alex Immo',
    response_rate: 12,
    conversions: 3,
    style: 'Pro, vouvoiement',
    stars: 0,
    isLow: true,
  },
];

export default function AnalyticsAgence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [periode, setPeriode] = useState('30d');
  const [selectedClient, setSelectedClient] = useState(null);

  const [exportSuccess, setExportSuccess] = useState(null);

  const handleExportPDF = (client) => {
    if (client) {
      // Export pour un client spécifique
      generateAgencyClientPDF({
        client,
        agencyStats: mockAgencyStats,
        hooks: mockTopHooks,
        bestTimes: mockBestTimes,
        periode,
      });
      setExportSuccess(`Rapport PDF pour ${client.name} téléchargé !`);
    } else {
      // Export global pour tous les clients
      generateAgencyGlobalPDF({
        clients: mockClients,
        agencyStats: mockAgencyStats,
        hooks: mockTopHooks,
        bestTimes: mockBestTimes,
        periode,
      });
      setExportSuccess('Rapport global téléchargé !');
    }

    // Effacer le message après 3s
    setTimeout(() => setExportSuccess(null), 3000);
  };

  const handleSendReport = (client) => {
    // TODO: Implémenter l'envoi par email
    alert(`Fonctionnalité d'envoi par email en cours de développement pour ${client?.name}`);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'text-green-500';
      case 'medium':
        return 'text-amber-500';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-warm-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <>
      {/* Toast de succès export */}
      {exportSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-500 text-white rounded-xl shadow-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{exportSuccess}</span>
          </div>
        </div>
      )}

      <Header
        title="Analytics Agence"
        subtitle="Vue globale de la performance de vos clients"
        action={
          <div className="flex items-center gap-3">
            {/* Sélecteur de période */}
            <div className="flex items-center gap-1 p-1 bg-warm-100 rounded-lg">
              {[
                { value: '7d', label: '7j' },
                { value: '30d', label: '30j' },
                { value: '90d', label: '90j' },
              ].map((p) => (
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

            <button
              onClick={() => handleExportPDF(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Rapport global</span>
            </button>
          </div>
        }
      />

      <div className="p-6 lg:p-8 space-y-8">
        {/* KPIs globaux */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={Users}
            label="Prospects trouvés"
            value={mockAgencyStats.total_prospects}
            color="brand"
          />
          <KPICard
            icon={Send}
            label="Messages envoyés"
            value={mockAgencyStats.total_messages}
            color="blue"
          />
          <KPICard
            icon={TrendingUp}
            label="Taux réponse"
            value={`${mockAgencyStats.response_rate}%`}
            color="green"
          />
          <KPICard
            icon={Trophy}
            label="Convertis"
            value={mockAgencyStats.total_conversions}
            color="amber"
          />
        </div>

        {/* Tableau performance par client */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-warm-100 flex items-center justify-between">
            <h2 className="font-display font-semibold text-warm-900">
              Performance par client
            </h2>
            <span className="text-sm text-warm-500">
              🟢 &gt;20% | 🟡 10-20% | 🔴 &lt;10%
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-warm-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Prospects
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Envoyés
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Réponses
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Taux
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Convertis
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-warm-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {mockClients.map((client) => (
                  <tr
                    key={client.id}
                    className="hover:bg-warm-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedClient(client)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{getStatusIcon(client.status)}</span>
                        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-600">
                          {client.avatar}
                        </div>
                        <div>
                          <p className="font-medium text-warm-900">{client.name}</p>
                          <p className="text-xs text-warm-500">{client.voice_style}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-warm-700">
                      {client.prospects}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-warm-700">
                      {client.messages_sent}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-warm-700">
                      {client.responses}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span
                        className={`font-bold ${getStatusColor(client.status)}`}
                      >
                        {client.response_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-warm-700">
                      {client.conversions}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportPDF(client);
                        }}
                        className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
                        title="Télécharger rapport"
                      >
                        <Download className="w-4 h-4 text-warm-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Hooks + Best Time */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Top Hooks - KILLER FEATURE */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Tes hooks qui performent
                </h3>
                <p className="text-sm text-warm-500">
                  Basé sur {mockBestTimes.total_responses} réponses ce mois
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {mockTopHooks.map((hook, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl border ${
                    hook.isTop
                      ? 'bg-green-50 border-green-200'
                      : hook.isLow
                      ? 'bg-red-50 border-red-200'
                      : 'bg-warm-50 border-warm-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="text-lg font-bold text-warm-400">
                        {index + 1}.
                      </span>
                      <div>
                        <p className="font-medium text-warm-800">
                          "{hook.pattern}"
                        </p>
                        <p className="text-xs text-warm-500 mt-1">
                          {hook.count} utilisations
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span
                        className={`text-lg font-bold ${
                          hook.isTop
                            ? 'text-green-600'
                            : hook.isLow
                            ? 'text-red-500'
                            : 'text-warm-700'
                        }`}
                      >
                        {hook.response_rate}%
                      </span>
                      {hook.isTop && <span className="ml-1">⭐</span>}
                      {hook.isLow && <span className="ml-1">😕</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Insight */}
            <div className="mt-6 p-4 bg-brand-50 rounded-xl border border-brand-100">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-800">
                  <strong>Insight :</strong> Tes accroches basées sur un contenu{' '}
                  <strong>PRÉCIS</strong> performent 2x mieux que les accroches
                  génériques.
                </p>
              </div>
            </div>
          </div>

          {/* Best Time to DM */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Tes meilleurs créneaux
                </h3>
                <p className="text-sm text-warm-500">
                  Basé sur tes {mockBestTimes.total_responses} réponses ce mois
                </p>
              </div>
            </div>

            {/* Jours */}
            <div className="space-y-3">
              {mockBestTimes.days.map((day) => (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-warm-600">{day.day}</span>
                  <div className="flex-1 h-6 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        day.isBest ? 'bg-blue-500' : 'bg-warm-300'
                      }`}
                      style={{ width: `${day.percent * 3}%` }}
                    />
                  </div>
                  <span
                    className={`w-12 text-right text-sm font-medium ${
                      day.isBest ? 'text-blue-600' : 'text-warm-600'
                    }`}
                  >
                    {day.percent}%
                    {day.isBest && ' ⭐'}
                  </span>
                </div>
              ))}
            </div>

            {/* Meilleures heures */}
            <div className="mt-6 p-4 bg-warm-50 rounded-xl">
              <p className="text-sm text-warm-600 mb-2">
                <strong>Meilleures heures :</strong>
              </p>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {mockBestTimes.hours.morning.label} ({mockBestTimes.hours.morning.percent}%)
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {mockBestTimes.hours.evening.label} ({mockBestTimes.hours.evening.percent}%)
                </span>
              </div>
            </div>

            {/* Conseil */}
            <div className="mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-brand-800">
                  <strong>Conseil :</strong> Envoie tes DMs le mardi/mercredi
                  matin pour maximiser tes réponses.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance par Voix + Réactivité */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Performance par Voix */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Mic2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Performance par voix
                </h3>
                <p className="text-sm text-warm-500">
                  Comparaison des profils MA VOIX
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-warm-100">
                    <th className="pb-3 text-left text-xs font-semibold text-warm-500 uppercase">
                      Client
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold text-warm-500 uppercase">
                      Taux
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold text-warm-500 uppercase">
                      Conv.
                    </th>
                    <th className="pb-3 text-left text-xs font-semibold text-warm-500 uppercase pl-4">
                      Style
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {mockVoicePerformance.map((voice, index) => (
                    <tr key={index}>
                      <td className="py-3 font-medium text-warm-800">
                        {voice.client}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`font-bold ${
                            voice.isLow ? 'text-red-500' : 'text-green-600'
                          }`}
                        >
                          {voice.response_rate}%
                        </span>
                        {voice.stars > 0 && (
                          <span className="ml-1">
                            {'⭐'.repeat(voice.stars)}
                          </span>
                        )}
                        {voice.isLow && <span className="ml-1">😕</span>}
                      </td>
                      <td className="py-3 text-right text-warm-700">
                        {voice.conversions}
                      </td>
                      <td className="py-3 pl-4 text-sm text-warm-500">
                        {voice.style}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insight */}
            <div className="mt-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800">
                  <strong>Insight :</strong> Les voix "directes et énergiques"
                  performent mieux dans ta niche.
                </p>
              </div>
            </div>
          </div>

          {/* Réactivité */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Réactivité
                </h3>
                <p className="text-sm text-warm-500">
                  Temps moyen avant réponse
                </p>
              </div>
            </div>

            {/* Temps moyen */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-warm-900">
                {mockResponseTime.average}
              </p>
              <p className="text-sm text-warm-500">temps moyen de réponse</p>
            </div>

            {/* Distribution */}
            <div className="space-y-3">
              {mockResponseTime.distribution.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-16 text-sm text-warm-600">{item.label}</span>
                  <div className="flex-1 h-6 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-warm-600">
                    {item.percent}%
                  </span>
                </div>
              ))}
            </div>

            {/* Conseil */}
            <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800">
                  <strong>Tip :</strong> Les prospects répondent vite ! Surveille
                  tes DMs dans les 6h après envoi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ROI / Valeur générée */}
        <div className="card p-6 bg-gradient-to-br from-brand-50 via-white to-accent-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-display text-xl font-semibold text-warm-900">
                Valeur générée ce mois
              </h3>
              <p className="text-sm text-warm-500">
                Estimation basée sur ton panier moyen
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-3xl font-bold text-brand-600">
                {mockAgencyStats.total_conversions}
              </p>
              <p className="text-sm text-warm-500">clients signés</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-3xl font-bold text-warm-700">
                {mockAgencyStats.average_basket}€
              </p>
              <p className="text-sm text-warm-500">panier moyen</p>
            </div>
            <div className="text-center p-4 bg-white rounded-xl shadow-sm">
              <p className="text-3xl font-bold text-green-600">
                {mockAgencyStats.estimated_revenue.toLocaleString()}€
              </p>
              <p className="text-sm text-warm-500">valeur estimée</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-brand-500 to-accent-500 rounded-xl text-white">
              <p className="text-3xl font-bold">
                {Math.round(
                  (mockAgencyStats.estimated_revenue / 79) * 100
                ).toLocaleString()}%
              </p>
              <p className="text-sm text-white/80">ROI</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-white/80 rounded-xl">
            <p className="text-center text-warm-600">
              Tu paies <strong>79€/mois</strong> → Tu génères ~
              <strong>{mockAgencyStats.estimated_revenue.toLocaleString()}€</strong> ={' '}
              <span className="text-brand-600 font-bold">
                ROI {Math.round((mockAgencyStats.estimated_revenue / 79) * 100).toLocaleString()}%
              </span>{' '}
              🚀
            </p>
          </div>
        </div>

        {/* Section Rapport exportable */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warm-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-warm-600" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-warm-900">
                  Rapports clients
                </h3>
                <p className="text-sm text-warm-500">
                  Génère des rapports PDF pour tes clients
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockClients.map((client) => (
              <div
                key={client.id}
                className="p-4 border border-warm-200 rounded-xl hover:border-brand-300 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-semibold text-brand-600">
                    {client.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-warm-900">{client.name}</p>
                    <p className="text-xs text-warm-500">
                      {client.response_rate}% taux réponse
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPDF(client)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-warm-100 hover:bg-warm-200 rounded-lg text-sm font-medium text-warm-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleSendReport(client)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-100 hover:bg-brand-200 rounded-lg text-sm font-medium text-brand-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Envoyer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Composant KPI Card
function KPICard({ icon: Icon, label, value, color = 'brand' }) {
  const colorClasses = {
    brand: 'bg-brand-100 text-brand-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-warm-900">{value}</p>
      <p className="text-sm text-warm-500">{label}</p>
    </div>
  );
}
