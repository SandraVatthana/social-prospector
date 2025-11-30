# Sprint 7 — Analytics
## Instructions d'intégration

### 1. Backend

**Copier les fichiers :**
- `backend/src/services/analytics.js` → Service de calcul des stats
- `backend/src/routes/analytics.js` → Routes API (remplace le placeholder)

**Dans `backend/src/index.js`, vérifier que la route est bien importée :**
```javascript
import analyticsRoutes from './routes/analytics.js';
// ...
app.use('/api/analytics', analyticsRoutes);
```

### 2. Frontend

**Copier les fichiers :**
- `frontend/src/components/analytics/` → Tout le dossier (5 composants + index)
- `frontend/src/pages/Analytics.jsx` → Remplace le placeholder existant

**Ajouter les méthodes dans `frontend/src/lib/api.js` :**
```javascript
// ANALYTICS
async getAnalytics() {
  return this.request('/analytics');
}

async getAnalyticsEvolution(periode = '30d') {
  return this.request(`/analytics/evolution?periode=${periode}`);
}

async getAnalyticsHooks(limit = 10) {
  return this.request(`/analytics/hooks?limit=${limit}`);
}

async getAnalyticsSearches() {
  return this.request('/analytics/searches');
}

async getAnalyticsPlatforms() {
  return this.request('/analytics/platforms');
}
```

**Installer Recharts (si pas déjà fait) :**
```bash
cd frontend
npm install recharts
```

### 3. Base de données

Vérifier que la table `analytics_daily` existe dans Supabase :
```sql
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prospects_analyses INTEGER DEFAULT 0,
  messages_generes INTEGER DEFAULT 0,
  messages_envoyes INTEGER DEFAULT 0,
  reponses_recues INTEGER DEFAULT 0,
  taux_reponse INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON analytics_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON analytics_daily FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 4. Fonctionnalités incluses

✅ **KPIs principaux**
- Prospects analysés (avec score moyen)
- Messages générés
- Messages envoyés
- Taux de réponse

✅ **Graphique d'évolution**
- Périodes : 7j, 30j, 90j
- Métriques switchables : prospects, messages, envoyés, réponses
- Aire sous courbe avec gradient

✅ **Funnel de conversion**
- Visualisation en entonnoir
- Taux de conversion entre chaque étape
- Largeur proportionnelle au volume

✅ **Top Hooks**
- Classement des accroches par taux de réponse
- Badge podium (🥇🥈🥉)
- Nombre d'envois et de réponses par hook

✅ **Comparaison plateformes**
- Instagram vs TikTok
- Badge "Meilleur taux"
- Stats détaillées par plateforme

✅ **Export CSV**
- Téléchargement des métriques principales

---

## Structure des fichiers

```
backend/src/
├── services/
│   └── analytics.js          # Service de calcul
└── routes/
    └── analytics.js          # Routes API

frontend/src/
├── components/analytics/
│   ├── index.js              # Export centralisé
│   ├── StatCard.jsx          # Carte KPI
│   ├── EvolutionChart.jsx    # Graphique Recharts
│   ├── TopHooks.jsx          # Liste des meilleurs hooks
│   ├── ConversionFunnel.jsx  # Entonnoir visuel
│   └── PlatformComparison.jsx # Comparaison IG/TikTok
├── pages/
│   └── Analytics.jsx         # Page complète
└── lib/
    └── api.js                # + méthodes analytics
```

---

## Prochaine étape : Sprint 8 — Billing (Lemon Squeezy)
