# Onboarding Profond — Social Prospector

## Vue d'ensemble

Un onboarding conversationnel en 5 étapes qui capture l'essence de l'utilisateur pour générer des messages de prospection 100% authentiques.

**Inspiré de SOS Storytelling** : mix de questions directes + champs texte libres + suggestions cliquables.

---

## Flow utilisateur

### Étape 1 — Identité 👋
- Prénom / Nom de marque
- "En une phrase, tu fais quoi ?"
- Type d'activité (Coach, Freelance, E-commerce, etc.)
- Ancienneté (< 1 an → 10+ ans)

### Étape 2 — Client idéal 🎯
- Description du client idéal (texte libre)
- Genre cible (Femmes, Hommes, Tous, Entreprises)
- Problèmes courants (sélection multiple avec chips)

### Étape 3 — Transformation ✨
- Résultat promis (après avoir travaillé avec toi...)
- Preuve sociale (témoignage, chiffre concret)
- Différenciation (ce qui te rend unique)
- Super-pouvoirs (Clarté, Rapidité, Écoute, etc.)

### Étape 4 — Style de communication 🎤
- Slider tutoiement (Toujours → Ça dépend → Jamais)
- Tons (Décontracté, Pro, Direct, Inspirant, etc.)
- Slider utilisation emojis (Jamais → Parfois → Souvent)
- Emojis favoris (grille cliquable)
- Expressions favorites (texte libre)

### Étape 5 — Objectifs de prospection 🎯
- Pourquoi tu prospectes (Clients, Collabs, Influenceurs, Réseau)
- Premier contact type (Appel, Ressource gratuite, Échanger, Audit)
- Lead magnet (texte libre + suggestions)

### Étape 6 — Génération 🚀
- Animation de chargement
- Récap du profil
- Profil MA VOIX généré par l'IA
- CTAs : "Trouver mes premiers prospects" / "Voir le dashboard"

---

## Installation

### Backend

**1. Copier les fichiers :**
```
backend/src/
├── prompts/
│   └── prompt-onboarding-voice.js   # Prompt pour générer MA VOIX
└── routes/
    └── onboarding.js                # Routes API
```

**2. Enregistrer la route dans `index.js` :**
```javascript
import onboardingRoutes from './routes/onboarding.js';
app.use('/api/onboarding', onboardingRoutes);
```

**3. S'assurer que les colonnes existent en base :**
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
```

### Frontend

**1. Copier le composant :**
```
frontend/src/components/onboarding/OnboardingProfond.jsx
```

**2. Ajouter les méthodes API :**
Copier le contenu de `api-onboarding-snippet.js` dans `lib/api.js`.

**3. Intégrer dans l'app :**
```jsx
// Dans App.jsx ou le composant racine authentifié
import OnboardingProfond from './components/onboarding/OnboardingProfond';

