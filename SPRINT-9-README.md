# Sprint 9 — Polish ✨

## Vue d'ensemble

Ce sprint final ajoute les finitions pour une expérience utilisateur professionnelle :
- Système de notifications toast
- Empty states cohérents
- Loading skeletons
- Onboarding pour nouveaux utilisateurs
- Page Settings complète
- Composants UI réutilisables
- Styles et animations custom

---

## 1. Composants UI

### Toast Notifications

Système de notifications non-bloquantes.

```jsx
// Dans App.jsx, envelopper avec le provider
import { ToastProvider } from './components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      {/* ... */}
    </ToastProvider>
  );
}

// Utilisation dans n'importe quel composant
import { useToast } from './components/ui/Toast';

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Succès !', 'Votre action a été effectuée');
  };

  const handleError = () => {
    toast.error('Erreur', 'Quelque chose s\'est mal passé');
  };

  // Types disponibles : success, error, warning, info
}
```

### Empty States

Composants pour les états vides avec presets.

```jsx
import EmptyState from './components/ui/EmptyState';

// Avec preset
<EmptyState preset="prospects" />

// Custom
<EmptyState
  icon={Search}
  title="Aucun résultat"
  description="Essayez avec d'autres mots-clés"
  actionLabel="Nouvelle recherche"
  onAction={() => navigate('/search')}
/>

// Presets disponibles :
// prospects, messages, searches, voice, analytics, results, inbox
```

### Skeletons

Loading states pour chaque type de contenu.

```jsx
import { 
  ProspectCardSkeleton,
  MessageCardSkeleton,
  StatCardSkeleton,
  DashboardSkeleton,
  ListSkeleton,
} from './components/ui/Skeleton';

// Dans un composant
{loading ? (
  <ListSkeleton count={5} />
) : (
  <ActualContent />
)}
```

### Modal

Modal réutilisable avec animations.

```jsx
import Modal from './components/ui/Modal';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirmation"
  description="Êtes-vous sûr ?"
  footer={
    <Modal.Footer
      onCancel={() => setShowModal(false)}
      onConfirm={handleConfirm}
      confirmLabel="Confirmer"
      confirmVariant="danger"
    />
  }
>
  <p>Contenu du modal</p>
</Modal>
```

### Tooltip

Tooltips légers.

```jsx
import Tooltip from './components/ui/Tooltip';

<Tooltip content="Plus d'infos" position="top">
  <button>Hover me</button>
</Tooltip>
```

---

## 2. Onboarding

Flow multi-étapes pour les nouveaux utilisateurs.

### Intégration

```jsx
// Dans App.jsx ou le composant racine authentifié
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';

function AuthenticatedApp() {
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={(data) => {
          completeOnboarding(data);
          navigate('/voice'); // Rediriger vers MA VOIX
        }}
        onSkip={skipOnboarding}
      />
    );
  }

  return <MainApp />;
}
```

### Étapes de l'onboarding

1. **Welcome** — Présentation du flow (MA VOIX → Recherche → Contact)
2. **Objectif** — Clients / Partenaires / Influenceurs
3. **Plateforme** — Instagram / TikTok / Les deux
4. **Niche** — Audience cible
5. **Ready** — Récapitulatif et CTA

---

## 3. Page Settings

Page complète de paramètres utilisateur.

### Sections

- **Profil** — Nom, email (lecture seule)
- **Notifications** — Email, rapport hebdomadaire
- **Apparence** — Thème clair/sombre (à venir)
- **Données** — Export RGPD, suppression de compte
- **Déconnexion**

### Routes backend

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/user/profile | Récupère le profil |
| PATCH | /api/user/profile | Met à jour le profil |
| GET | /api/user/export | Export RGPD complet |
| DELETE | /api/user/account | Supprime le compte |
| POST | /api/user/onboarding | Sauvegarde l'onboarding |

---

## 4. Installation

### Fichiers backend

