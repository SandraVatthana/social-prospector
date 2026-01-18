# Guide de Publication Chrome Web Store

## Checklist avant soumission

### 1. Assets requis
- [x] Icone 16x16 (`icons/icon16.png`)
- [x] Icone 48x48 (`icons/icon48.png`)
- [x] Icone 128x128 (`icons/icon128.png`)
- [ ] Screenshot 1280x800 ou 640x400 (a creer)
- [ ] Tile promotionnel 440x280 (optionnel)

### 2. Informations requises pour Chrome Web Store

#### Nom de l'extension
```
SOS Prospection - Analyse LinkedIn avec IA
```

#### Description courte (132 caracteres max)
```
Importez des profils LinkedIn, analysez-les avec Claude AI et generez des messages personnalises pour votre prospection.
```

#### Description complete
```
SOS Prospection est votre assistant de prospection intelligente sur LinkedIn.

FONCTIONNALITES PRINCIPALES :

🔍 Analyse de profils LinkedIn avec IA
- Synthese automatique des derniers posts
- Detection du ton, des valeurs et sujets preferes
- Analyse du parcours professionnel

💬 Generation de messages personnalises
- Suggestions de commentaires pertinents
- Idees de DM avec accroches naturelles
- Messages courts et authentiques

📥 Import vers votre CRM
- Importation selective de profils
- Stockage dans votre espace personnel
- Aucune collecte automatique de donnees

🔒 Respect de votre vie privee
- Vos donnees restent sur votre compte
- API Claude utilisee uniquement pour l'analyse
- Pas de tracking ni de partage avec des tiers

COMMENT CA MARCHE :
1. Allez sur un profil LinkedIn
2. Cliquez sur "Analyser" pour obtenir des insights
3. Copiez les suggestions de messages
4. Importez optionnellement le profil dans votre CRM

Note : Necessite une cle API Claude (Anthropic) pour les analyses IA.
```

#### Categorie
```
Productivity
```

#### Langue
```
Francais
```

### 3. Permissions justifiees

| Permission | Justification |
|------------|---------------|
| `cookies` | Gestion des sessions Instagram pour le multi-compte |
| `storage` | Sauvegarde locale des comptes et preferences |
| `tabs` | Detection de la page active (LinkedIn/Instagram) |
| `activeTab` | Lecture du contenu de la page pour extraction |
| `scripting` | Injection des scripts d'analyse sur LinkedIn |
| `clipboardWrite` | Copie des messages generes dans le presse-papier |
| `*://*.instagram.com/*` | Fonctionnalite multi-compte Instagram |
| `*://*.linkedin.com/*` | Extraction et analyse de profils LinkedIn |
| `https://api.anthropic.com/*` | Appels API Claude pour l'analyse IA |

### 4. Politique de confidentialite

URL a fournir : `https://sosprospection.com/confidentialite`

Points cles a mentionner :
- Aucune collecte automatique de donnees
- Donnees envoyees a l'API Claude uniquement pour analyse
- Stockage local uniquement (sauf import explicite par l'utilisateur)
- Pas de partage avec des tiers

### 5. Etapes de soumission

1. **Creer un compte developpeur**
   - Aller sur https://chrome.google.com/webstore/developer/dashboard
   - Payer les frais d'inscription (5$ unique)

2. **Preparer le ZIP**
   ```bash
   cd chrome-extension
   zip -r social-prospector-extension.zip . -x "node_modules/*" -x "*.md" -x "package*.json" -x "generate-icons.js"
   ```

3. **Uploader l'extension**
   - Cliquer sur "Ajouter un nouvel element"
   - Uploader le ZIP
   - Remplir toutes les informations ci-dessus

4. **Revue par Google**
   - Delai habituel : 1-3 jours ouvrables
   - Peut prendre plus longtemps si questions sur les permissions

### 6. Apres publication

- Mettre a jour le lien de telechargement dans l'app
- Annoncer sur les reseaux sociaux
- Surveiller les avis et retours utilisateurs
