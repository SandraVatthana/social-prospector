import React, { useState, useEffect } from 'react';
import { Settings, Users, MapPin, Plus, X, Save, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { DEFAULT_WEIGHTS } from '../../config/scoringConfig';

/**
 * ScoringConfig - Configure scoring settings (competitors, location)
 */
export default function ScoringConfig({ onClose }) {
  const [config, setConfig] = useState({
    competitors: [],
    user_location: '',
    custom_weights: null
  });
  const [newCompetitor, setNewCompetitor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/scoring/config');
      const data = response.data?.data;

      if (data) {
        setConfig({
          competitors: data.competitors || [],
          user_location: data.user_location || '',
          custom_weights: data.custom_weights || null
        });
      }
    } catch (err) {
      console.error('Error loading config:', err);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      setError(null);

      await api.put('/scoring/config', {
        competitors: config.competitors,
        user_location: config.user_location || null,
        custom_weights: config.custom_weights
      });

      setSuccess('Configuration sauvegardee');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving config:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addCompetitor = () => {
    if (newCompetitor.trim() && !config.competitors.includes(newCompetitor.trim())) {
      setConfig({
        ...config,
        competitors: [...config.competitors, newCompetitor.trim()]
      });
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (competitor) => {
    setConfig({
      ...config,
      competitors: config.competitors.filter(c => c !== competitor)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="text-gray-500" size={20} />
          <h3 className="font-semibold text-gray-900">Configuration du Scoring</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X size={20} />
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Location */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <MapPin size={16} />
            Votre localisation
          </label>
          <input
            type="text"
            value={config.user_location}
            onChange={(e) => setConfig({ ...config, user_location: e.target.value })}
            placeholder="Ex: Paris, France"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Les prospects de la meme zone recevront +15 points
          </p>
        </div>

        {/* Competitors */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Users size={16} />
            Concurrents a surveiller
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCompetitor}
              onChange={(e) => setNewCompetitor(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCompetitor()}
              placeholder="Username du concurrent"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={addCompetitor}
              disabled={!newCompetitor.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
            </button>
          </div>

          {config.competitors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {config.competitors.map((competitor) => (
                <span
                  key={competitor}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  @{competitor}
                  <button
                    onClick={() => removeCompetitor(competitor)}
                    className="ml-1 p-0.5 hover:bg-gray-300 rounded-full"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              Aucun concurrent configure. Les prospects qui interagissent avec vos concurrents recevront +20 points.
            </p>
          )}
        </div>

        {/* Weights Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3">Poids des signaux</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Poste recent</span>
              <span className="font-medium">{DEFAULT_WEIGHTS.newPosition} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Douleur exprimee</span>
              <span className="font-medium">{DEFAULT_WEIGHTS.painPost} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Engage concurrent</span>
              <span className="font-medium">{DEFAULT_WEIGHTS.competitorEngagement} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Petite audience</span>
              <span className="font-medium">{DEFAULT_WEIGHTS.smallAudience} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Meme zone</span>
              <span className="font-medium">{DEFAULT_WEIGHTS.sameLocation} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50 flex justify-end">
        <button
          onClick={saveConfig}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Sauvegarder
        </button>
      </div>
    </div>
  );
}
