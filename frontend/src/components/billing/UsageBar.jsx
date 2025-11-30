/**
 * Barre de progression d'usage avec animation
 */
export default function UsageBar({
  label,
  used,
  limit,
  icon: Icon,
  color = 'brand', // 'brand' | 'green' | 'amber' | 'red'
  showPercentage = true,
}) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
  
  // Déterminer la couleur en fonction du pourcentage
  const autoColor = percentage >= 90 ? 'red' : percentage >= 70 ? 'amber' : color;
  
  const colorClasses = {
    brand: {
      bar: 'bg-brand-500',
      bg: 'bg-brand-100',
      text: 'text-brand-600',
    },
    green: {
      bar: 'bg-green-500',
      bg: 'bg-green-100',
      text: 'text-green-600',
    },
    amber: {
      bar: 'bg-amber-500',
      bg: 'bg-amber-100',
      text: 'text-amber-600',
    },
    red: {
      bar: 'bg-red-500',
      bg: 'bg-red-100',
      text: 'text-red-600',
    },
  };

  const colors = colorClasses[autoColor];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${colors.text}`} />}
          <span className="text-sm font-medium text-warm-700">{label}</span>
        </div>
        <div className="text-sm text-warm-500">
          <span className="font-semibold text-warm-900">{used}</span>
          {' / '}
          <span>{isUnlimited ? '∞' : limit}</span>
          {showPercentage && !isUnlimited && (
            <span className={`ml-2 ${colors.text}`}>({percentage}%)</span>
          )}
        </div>
      </div>
      
      <div className={`h-2 rounded-full ${colors.bg} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500 ease-out`}
          style={{ width: isUnlimited ? '0%' : `${percentage}%` }}
        />
      </div>

      {/* Alerte si proche de la limite */}
      {percentage >= 90 && !isUnlimited && (
        <p className="text-xs text-red-600">
          ⚠️ Vous avez presque atteint votre limite
        </p>
      )}
    </div>
  );
}
