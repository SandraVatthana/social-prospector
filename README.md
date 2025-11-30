# Social Prospector 🚀

**La prospection qui parle avec ta vraie voix**

SaaS de prospection intelligente Instagram/TikTok avec génération de messages personnalisés via Claude AI.

---

## 🎯 Concept

Social Prospector permet aux entrepreneurs, freelances et agences de :
1. **Trouver** des prospects qualifiés sur Instagram et TikTok (via hashtags, lieux, profils similaires)
2. **Analyser** automatiquement leurs profils avec l'IA
3. **Générer** des messages d'approche ultra-personnalisés qui sonnent comme TOI (pas comme un robot)

La fonctionnalité clé : **MA VOIX** — un profil stylistique qui capture ton ton, tes expressions, tes emojis préférés pour que chaque message généré soit authentique.

---

## 🏗️ Architecture

```
social-prospector/
├── frontend/                 # React + Tailwind
│   └── src/
│       ├── components/
│       │   ├── analytics/    # Graphiques, stats
│       │   ├── billing/      # Plans, usage, paiement
│       │   ├── onboarding/   # Flow d'onboarding profond
│       │   └── ui/           # Composants réutilisables
│       ├── hooks/            # Custom hooks React
│       ├── lib/              # API client, utils
│       ├── pages/            # Pages principales
│       └── styles/           # CSS custom
├── backend/                  # Node.js + Express
│   └── src/
│       ├── prompts/          # Prompts Claude AI
│       ├── routes/           # Endpoints API
│       └── services/         # Logique métier (Apify, Claude, Lemon Squeezy)
├── prototype-dashboard.html  # Maquette HTML interactive du dashboard
├── prototype-onboarding.html # Maquette HTML interactive de l'onboarding
└── docs/                     # Documentation technique
```

---

## 🛠️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Tailwind CSS |
| Backend | Node.js + Express |
| Auth & DB | Supabase (PostgreSQL) |
| Scraping | Apify (Instagram/TikTok) |
| IA | Claude API (Anthropic) |
| Paiements | Lemon Squeezy |

---

## 📦 Sprints livrés

### Sprint 1 — Fondations ✅
- Auth Supabase (login, register, forgot password)
- Layout avec sidebar navigation
- Schéma DB (users, voice_profiles, social_accounts)

### Sprint 2 — MA VOIX ✅
- Création/édition de profils stylistiques
- Paramètres : ton, énergie, tutoiement, emojis, expressions
- Profil par défaut

### Sprint 3 — Scraping ✅
- Intégration Apify pour Instagram et TikTok
- Recherche par hashtag, lieu, profil similaire
- Extraction : bio, followers, posts récents

### Sprint 4 — Analyse IA ✅
- Analyse de profil via Claude
- Score de pertinence (0-100)
- Tags automatiques, centres d'intérêt

### Sprint 5 — Génération ✅
- Génération d'icebreakers personnalisés
- Application du profil MA VOIX
- Hooks contextuels basés sur les posts récents

### Sprint 6 — CRM ✅
- Statuts prospects (nouveau, contacté, répondu, converti, archivé)
- Notes et historique
- Filtres et recherche

### Sprint 7 — Analytics ✅
- KPIs : prospects, messages, taux de réponse
- Graphiques d'évolution (Recharts)
- Funnel de conversion
- Top hooks performants
- Import manuel de prospects

### Sprint 8 — Billing ✅
- Intégration Lemon Squeezy
- Plans : Free, Solo (29€), Agency (79€)
- Webhooks pour activation/annulation
- Limites par plan

### Sprint 9 — Polish ✅
- Composants UI (Toast, Modal, EmptyState, Skeleton, Tooltip)
- Page Settings (profil, notifications, export RGPD, suppression compte)
- Onboarding profond (6 étapes conversationnelles)
- Génération automatique du profil MA VOIX depuis l'onboarding

---

## 🎨 Onboarding Profond

L'onboarding capture l'essence de l'utilisateur en 6 étapes :

1. **Identité** — Prénom, activité, type (coach, freelance, etc.), ancienneté
2. **Cible** — Client idéal, genre, problèmes courants
3. **Transformation** — Résultat promis, preuves, différenciation, super-pouvoirs
4. **Style** — Tutoiement, tons, emojis, expressions favorites
5. **Objectifs** — But de la prospection, premier contact, lead magnet
6. **Génération** — L'IA crée le profil MA VOIX automatiquement

