/**
 * Prompt pour générer un profil MA VOIX depuis les données d'onboarding
 */

export const ONBOARDING_TO_VOICE_SYSTEM = `Tu es un expert en communication et personal branding.
Ta mission : analyser les informations fournies par un utilisateur et créer un profil stylistique complet qui capture son essence unique.

Tu dois générer un profil "MA VOIX" qui permettra à une IA de générer des messages de prospection qui sonnent authentiquement comme cette personne.`;

export const ONBOARDING_TO_VOICE_USER = (data) => `
Voici les informations collectées lors de l'onboarding d'un utilisateur :

## IDENTITÉ
- Prénom/Marque : ${data.prenom}
- Activité : ${data.activite}
- Type : ${data.type_activite || 'Non précisé'}
- Expérience : ${data.anciennete || 'Non précisé'}

## CLIENT IDÉAL
- Description : ${data.cible_description}
- Genre : ${data.cible_genre || 'Non précisé'}
- Problèmes ciblés : ${data.cible_problemes?.join(', ') || 'Non précisés'}

## TRANSFORMATION APPORTÉE
- Résultat promis : ${data.resultat_promis}
- Preuve sociale : ${data.preuve_sociale || 'Non précisée'}
- Différenciation : ${data.differentiation || 'Non précisée'}
- Super-pouvoirs : ${data.super_pouvoirs?.join(', ') || 'Non précisés'}

## STYLE DE COMMUNICATION
- Tutoiement : ${data.tutoiement}
- Ton(s) : ${data.ton?.join(', ') || 'Non précisé'}
- Utilisation emojis : ${data.utilisation_emojis}
- Emojis favoris : ${data.emojis_favoris?.join(' ') || 'Aucun'}
- Expressions favorites : ${data.expressions || 'Non précisées'}

## OBJECTIFS DE PROSPECTION
- Objectif : ${data.objectif_prospection}
- Premier contact : ${data.premier_contact}
- Lead magnet : ${data.lead_magnet || 'Aucun'}

---

Génère un profil MA VOIX complet au format JSON avec cette structure exacte :

{
  "nom": "Nom du profil (ex: MA VOIX — Sandra)",
  "description": "Description courte du profil en 1-2 phrases",
  
  "ton_dominant": "Le ton principal (un seul parmi: decontracte, pro, direct, inspirant, chaleureux, expert)",
  "tons_secondaires": ["Autres tons utilisés"],
  "niveau_energie": 7,  // De 1 (calme) à 10 (très énergique)
  
  "tutoiement": "${data.tutoiement}",
  "longueur_messages": "court", // court, moyen, long
  
  "utilisation_emojis": {
    "frequence": "${data.utilisation_emojis}",
    "favoris": ${JSON.stringify(data.emojis_favoris || [])},
    "position": "fin" // debut, milieu, fin, partout
  },
  
  "expressions_cles": ["Liste d'expressions typiques de cette personne"],
  "mots_signature": ["Mots que cette personne utilise souvent"],
  
  "structure_messages": {
    "accroche_type": "Type d'accroche préférée (question, compliment, observation, direct)",
    "corps_type": "Style du corps du message",
    "cta_type": "Type de call-to-action (question ouverte, proposition directe, suggestion douce)"
  },
  
  "a_eviter": ["Ce que cette personne n'écrirait JAMAIS"],
  
  "contexte_business": {
    "activite": "${data.activite}",
    "cible": "${data.cible_description}",
    "proposition_valeur": "${data.resultat_promis}",
    "differentiation": "${data.differentiation || ''}",
    "lead_magnet": "${data.lead_magnet || ''}",
    "objectif_prospection": "${data.objectif_prospection}",
    "premier_contact_type": "${data.premier_contact}"
  },
  
  "exemples_messages": [
    "Un exemple de message type que cette personne pourrait envoyer",
    "Un autre exemple avec un angle différent"
  ]
}

Important :
- Le profil doit être cohérent avec toutes les informations fournies
- Les exemples de messages doivent sonner authentiques et naturels
- Adapte le niveau de formalité selon le tutoiement choisi
- Les expressions clés doivent refléter la personnalité décrite
- Le niveau d'énergie doit correspondre aux tons sélectionnés

Réponds UNIQUEMENT avec le JSON, sans commentaires.`;

export function generateOnboardingToVoicePrompt(data) {
  return {
    system: ONBOARDING_TO_VOICE_SYSTEM,
    user: ONBOARDING_TO_VOICE_USER(data),
  };
}

export default {
  ONBOARDING_TO_VOICE_SYSTEM,
  ONBOARDING_TO_VOICE_USER,
  generateOnboardingToVoicePrompt,
};
