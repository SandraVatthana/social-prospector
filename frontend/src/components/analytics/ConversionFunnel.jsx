import { Users, MessageSquare, Send, MessageCircle, Trophy } from 'lucide-react';

/**
 * Funnel de conversion visuel
 */
export default function ConversionFunnel({ stats, loading }) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-warm-100 rounded w-1/3"></div>
          <div className="h-48 bg-warm-50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const stages = [
    {
      key: 'prospects',
      label: 'Prospects analysés',
      value: stats?.prospects?.total || 0,
      icon: Users,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-100',
    },
    {
      key: 'messages',
      label: 'Messages générés',
      value: stats?.messages?.total || 0,
      icon: MessageSquare,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-100',
    },
    {
      key: 'envoyes',
      label: 'Messages envoyés',
      value: stats?.messages?.envoyes || 0,
      icon: Send,
      color: 'bg-green-500',
      bgColor: 'bg-green-100',
    },
    {
      key: 'repondus',
      label: 'Réponses reçues',
      value: stats?.messages?.repondus || 0,
      icon: MessageCircle,
      color: 'bg-pink-500',
      bgColor: 'bg-pink-100',
    },
    {
      key: 'convertis',
      label: 'Convertis',
      value: stats?.conversions?.total || 0,
      icon: Trophy,
      color: 'bg-brand-500',
      bgColor: 'bg-brand-100',
    },
  ];

  // Calcul des largeurs relatives (le premier = 100%)
  const maxValue = stages[0].value || 1;

  return (
    <div className="card p-6">
      <h3 className="font-display font-semibold text-warm-900 mb-6">
        Entonnoir de conversion
      </h3>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const width = Math.max((stage.value / maxValue) * 100, 10);
          const Icon = stage.icon;
          
          // Calcul du taux par rapport à l'étape précédente
          const prevValue = index > 0 ? stages[index - 1].value : stage.value;
          const conversionRate = prevValue > 0 
            ? Math.round((stage.value / prevValue) * 100) 
            : 0;

          return (
            <div key={stage.key} className="relative">
              {/* Barre */}
              <div
                className={`${stage.bgColor} rounded-xl transition-all duration-500 ease-out`}
                style={{ width: `${width}%`, minWidth: '200px' }}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${stage.color} flex items-center justify-center`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-warm-900">{stage.label}</p>
                      <p className="text-2xl font-bold text-warm-900">{stage.value}</p>
                    </div>
                  </div>

                  {/* Taux de conversion depuis l'étape précédente */}
                  {index > 0 && (
                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        conversionRate >= 50 ? 'text-green-600' :
                        conversionRate >= 20 ? 'text-amber-600' :
                        'text-red-500'
                      }`}>
                        {conversionRate}%
                      </p>
                      <p className="text-xs text-warm-500">conversion</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Flèche entre les étapes */}
              {index < stages.length - 1 && (
                <div className="absolute left-8 -bottom-2 text-warm-300">
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="currentColor">
                    <path d="M6 8L0 0h12L6 8z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Résumé global */}
      <div className="mt-6 pt-4 border-t border-warm-100 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-brand-600">
            {stats?.messages?.taux_reponse || 0}%
          </p>
          <p className="text-sm text-warm-500">Taux de réponse global</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">
            {stats?.conversions?.taux || 0}%
          </p>
          <p className="text-sm text-warm-500">Taux de conversion global</p>
        </div>
      </div>
    </div>
  );
}