function AuthenticatedApp() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    // Vérifier si l'onboarding est complété
    api.getOnboardingStatus()
      .then(res => {
        if (!res.data.completed) {
          setShowOnboarding(true);
        }
      })
      .finally(() => setCheckingStatus(false));
  }, []);

  if (checkingStatus) {
    return <LoadingScreen />;
  }

  if (showOnboarding) {
    return (
      <OnboardingProfond
        onComplete={(data, voiceProfile, redirectTo) => {
          setShowOnboarding(false);
          navigate(`/${redirectTo}`);
        }}
        onSkip={() => {
          setShowOnboarding(false);
          navigate('/dashboard');
        }}
      />
    );
  }

  return <MainApp />;
}
```

---

## Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/onboarding/generate-voice | Génère un profil MA VOIX depuis les données |
| POST | /api/onboarding/complete | Sauvegarde l'onboarding + crée le profil |
| GET | /api/onboarding/status | Vérifie si l'onboarding est complété |

---

## Structure des données collectées

```javascript
{
  // Étape 1 — Identité
  prenom: "Sandra",
  activite: "J'aide les entrepreneures à créer des expériences digitales",
  type_activite: "coach", // coach, freelance, ecommerce, formateur, creatif, agence
  anciennete: "plus_10_ans",
  
  // Étape 2 — Client idéal
  cible_description: "Femmes entrepreneures perdues avec la tech",
  cible_genre: "femmes", // femmes, hommes, tous, entreprises
  cible_problemes: ["overwhelm", "temps", "technique"],
  
  // Étape 3 — Transformation
  resultat_promis: "Système automatisé, 10h/semaine gagnées",
  preuve_sociale: "Marie a triplé ses inscriptions en 2 mois",
  differentiation: "Je rends la tech accessible et fun",
  super_pouvoirs: ["clarte", "rapidite", "energie"],
  
  // Étape 4 — Style
  tutoiement: "toujours", // toujours, parfois, jamais
  ton: ["decontracte", "direct"],
  utilisation_emojis: "parfois", // jamais, parfois, souvent
  emojis_favoris: ["🚀", "✨", "💪", "🔥"],
  expressions: "C'est parti !, On y va ?",
  
  // Étape 5 — Objectifs
  objectif_prospection: "clients", // clients, collabs, influenceurs, reseau
  premier_contact: "ressource", // appel, ressource, echanger, audit
  lead_magnet: "Guide 5 automations qui changent tout",
}
```

---

## Profil MA VOIX généré

L'IA génère un profil complet qui sera utilisé pour la génération de messages :

```javascript
{
  "nom": "MA VOIX — Sandra",
  "description": "Ton décontracté et direct, énergie haute, tutoiement systématique",
  
  "ton_dominant": "decontracte",
  "tons_secondaires": ["direct"],
  "niveau_energie": 8,
  
  "tutoiement": "toujours",
  "longueur_messages": "moyen",
  
  "utilisation_emojis": {
    "frequence": "parfois",
    "favoris": ["🚀", "✨", "💪", "🔥"],
    "position": "fin"
  },
  
  "expressions_cles": ["C'est parti !", "On y va ?", "Let's go"],
  "mots_signature": ["fun", "concret", "simple"],
  
  "structure_messages": {
    "accroche_type": "observation",
    "corps_type": "direct et personnalisé",
    "cta_type": "question ouverte"
  },
  
  "a_eviter": ["Jargon technique", "Ton trop formel", "Messages longs"],
  
  "contexte_business": {
    "activite": "Aide les entrepreneures à digitaliser",
    "cible": "Femmes entrepreneures perdues avec la tech",
    "proposition_valeur": "Systèmes qui font gagner 10h/semaine",
    "differentiation": "Tech accessible et fun",
    "lead_magnet": "Guide 5 automations",
    "objectif_prospection": "clients",
    "premier_contact_type": "ressource"
  },
  
  "exemples_messages": [
    "Hey ! J'ai vu ton post sur [sujet] — trop bien ce que tu fais ! 🔥 J'aide des entrepreneures comme toi à automatiser tout ça. Ça te dirait que je t'envoie mon guide sur les 5 automations qui changent tout ?",
    "Salut [prénom] ! Ton [contenu] m'a parlé 💪 Je bosse avec des [cible] sur exactement ce sujet. On se fait un café virtuel pour en parler ?"
  ]
}
```

---

## Design

- **Couleurs** : Palette Social Prospector (brand-500, accent-500, warm-*)
- **Cards** : Fond blanc, border-radius 3xl, shadow-2xl
- **Boutons suggestions** : Chips avec border-2, hover states
- **Progress** : Dots avec animation de largeur
- **Sliders** : Custom range inputs avec accent-brand-500

---

## Checklist d'intégration

- [ ] Route `/api/onboarding/*` enregistrée
- [ ] Colonnes `onboarding_*` en base
- [ ] Composant `OnboardingProfond.jsx` copié
- [ ] Méthodes API ajoutées
- [ ] Vérification du statut au login
- [ ] Redirection vers Search après completion
- [ ] Profil MA VOIX créé automatiquement

---

## Notes pour Claude Code

Le composant est **autonome** et prêt à l'emploi. Il suffit de :

1. Copier les fichiers aux bons emplacements
2. Enregistrer la route backend
3. Ajouter les méthodes API
4. Intégrer la vérification du statut d'onboarding dans l'app

Le style utilise les mêmes classes Tailwind que le reste de Social Prospector (warm-*, brand-*, accent-*).
