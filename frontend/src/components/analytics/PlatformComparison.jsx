import { Instagram, Music2 } from 'lucide-react';

/**
 * Comparaison des performances par plateforme
 */
export default function PlatformComparison({ platforms, loading }) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-warm-100 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-warm-50 rounded-xl"></div>
            <div className="h-32 bg-warm-50 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const platformConfig = {
    instagram: {
      name: 'Instagram',
      icon: Instagram,
      gradient: 'from-pink-500 via-purple-500 to-indigo-500',
      bgGradient: 'from-pink-50 to-purple-50',
      iconBg: 'bg-gradient-to-br from-pink-500 to-purple-600',
    },
    tiktok: {
      name: 'TikTok',
      icon: Music2,
      gradient: 'from-black via-gray-800 to-black',
      bgGradient: 'from-gray-50 to-gray-100',
      iconBg: 'bg-black',
    },
  };

  // Trouver le gagnant pour chaque métrique
  const findWinner = (key) => {
    if (!platforms?.length) return null;
    return platforms.reduce((max, p) => (p[key] > (max?.[key] || 0) ? p : max), null)?.plateforme;
  };

  const tauxReponseWinner = findWinner('taux_reponse');
  const totalWinner = findWinner('total');

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-warm-900 mb-6">
        Performance par plateforme
      </h3>

      {!platforms?.length ? (
        <div className="text-center py-8 text-warm-500">
          <p>Pas encore de données</p>
          <p className="text-sm mt-1">Analysez des prospects pour voir les comparaisons</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const config = platformConfig[platform.plateforme] || platformConfig.instagram;
            const Icon = config.icon;
            const isTopReponse = platform.plateforme === tauxReponseWinner;
            const isTopTotal = platform.plateforme === totalWinner;

            return (
              <div
                key={platform.plateforme}
                className={`relative p-5 rounded-2xl bg-gradient-to-br ${config.bgGradient} border border-warm-100 overflow-hidden`}
              >
                {/* Badge gagnant */}
                {(isTopReponse || isTopTotal) && (
                  <div className="absolute top-3 right-3 flex gap-1">
                    {isTopReponse && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">
                        🏆 Meilleur taux
                      </span>
                    )}
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-display font-semibold text-warm-900">
                      {config.name}
                    </h4>
                    <p className="text-sm text-warm-500">
                      {platform.total} prospect{platform.total > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-xl p-3">
                    <p className="text-2xl font-bold text-warm-900">
                      {platform.taux_reponse}%
                    </p>
                    <p className="text-xs text-warm-500">Taux réponse</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3">
                    <p className="text-2xl font-bold text-warm-900">
                      {platform.taux_conversion}%
                    </p>
                    <p className="text-xs text-warm-500">Conversion</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3">
                    <p className="text-2xl font-bold text-green-600">
                      {platform.repondus}
                    </p>
                    <p className="text-xs text-warm-500">Réponses</p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-3">
                    <p className="text-2xl font-bold text-brand-600">
                      {platform.convertis}
                    </p>
                    <p className="text-xs text-warm-500">Convertis</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
