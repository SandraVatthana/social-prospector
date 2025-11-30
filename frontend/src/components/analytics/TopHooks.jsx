import { Sparkles, MessageCircle, CheckCircle, TrendingUp } from 'lucide-react';

/**
 * Liste des meilleurs hooks par taux de réponse
 */
export default function TopHooks({ hooks, loading }) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-warm-100 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-warm-50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!hooks?.length) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="font-display font-semibold text-warm-900">
            Meilleurs hooks
          </h3>
        </div>
        
        <div className="text-center py-8 text-warm-500">
          <p>Pas encore de données</p>
          <p className="text-sm mt-1">Envoyez des messages pour voir quels hooks fonctionnent le mieux</p>
        </div>
      </div>
    );
  }

  // Trouver le max pour les barres de progression
  const maxTaux = Math.max(...hooks.map(h => h.taux_reponse), 1);

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-warm-900">
            Meilleurs hooks
          </h3>
          <p className="text-sm text-warm-500">
            Les accroches qui génèrent le plus de réponses
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {hooks.map((hook, index) => (
          <div
            key={index}
            className="relative p-4 bg-warm-50 rounded-xl hover:bg-warm-100 transition-colors group"
          >
            {/* Badge position */}
            {index < 3 && (
              <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-warm-400' : 'bg-amber-700'
              }`}>
                {index + 1}
              </div>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-warm-900 font-medium line-clamp-2 group-hover:line-clamp-none transition-all">
                  "{hook.hook}"
                </p>
                
                {/* Stats du hook */}
                <div className="flex items-center gap-4 mt-2 text-sm text-warm-500">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {hook.envoyes} envoyé{hook.envoyes > 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {hook.repondus} réponse{hook.repondus > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Taux de réponse */}
              <div className="flex-shrink-0 text-right">
                <p className={`text-2xl font-bold ${
                  hook.taux_reponse >= 30 ? 'text-green-600' :
                  hook.taux_reponse >= 15 ? 'text-amber-600' :
                  'text-warm-500'
                }`}>
                  {hook.taux_reponse}%
                </p>
                <p className="text-xs text-warm-400">taux réponse</p>
              </div>
            </div>

            {/* Barre de progression */}
            <div className="mt-3 h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  hook.taux_reponse >= 30 ? 'bg-green-500' :
                  hook.taux_reponse >= 15 ? 'bg-amber-500' :
                  'bg-warm-400'
                }`}
                style={{ width: `${(hook.taux_reponse / maxTaux) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {hooks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-warm-100 flex items-center gap-2 text-sm text-warm-500">
          <TrendingUp className="w-4 h-4" />
          <span>
            Taux moyen : {Math.round(hooks.reduce((sum, h) => sum + h.taux_reponse, 0) / hooks.length)}%
          </span>
        </div>
      )}
    </div>
  );
}
