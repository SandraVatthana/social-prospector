import { useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

/**
 * Graphique d'évolution dans le temps
 */
export default function EvolutionChart({ data, loading }) {
  const [metric, setMetric] = useState('prospects'); // 'prospects' | 'messages' | 'reponses'

  const metrics = [
    { key: 'prospects', label: 'Prospects', color: '#6366f1' },
    { key: 'messages', label: 'Messages', color: '#f59e0b' },
    { key: 'envoyes', label: 'Envoyés', color: '#10b981' },
    { key: 'repondus', label: 'Réponses', color: '#ec4899' },
  ];

  const activeMetric = metrics.find(m => m.key === metric);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse text-warm-400">Chargement...</div>
        </div>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white rounded-xl shadow-lg border border-warm-100 p-3">
        <p className="text-sm font-medium text-warm-900 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-semibold text-warm-900">
          Évolution
        </h3>
        
        {/* Toggle métrique */}
        <div className="flex items-center gap-1 p-1 bg-warm-100 rounded-lg">
          {metrics.map(m => (
            <button
              key={m.key}
              onClick={() => setMetric(m.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                metric === m.key
                  ? 'bg-white text-warm-900 shadow-sm'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={activeMetric?.color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={activeMetric?.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
            <XAxis 
              dataKey="label" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#737373', fontSize: 12 }}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metric}
              name={activeMetric?.label}
              stroke={activeMetric?.color}
              strokeWidth={2}
              fill={`url(#gradient-${metric})`}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
