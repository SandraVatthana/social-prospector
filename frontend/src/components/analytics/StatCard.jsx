import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Carte de statistique individuelle
 */
export default function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  change, 
  changeLabel,
  trend, // 'up' | 'down' | 'neutral'
  color = 'brand', // 'brand' | 'accent' | 'green' | 'amber' | 'pink'
  size = 'default' // 'default' | 'large'
}) {
  const colorClasses = {
    brand: 'bg-brand-100 text-brand-600',
    accent: 'bg-accent-100 text-accent-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    pink: 'bg-pink-100 text-pink-600',
    warm: 'bg-warm-100 text-warm-600',
  };

  const trendColors = {
    up: 'text-green-600 bg-green-50',
    down: 'text-red-600 bg-red-50',
    neutral: 'text-warm-500 bg-warm-50',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className={`card p-${size === 'large' ? '6' : '5'} group hover:shadow-lg transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend || 'neutral']}`}>
            <TrendIcon className="w-3 h-3" />
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>

      <div className={size === 'large' ? 'mb-1' : ''}>
        <p className={`font-display font-bold text-warm-900 ${size === 'large' ? 'text-4xl' : 'text-2xl'}`}>
          {value}
        </p>
        {subValue && (
          <p className="text-sm text-warm-500 mt-0.5">{subValue}</p>
        )}
      </div>

      <p className="text-sm text-warm-500">{label}</p>
      
      {changeLabel && (
        <p className="text-xs text-warm-400 mt-1">{changeLabel}</p>
      )}
    </div>
  );
}