---

## 🚀 Installation pour Claude Code

### 1. Donne ce ZIP à Claude Code avec ce prompt :

```
Voici le projet Social Prospector, un SaaS de prospection Instagram/TikTok.

Stack : React + Tailwind (frontend), Node.js + Express (backend), Supabase, Apify, Claude API, Lemon Squeezy.

Actions à faire :
1. Crée la structure du projet avec les dossiers frontend/ et backend/
2. Place tous les fichiers aux bons emplacements
3. Dans backend/src/index.js, enregistre toutes les routes :
   - app.use('/api/auth', authRoutes)
   - app.use('/api/voice', voiceRoutes)
   - app.use('/api/scrape', scrapeRoutes)
   - app.use('/api/prospects', prospectsRoutes)
   - app.use('/api/messages', messagesRoutes)
   - app.use('/api/analytics', analyticsRoutes)
   - app.use('/api/billing', billingRoutes)
   - app.use('/api/user', userRoutes)
   - app.use('/api/onboarding', onboardingRoutes)
4. Dans frontend/src/App.jsx, intègre le check d'onboarding au démarrage
5. Crée les fichiers package.json et configure les scripts
6. Crée le fichier .env.example avec les variables nécessaires
```

### 2. Variables d'environnement requises

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Apify
APIFY_API_TOKEN=xxx

# Anthropic (Claude)
ANTHROPIC_API_KEY=xxx

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=xxx
LEMONSQUEEZY_STORE_ID=xxx
LEMONSQUEEZY_WEBHOOK_SECRET=xxx

# App
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

### 3. Schéma Supabase

Les tables à créer :
- `users` (id, email, full_name, plan, onboarding_completed, onboarding_data, monthly_goal_responses, monthly_goal_meetings)
- `voice_profiles` (id, user_id, name, settings, is_default)
- `social_accounts` (id, user_id, platform, username)
- `searches` (id, user_id, platform, query_type, query, filters, results_count)
- `prospects` (id, user_id, search_id, platform, username, data, analysis, score, status)
- `messages` (id, user_id, prospect_id, voice_profile_id, content, status)
- `analytics_daily` (id, user_id, date, metrics)
- `subscriptions` (id, user_id, lemon_squeezy_id, plan, status, current_period_end)

---

## 📁 Fichiers clés

### Frontend

| Fichier | Description |
|---------|-------------|
| `components/onboarding/OnboardingProfond.jsx` | Flow d'onboarding en 6 étapes |
| `components/ui/Toast.jsx` | Système de notifications |
| `components/ui/Modal.jsx` | Modal réutilisable |
| `components/billing/SubscriptionManager.jsx` | Gestion abonnement |
| `pages/Dashboard.jsx` | Page principale |
| `pages/Settings.jsx` | Paramètres utilisateur |

### Backend

| Fichier | Description |
|---------|-------------|
| `routes/onboarding.js` | Endpoints onboarding + génération MA VOIX |
| `routes/user.js` | Profil, export RGPD, suppression compte |
| `routes/billing.js` | Webhooks Lemon Squeezy |
| `prompts/prompt-onboarding-voice.js` | Prompt Claude pour générer MA VOIX |
| `services/apify.js` | Scraping Instagram/TikTok |
| `services/claude.js` | Appels Claude API |

---

## 🎨 Design System

### Couleurs

```javascript
brand: {
  500: '#f15a24', // Orange principal
  600: '#e24019', // Hover
}
accent: {
  500: '#df5f54', // Corail
}
warm: {
  50: '#faf9f7',  // Background clair
  500: '#a99d8a', // Texte secondaire
  900: '#564e44', // Texte principal
}
```

### Composants

- Boutons : `rounded-xl`, `shadow-lg shadow-brand-500/25`
- Cards : `rounded-2xl`, `border border-warm-200`
- Inputs : `rounded-xl`, `border-2 border-warm-200 focus:border-brand-500`

---

## 📄 Prototypes HTML

Deux fichiers HTML interactifs pour prévisualiser le design :

1. **prototype-dashboard.html** — Dashboard complet avec navigation
2. **prototype-onboarding.html** — Flow d'onboarding en 5 étapes

Ouvre-les dans un navigateur pour voir le rendu final.

---

## 📝 Licence

Projet privé — Sandra DEVONSSAY / My Inner Quest

---

## 🤝 Contact

Sandra DEVONSSAY  
My Inner Quest  
Linxe, France
