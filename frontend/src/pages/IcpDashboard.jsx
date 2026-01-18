import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  TrendingUp,
  Users,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Star,
  AlertCircle,
  CheckCircle2,
  Zap,
  Brain,
  BarChart3,
  Instagram,
  MessageSquare,
  Loader2,
  ArrowRight,
  Lightbulb,
  Edit3,
  Save,
  X
} from 'lucide-react';
import Header from '../components/layout/Header';
import ExportDropdown from '../components/ui/ExportDropdown';
import { API_BASE_URL } from '../lib/api';

// LinkedIn Icon
const LinkedInIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Score tier config
const SCORE_TIERS = {
  excellent: { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100', min: 80 },
  good: { label: 'Bon', color: 'text-blue-600', bg: 'bg-blue-100', min: 60 },
  average: { label: 'Moyen', color: 'text-amber-600', bg: 'bg-amber-100', min: 40 },
  low: { label: 'Faible', color: 'text-red-600', bg: 'bg-red-100', min: 0 }
};

const getScoreTier = (score) => {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  return 'low';
};

export default function IcpDashboard() {
  const [icp, setIcp] = useState(null);
  const [stats, setStats] = useState(null);
  const [topProspects, setTopProspects] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringProgress, setScoringProgress] = useState({ current: 0, total: 0 });
  const [isExtracting, setIsExtracting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedIcp, setEditedIcp] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchICP(),
        fetchStats(),
        fetchTopProspects(),
        fetchRecommendations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchICP = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/icp/me`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIcp(data.icp);
      }
    } catch (error) {
      console.error('Error fetching ICP:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/icp/stats`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTopProspects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/icp/top-prospects?limit=6`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTopProspects(data.prospects);
      }
    } catch (error) {
      console.error('Error fetching top prospects:', error);
      setTopProspects([]);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/icp/recommendations`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const handleScoreAll = async () => {
    setIsScoring(true);
    setScoringProgress({ current: 0, total: 0 });

    try {
      // D'abord, récupérer le nombre total de prospects à scorer
      const countResponse = await fetch(`${API_BASE_URL}/icp/unscored-count`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!countResponse.ok) {
        throw new Error('Erreur récupération du compte');
      }

      const countData = await countResponse.json();
      const total = countData.count;

      if (total === 0) {
        alert('Tous les prospects sont déjà scorés !');
        setIsScoring(false);
        return;
      }

      setScoringProgress({ current: 0, total });

      // Scorer par lots de 5
      const batchSize = 5;
      let processed = 0;
      let totalSaved = 0;

      while (processed < total) {
        const response = await fetch(`${API_BASE_URL}/icp/score-all`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ limit: batchSize })
        });

        if (!response.ok) {
          throw new Error('Erreur lors du scoring');
        }

        const data = await response.json();

        if (data.processed === 0) {
          // Plus de prospects à scorer
          break;
        }

        processed += data.processed;
        totalSaved += data.saved || 0;
        setScoringProgress({ current: processed, total });
      }

      alert(`${totalSaved} prospects scorés !`);
      fetchAllData();
    } catch (error) {
      console.error('Error scoring:', error);
      alert('Erreur lors du scoring: ' + error.message);
    } finally {
      setIsScoring(false);
      setScoringProgress({ current: 0, total: 0 });
    }
  };

  const handleExtractInsights = async () => {
    setIsExtracting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/icp/extract-insights`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInsights(data);
      } else {
        console.error('Error extracting insights:', response.status);
      }
    } catch (error) {
      console.error('Error extracting:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleApplyInsights = async () => {
    if (!insights) return;
    try {
      const response = await fetch(`${API_BASE_URL}/icp/apply-insights`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ insights })
      });
      if (response.ok) {
        alert('ICP mis à jour avec les insights !');
        setInsights(null);
        fetchICP();
      }
    } catch (error) {
      console.error('Error applying insights:', error);
    }
  };

  const handleSaveICP = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/icp/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ icp: editedIcp })
      });
      if (response.ok) {
        setIcp(editedIcp);
        setEditMode(false);
        alert('ICP sauvegardé !');
      }
    } catch (error) {
      console.error('Error saving ICP:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="ICP Dashboard" subtitle="Chargement..." />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-brand-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="ICP Dashboard"
        subtitle="Profil Client Idéal & Scoring des prospects"
      />

      <div className="p-6 lg:p-8 space-y-6">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <Target className="w-8 h-8 text-brand-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-warm-700">{stats?.total || 0}</p>
            <p className="text-sm text-warm-500">Prospects scorés</p>
          </div>
          <div className="card p-4 text-center bg-gradient-to-br from-green-50 to-emerald-50">
            <Star className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats?.byScore?.excellent || 0}</p>
            <p className="text-sm text-green-600">Score Excellent</p>
          </div>
          <div className="card p-4 text-center bg-gradient-to-br from-blue-50 to-cyan-50">
            <TrendingUp className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{stats?.averageScore || 0}</p>
            <p className="text-sm text-blue-500">Score moyen</p>
          </div>
          <div className="card p-4 text-center">
            <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-purple-600">
              {stats?.conversionByScore?.excellent?.conversionRate || 0}%
            </p>
            <p className="text-sm text-warm-500">Conversion (Excellent)</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleScoreAll}
            disabled={isScoring}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 min-w-[200px]"
          >
            {isScoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {scoringProgress.total > 0
                    ? `${scoringProgress.current}/${scoringProgress.total} prospects...`
                    : 'Chargement...'}
                </span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Scorer tous les prospects
              </>
            )}
          </button>
          <button
            onClick={handleExtractInsights}
            disabled={isExtracting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Extraire insights ICP
          </button>
          <button
            onClick={fetchAllData}
            className="flex items-center gap-2 px-4 py-2 border border-warm-200 hover:bg-warm-50 font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <ExportDropdown type="icp" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne 1: Mon ICP */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-warm-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-brand-500" />
                  Mon ICP
                </h2>
                {!editMode ? (
                  <button
                    onClick={() => { setEditMode(true); setEditedIcp(icp); }}
                    className="p-2 hover:bg-warm-100 rounded-lg"
                  >
                    <Edit3 className="w-4 h-4 text-warm-400" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveICP} className="p-2 hover:bg-green-100 rounded-lg text-green-600">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditMode(false)} className="p-2 hover:bg-red-100 rounded-lg text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-warm-600">Description cible</label>
                    <textarea
                      value={editedIcp?.description || ''}
                      onChange={(e) => setEditedIcp({ ...editedIcp, description: e.target.value })}
                      className="w-full mt-1 p-2 border border-warm-200 rounded-lg text-sm"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-warm-600">Problèmes résolus</label>
                    <textarea
                      value={editedIcp?.problemes || ''}
                      onChange={(e) => setEditedIcp({ ...editedIcp, problemes: e.target.value })}
                      className="w-full mt-1 p-2 border border-warm-200 rounded-lg text-sm"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-warm-600">Mots-clés (séparés par virgule)</label>
                    <input
                      value={editedIcp?.keywords?.join(', ') || ''}
                      onChange={(e) => setEditedIcp({ ...editedIcp, keywords: e.target.value.split(',').map(k => k.trim()) })}
                      className="w-full mt-1 p-2 border border-warm-200 rounded-lg text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {icp?.description && (
                    <div>
                      <p className="text-xs text-warm-400 uppercase tracking-wide">Description</p>
                      <p className="text-sm text-warm-700 mt-1">{icp.description}</p>
                    </div>
                  )}
                  {icp?.problemes && (
                    <div>
                      <p className="text-xs text-warm-400 uppercase tracking-wide">Problèmes résolus</p>
                      <p className="text-sm text-warm-700 mt-1">{icp.problemes}</p>
                    </div>
                  )}
                  {icp?.keywords?.length > 0 && (
                    <div>
                      <p className="text-xs text-warm-400 uppercase tracking-wide">Mots-clés</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {icp.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {icp?.painPoints?.length > 0 && (
                    <div>
                      <p className="text-xs text-warm-400 uppercase tracking-wide">Points de douleur</p>
                      <ul className="mt-1 space-y-1">
                        {icp.painPoints.map((pp, i) => (
                          <li key={i} className="text-sm text-warm-600 flex items-start gap-2">
                            <AlertCircle className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" />
                            {pp}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {icp?.confidence > 0 && (
                    <div className="pt-3 border-t border-warm-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-warm-500">Confiance ICP</span>
                        <span className="font-medium text-warm-700">{Math.round(icp.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Distribution des scores */}
            {stats && (
              <div className="card p-6">
                <h3 className="font-semibold text-warm-800 mb-4">Distribution des scores</h3>
                <div className="space-y-3">
                  {Object.entries(SCORE_TIERS).map(([tier, config]) => {
                    const count = stats.byScore?.[tier] || 0;
                    const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={tier}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={config.color}>{config.label}</span>
                          <span className="text-warm-500">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.bg.replace('bg-', 'bg-').replace('-100', '-500')}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Colonne 2-3: Top Prospects & Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Insights extraits */}
            {insights && insights.success && (
              <div className="card p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-800">Insights extraits</h3>
                  </div>
                  <button
                    onClick={() => setInsights(null)}
                    className="p-1 hover:bg-purple-100 rounded"
                  >
                    <X className="w-4 h-4 text-purple-400" />
                  </button>
                </div>

                <p className="text-sm text-purple-700 mb-4">{insights.summary}</p>

                {insights.improvements && (
                  <div className="space-y-3 mb-4">
                    {insights.improvements.new_keywords?.length > 0 && (
                      <div>
                        <p className="text-xs text-purple-500 uppercase">Nouveaux mots-clés suggérés</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {insights.improvements.new_keywords.map((kw, i) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full">
                              + {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {insights.improvements.description_refined && (
                      <div>
                        <p className="text-xs text-purple-500 uppercase">Description affinée</p>
                        <p className="text-sm text-purple-700 mt-1 italic">"{insights.improvements.description_refined}"</p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleApplyInsights}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Appliquer ces insights à mon ICP
                </button>
              </div>
            )}

            {/* Top prospects */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-warm-800 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  Meilleurs prospects (Score ICP)
                </h3>
                <Link to="/prospects" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
                  Voir tous <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {topProspects.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-warm-300 mx-auto mb-3" />
                  <p className="text-warm-500">Aucun prospect scoré</p>
                  <button
                    onClick={handleScoreAll}
                    className="mt-3 text-sm text-brand-600 hover:text-brand-700"
                  >
                    Scorer mes prospects
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {topProspects.map((prospect) => {
                    const tier = getScoreTier(prospect.icp_score);
                    const tierConfig = SCORE_TIERS[tier];
                    return (
                      <div key={prospect.id} className="flex items-center gap-3 p-3 bg-warm-50 rounded-xl hover:bg-warm-100 transition-colors">
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-lg ${tierConfig.bg} flex items-center justify-center`}>
                            <span className={`text-lg font-bold ${tierConfig.color}`}>
                              {prospect.icp_score}
                            </span>
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                            prospect.platform === 'linkedin' ? 'bg-[#0A66C2]' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                          }`}>
                            {prospect.platform === 'linkedin'
                              ? <LinkedInIcon className="w-2.5 h-2.5 text-white" />
                              : <Instagram className="w-2.5 h-2.5 text-white" />
                            }
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-warm-900 truncate">
                            {prospect.full_name || prospect.username}
                          </p>
                          <p className="text-xs text-warm-500 truncate">{prospect.bio?.substring(0, 60)}</p>
                        </div>
                        {prospect.icp_personalization_hooks?.length > 0 && (
                          <div className="hidden md:block">
                            <span className="px-2 py-1 bg-brand-100 text-brand-700 text-xs rounded-lg">
                              {prospect.icp_personalization_hooks[0]}
                            </span>
                          </div>
                        )}
                        <Link
                          to={`/conversation/${prospect.id}`}
                          className="p-2 hover:bg-brand-100 rounded-lg text-brand-600"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Tips */}
            {recommendations?.tips?.length > 0 && (
              <div className="card p-6">
                <h3 className="font-semibold text-warm-800 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Recommandations
                </h3>
                <div className="space-y-3">
                  {recommendations.tips.map((tip, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        tip.type === 'warning' ? 'bg-amber-50' :
                        tip.type === 'action' ? 'bg-green-50' : 'bg-blue-50'
                      }`}
                    >
                      {tip.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                      {tip.type === 'action' && <Zap className="w-5 h-5 text-green-500 flex-shrink-0" />}
                      {tip.type === 'insight' && <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                      <p className="text-sm text-warm-700">{tip.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