```
backend/src/routes/user.js  →  Routes utilisateur
```

Dans `index.js` :
```javascript
import userRoutes from './routes/user.js';
app.use('/api/user', userRoutes);
```

### Fichiers frontend

```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── index.js
│   │   ├── Toast.jsx
│   │   ├── EmptyState.jsx
│   │   ├── Skeleton.jsx
│   │   ├── Modal.jsx
│   │   └── Tooltip.jsx
│   └── onboarding/
│       └── OnboardingFlow.jsx
├── hooks/
│   └── useOnboarding.js
├── pages/
│   └── Settings.jsx
├── styles/
│   └── custom.css
└── lib/
    └── api-user-snippet.js  →  Méthodes API
```

### Styles

Ajouter les animations dans votre CSS :

```css
/* Dans index.css ou App.css */
@import './styles/custom.css';
```

Ou copier le contenu de `custom.css` dans votre fichier principal.

### Base de données

Colonnes à ajouter à la table `users` :

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
```

---

## 5. Checklist finale

### Backend
- [ ] Routes `/api/user/*` ajoutées
- [ ] Colonnes `onboarding_*` en base

### Frontend
- [ ] `ToastProvider` wrappé dans App
- [ ] Composants UI copiés
- [ ] OnboardingFlow intégré
- [ ] Page Settings dans le router
- [ ] Méthodes API ajoutées
- [ ] Styles custom importés

### UX
- [ ] Empty states sur toutes les listes
- [ ] Loading skeletons partout
- [ ] Toasts pour feedback actions
- [ ] Onboarding pour nouveaux users

---

## 6. Structure finale du projet

```
social-prospector/
├── backend/
│   └── src/
│       ├── routes/
│       │   ├── auth.js
│       │   ├── voice.js
│       │   ├── search.js
│       │   ├── prospects.js
│       │   ├── messages.js
│       │   ├── analytics.js
│       │   ├── billing.js
│       │   └── user.js         ← Sprint 9
│       ├── services/
│       │   ├── claude.js
│       │   ├── scraper.js
│       │   ├── analyzer.js
│       │   ├── analytics.js
│       │   └── lemonSqueezy.js
│       ├── middleware/
│       ├── prompts/
│       └── utils/
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── layout/
│       │   ├── dashboard/
│       │   ├── voice/
│       │   ├── search/
│       │   ├── prospects/
│       │   ├── messages/
│       │   ├── analytics/
│       │   ├── billing/
│       │   ├── onboarding/     ← Sprint 9
│       │   └── ui/             ← Sprint 9
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Voice.jsx
│       │   ├── Search.jsx
│       │   ├── Prospects.jsx
│       │   ├── Messages.jsx
│       │   ├── Analytics.jsx
│       │   ├── Billing.jsx
│       │   └── Settings.jsx    ← Sprint 9
│       ├── hooks/
│       │   ├── useAuth.js
│       │   ├── useVoice.js
│       │   └── useOnboarding.js ← Sprint 9
│       ├── lib/
│       │   └── api.js
│       └── styles/
│           └── custom.css      ← Sprint 9
│
└── docs/
```

---

## 🎉 Projet terminé !

Social Prospector est maintenant complet avec :

✅ **Sprint 1** — Fondations (Auth, DB, Layout)
✅ **Sprint 2** — MA VOIX (Profils stylistiques)
✅ **Sprint 3** — Scraping (Apify, Instagram/TikTok)
✅ **Sprint 4** — Analyse (Claude AI, scoring)
✅ **Sprint 5** — Génération (Icebreakers personnalisés)
✅ **Sprint 6** — CRM (Statuts, suivi)
✅ **Sprint 7** — Analytics (Stats, graphiques)
✅ **Sprint 8** — Billing (Lemon Squeezy)
✅ **Sprint 9** — Polish (UX, onboarding, settings)

---

Développé avec ❤️ par Sandra DEVONSSAY — My Inner Quest
