# Sprint 8 — Billing avec Lemon Squeezy 🍋

## Vue d'ensemble

Ce sprint ajoute un système complet de facturation avec :
- 4 plans tarifaires (Free, Solo, Agence, Agency+)
- Checkout sécurisé via Lemon Squeezy
- Gestion des abonnements (annulation, réactivation)
- Suivi d'usage en temps réel
- Webhooks pour synchronisation automatique

---

## 1. Configuration Lemon Squeezy

### Créer un compte et un store

1. Allez sur [lemonsqueezy.com](https://lemonsqueezy.com) et créez un compte
2. Créez un Store pour Social Prospector
3. Dans Settings > API, générez une **API Key**

### Créer les produits

Créez 3 produits avec abonnement mensuel :

| Produit | Prix | Variant ID |
|---------|------|------------|
| Solo | 79€/mois | LEMON_VARIANT_SOLO |
| Agence | 149€/mois | LEMON_VARIANT_AGENCE |
| Agency+ | 299€/mois | LEMON_VARIANT_AGENCY_PLUS |

> Note : Récupérez les **Variant ID** (pas Product ID) depuis l'URL de chaque variante.

### Configurer le webhook

1. Allez dans Settings > Webhooks
2. Créez un webhook avec l'URL : `https://votre-api.com/api/billing/webhook`
3. Sélectionnez les événements :
   - `subscription_created`
   - `subscription_updated`
   - `subscription_cancelled`
   - `subscription_expired`
   - `subscription_payment_failed`
4. Copiez le **Signing Secret**

---

## 2. Variables d'environnement

Ajoutez dans `backend/.env` :

```env
# Lemon Squeezy
LEMON_SQUEEZY_API_KEY=votre_api_key
LEMON_SQUEEZY_STORE_ID=votre_store_id
LEMON_SQUEEZY_WEBHOOK_SECRET=votre_webhook_secret

# Variant IDs (depuis Lemon Squeezy)
LEMON_VARIANT_SOLO=123456
LEMON_VARIANT_AGENCE=123457
LEMON_VARIANT_AGENCY_PLUS=123458

# Frontend URL pour redirections
FRONTEND_URL=https://app.socialprospector.io
```

---

## 3. Installation Backend

### Fichiers à copier

```
backend/src/
├── services/
│   └── lemonSqueezy.js     # Service Lemon Squeezy
├── routes/
│   └── billing.js          # Routes API (remplace le placeholder)
└── docs/
    └── billing-schema.sql  # SQL pour la table users
```

### Enregistrer la route

Dans `backend/src/index.js` :

```javascript
import billingRoutes from './routes/billing.js';
// ...
app.use('/api/billing', billingRoutes);
```

### Mettre à jour la base de données

Exécutez le SQL dans Supabase :

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lemon_customer_id VARCHAR(255);
```

---

## 4. Installation Frontend

### Fichiers à copier

```
frontend/src/
├── components/billing/
│   ├── index.js               # Export centralisé
│   ├── PricingCard.jsx        # Carte de plan
│   ├── UsageBar.jsx           # Barre d'usage
│   └── SubscriptionManager.jsx # Gestion abonnement
├── pages/
│   └── Billing.jsx            # Page complète
└── lib/
    └── api-billing-snippet.js # Méthodes API
```

### Ajouter les méthodes API

Copiez le contenu de `api-billing-snippet.js` dans votre `lib/api.js`.

### Ajouter la route

Dans votre router React :

```jsx
import Billing from './pages/Billing';

// Dans vos routes
<Route path="/billing" element={<Billing />} />
<Route path="/billing/success" element={<Billing />} />
```

### Mettre à jour la sidebar

Ajoutez un lien vers /billing dans votre navigation.

---

## 5. Flux utilisateur

### Upgrade

```
1. User clique "Passer à Solo" sur /billing
2. Frontend appelle POST /api/billing/checkout
3. Backend crée un checkout Lemon Squeezy
4. User redirigé vers Lemon Squeezy
5. User paye
6. Lemon Squeezy envoie webhook subscription_created
7. Backend met à jour user.plan = 'solo'
8. User redirigé vers /billing/success
```

### Annulation

```
1. User clique "Annuler" sur /billing
2. Frontend appelle POST /api/billing/cancel
3. Backend appelle Lemon Squeezy API
4. user.subscription_status = 'cancelled'
5. User garde accès jusqu'à subscription_ends_at
6. À expiration, webhook subscription_expired
7. Backend remet user.plan = 'free'
```

---

## 6. Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/billing/plans | Liste des plans (public) |
| GET | /api/billing/status | Statut abonnement user |
| GET | /api/billing/usage | Usage vs limites |
| POST | /api/billing/checkout | Créer checkout |
| POST | /api/billing/portal | URL portail client |
| POST | /api/billing/cancel | Annuler abonnement |
| POST | /api/billing/resume | Réactiver abonnement |
| POST | /api/billing/webhook | Webhook Lemon Squeezy |

---

## 7. Tests

### Tester le checkout

1. Utilisez les cartes de test Lemon Squeezy :
   - Succès : `4242 4242 4242 4242`
   - Échec : `4000 0000 0000 0002`

2. Vérifiez que le webhook est reçu (logs backend)

3. Vérifiez que le plan est mis à jour en base

### Tester les limites

1. Sur le plan free, essayez d'analyser > 10 prospects/jour
2. Vérifiez que l'erreur 429 est retournée
3. Upgradez et vérifiez que les limites augmentent

---

## 8. Checklist de déploiement

- [ ] Variables d'environnement configurées
- [ ] Produits créés sur Lemon Squeezy
- [ ] Webhook configuré et testé
- [ ] Colonnes SQL ajoutées
- [ ] Route /billing accessible
- [ ] Checkout fonctionne (mode test)
- [ ] Webhook reçu et traité
- [ ] Annulation fonctionne
- [ ] Portail client accessible

---

## Prochaine étape : Sprint 9 — Polish

- UX/UI refinements
- Onboarding flow
- Edge cases
- Tests E2E
- Documentation utilisateur
