# SOS Prospection - Multi-Account Chrome Extension

Extension Chrome pour gérer plusieurs comptes Instagram. Permet de sauvegarder les sessions (cookies) et de switcher facilement entre les comptes.

## Installation

### Mode développeur

1. Ouvrez Chrome et allez à `chrome://extensions/`
2. Activez le **Mode développeur** (en haut à droite)
3. Cliquez sur **Charger l'extension non empaquetée**
4. Sélectionnez le dossier `chrome-extension`

### Générer les icônes (optionnel)

Les icônes PNG sont nécessaires pour l'extension. Pour les générer depuis le SVG :

```bash
cd chrome-extension
npm install sharp
node generate-icons.js
```

Ou convertissez manuellement `icons/icon.svg` en PNG (16x16, 48x48, 128x128) avec un outil en ligne.

## Utilisation

1. **Connectez-vous** à Instagram dans Chrome
2. Cliquez sur l'icône de l'extension
3. Cliquez sur **+** pour sauvegarder le compte actuel
4. Donnez un nom au compte (ex: "Compte perso", "Client X")
5. Pour switcher : cliquez simplement sur un autre compte dans la liste

## Fonctionnalités

- ✅ Sauvegarde des sessions Instagram (cookies)
- ✅ Switch instantané entre comptes
- ✅ Détection automatique du compte connecté
- ✅ Interface moderne style Instagram
- ✅ Rechargement automatique de la page après switch

## Fichiers

```
chrome-extension/
├── manifest.json      # Configuration de l'extension (Manifest V3)
├── background.js      # Service worker pour gérer les cookies
├── popup.html         # Interface utilisateur
├── popup.css          # Styles
├── popup.js           # Logique du popup
└── icons/
    ├── icon.svg       # Icône source
    ├── icon16.png     # Icône 16x16
    ├── icon48.png     # Icône 48x48
    └── icon128.png    # Icône 128x128
```

## Sécurité

- Les cookies sont stockés localement dans `chrome.storage.local`
- Aucune donnée n'est envoyée à des serveurs externes
- Les cookies sauvegardés sont uniquement ceux du domaine instagram.com

## Permissions requises

- `cookies` : Pour lire/écrire les cookies Instagram
- `storage` : Pour sauvegarder les sessions localement
- `tabs` : Pour recharger les onglets Instagram après un switch
- `activeTab` : Pour interagir avec l'onglet actif
- `*://*.instagram.com/*` : Accès aux cookies Instagram uniquement
