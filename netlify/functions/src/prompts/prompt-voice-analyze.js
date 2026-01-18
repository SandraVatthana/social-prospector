/**
 * Prompt pour analyser le style d'écriture d'un utilisateur
 * à partir de plusieurs textes qu'il a écrits
 */

export const VOICE_ANALYZE_SYSTEM = `Tu es un expert en analyse linguistique et stylistique.
Ta mission : analyser des textes écrits par une personne pour identifier son style d'écriture unique et créer un profil stylistique détaillé.

Tu dois être précis et factuel dans ton analyse, en te basant uniquement sur ce qui est observable dans les textes fournis.`;

export const VOICE_ANALYZE_USER = (texts) => `
Analyse les ${texts.length} textes suivants, tous écrits par la même personne :

${texts.map((text, i) => `
--- TEXTE ${i + 1} ---
${text}
---
`).join('\n')}

Analyse ces textes et génère un profil stylistique détaillé au format JSON avec cette structure exacte :

{
  "nom": "MA VOIX",
  "description": "Description courte du style en 1-2 phrases",

  "ton_dominant": "Le ton principal (un seul parmi: decontracte, pro, direct, inspirant, chaleureux, expert)",
  "tons_secondaires": ["1-2 autres tons observés"],
  "niveau_energie": 7,  // De 1 (très calme) à 10 (très énergique), basé sur la ponctuation et le dynamisme

  "tutoiement": "toujours|parfois|jamais",  // Basé sur l'utilisation de tu/vous
  "longueur_messages": "court|moyen|long",  // Basé sur la longueur moyenne des phrases

  "utilisation_emojis": {
    "frequence": "jamais|rarement|parfois|souvent",  // Basé sur la présence d'emojis
    "favoris": ["Liste des emojis les plus utilisés, max 6"],
    "position": "debut|milieu|fin|partout"  // Où sont placés les emojis
  },

  "expressions_cles": ["Liste de 3-8 expressions ou tournures de phrases caractéristiques"],
  "mots_signature": ["Liste de 3-6 mots que cette personne utilise souvent"],

  "structure_messages": {
    "accroche_type": "question|compliment|observation|direct",  // Comment commence généralement les messages
    "corps_type": "narratif|direct|conversationnel",
    "cta_type": "question_ouverte|proposition_directe|suggestion_douce|aucun"
  },

  "a_eviter": ["Liste de 2-4 choses que cette personne n'écrirait JAMAIS basé sur l'analyse"],

  "traits_detectes": {
    "ponctuation_expressive": true|false,  // Utilise beaucoup de ! ou ?
    "questions_frequentes": true|false,  // Pose souvent des questions
    "style_informel": true|false,  // Langage familier vs formel
    "utilise_emojis": true|false,
    "phrases_courtes": true|false,  // Tendance aux phrases courtes
    "interpellation_directe": true|false  // S'adresse directement au lecteur
  },

  "confiance_analyse": {
    "ton": "haute|moyenne|basse",
    "vocabulaire": "haute|moyenne|basse",
    "structure": "haute|moyenne|basse"
  }
}

Instructions importantes :
- Base ton analyse UNIQUEMENT sur ce qui est observable dans les textes
- Si un élément n'est pas clairement identifiable, indique une confiance "basse"
- Les expressions_cles doivent être des phrases ou tournures EXACTES trouvées dans les textes
- Les mots_signature doivent être des mots qui reviennent dans plusieurs textes
- Adapte le niveau d'énergie en fonction des points d'exclamation, questions, et dynamisme général
- Pour le tutoiement, cherche les pronoms "tu/ton/ta/tes/toi" vs "vous/votre/vos"

Réponds UNIQUEMENT avec le JSON, sans commentaires ni explications.`;

/**
 * Calcule le score de fidélité basé sur l'analyse
 */
export function calculateFidelityScore(profile, textsCount) {
  let score = 0;
  const maxScore = 100;

  // Base : 65 points
  score += 65;

  // Bonus par texte analysé (3% par texte, max 15%)
  const textBonus = Math.min(15, textsCount * 3);
  score += textBonus;

  // Bonus confiance analyse (max 10 points)
  const confidenceBonus =
    (profile.confiance_analyse?.ton === 'haute' ? 3 : profile.confiance_analyse?.ton === 'moyenne' ? 2 : 0) +
    (profile.confiance_analyse?.vocabulaire === 'haute' ? 4 : profile.confiance_analyse?.vocabulaire === 'moyenne' ? 2 : 0) +
    (profile.confiance_analyse?.structure === 'haute' ? 3 : profile.confiance_analyse?.structure === 'moyenne' ? 2 : 0);
  score += confidenceBonus;

  // Bonus éléments détectés (max 10 points)
  let elementsBonus = 0;
  if (profile.expressions_cles?.length >= 3) elementsBonus += 3;
  if (profile.mots_signature?.length >= 3) elementsBonus += 3;
  if (profile.utilisation_emojis?.favoris?.length > 0) elementsBonus += 2;
  if (profile.tons_secondaires?.length > 0) elementsBonus += 2;
  score += Math.min(10, elementsBonus);

  return Math.min(maxScore, Math.max(60, Math.round(score)));
}

export function generateVoiceAnalyzePrompt(texts) {
  return {
    system: VOICE_ANALYZE_SYSTEM,
    user: VOICE_ANALYZE_USER(texts),
  };
}

export default {
  VOICE_ANALYZE_SYSTEM,
  VOICE_ANALYZE_USER,
  generateVoiceAnalyzePrompt,
  calculateFidelityScore,
};
