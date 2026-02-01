import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Check, Plus, Sparkles } from 'lucide-react';
import { getBadgeConfig, SIGNAL_TYPES, SCORE_BADGES } from '../../config/scoringConfig';
import { api } from '../../lib/api';

/**
 * ScoreDetailPanel - Shows detailed scoring breakdown for a prospect
 */
export default function ScoreDetailPanel({ prospect, onClose, onScoreUpdated }) {
  const [signals, setSignals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSignals();
  }, [prospect.id]);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/scoring/prospects/${prospect.id}/signals`);
      setSignals(response.data?.data || {});
    } catch (err) {
      console.error('Error loading signals:', err);
      setError('Erreur lors du chargement des signaux');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async (forceAI = false) => {
    try {
      setCalculating(true);
      const response = await api.post(`/scoring/calculate/${prospect.id}`, { forceAI });
      const result = response.data?.data;

      if (result) {
        setSignals({
          ...signals,
          score_total: result.score,
          score_badge: result.badge,
          ...result.raw_signals
        });

        if (onScoreUpdated) {
          onScoreUpdated(prospect.id, result.score, result.badge);
        }
      }
    } catch (err) {
      console.error('Error calculating score:', err);
      setError('Erreur lors du calcul');
    } finally {
      setCalculating(false);
    }
  };

  const updateManualSignal = async (signalType, value, evidence = null) => {
    try {
      const response = await api.post(`/scoring/manual-signal/${prospect.id}`, {
        signalType,
        value,
        evidence
      });

      const result = response.data?.data;
      if (result) {
        loadSignals();
        if (onScoreUpdated) {
          onScoreUpdated(prospect.id, result.score, result.badge);
        }
      }
    } catch (err) {
      console.error('Error updating signal:', err);
    }
  };

  const badgeConfig = getBadgeConfig(signals?.score_badge || prospect.score_badge || 'cold');
  const BadgeIcon = badgeConfig.icon;

  const signalMappings = {
    newPosition: { field: 'is_new_position', evidence: 'new_position_evidence' },
    painPost: { field: 'has_pain_post', evidence: 'pain_post_content' },
    competitorEngagement: { field: 'engaged_with_competitor', evidence: 'competitor_name' },
    smallAudience: { field: 'is_small_audience', evidence: 'audience_size' },
    sameLocation: { field: 'is_same_location', evidence: 'location' }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${badgeConfig.color}`}>
              <BadgeIcon size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{prospect.full_name || prospect.username}</h3>
              <p className="text-sm text-gray-500">@{prospect.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Score Summary */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Score actuel</p>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-gray-900">
                  {signals?.score_total ?? prospect.score_total ?? 0}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeConfig.color}`}>
                  {badgeConfig.label}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => calculateScore(false)}
                disabled={calculating}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw size={16} className={calculating ? 'animate-spin' : ''} />
                Recalculer
              </button>
              <button
                onClick={() => calculateScore(true)}
                disabled={calculating}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium disabled:opacity-50"
                title="Analyse IA des posts"
              >
                <Sparkles size={16} />
                IA
              </button>
            </div>
          </div>
        </div>

        {/* Signals List */}
        <div className="p-4 overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin text-gray-400" size={24} />
            </div>
          ) : error ? (
            <p className="text-red-500 text-center py-4">{error}</p>
          ) : (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700 mb-3">Signaux d'achat detectes</h4>

              {Object.entries(SIGNAL_TYPES).map(([key, config]) => {
                const mapping = signalMappings[key];
                const isActive = signals?.[mapping.field] || false;
                const evidence = signals?.[mapping.evidence];
                const Icon = config.icon;

                return (
                  <div
                    key={key}
                    className={`p-3 rounded-lg border transition-all ${
                      isActive
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${config.color}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{config.label}</p>
                          <p className="text-xs text-gray-500">{config.description}</p>
                          {evidence && (
                            <p className="text-xs text-gray-600 mt-1 italic">
                              {typeof evidence === 'number' ? `${evidence} abonnes` : evidence}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">
                          +{config.defaultWeight}pts
                        </span>
                        <button
                          onClick={() => updateManualSignal(key, !isActive)}
                          className={`p-2 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-green-500 text-white hover:bg-green-600'
                              : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                          }`}
                        >
                          {isActive ? <Check size={16} /> : <Plus size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Score Scale */}
        <div className="p-4 border-t bg-gray-50">
          <p className="text-xs text-gray-500 mb-2">Echelle de score</p>
          <div className="flex gap-2">
            {Object.entries(SCORE_BADGES).map(([key, config]) => (
              <div key={key} className="flex-1">
                <div className={`h-2 rounded-full ${config.bgColor}`} />
                <p className="text-xs text-center mt-1 text-gray-500">
                  {config.label} ({config.minScore}+)
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
