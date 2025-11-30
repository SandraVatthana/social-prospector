/**
 * Configuration des limites par plan
 * "Illimité" dans le marketing = limite haute généreuse (10 000)
 *
 * Note: Agency+ affiche "Illimité" côté marketing, mais est limité à 10 000/mois
 * pour éviter les abus et contrôler les coûts Apify.
 */

// Emails avec accès vraiment illimité (admin/dev)
export const UNLIMITED_EMAILS = [
  'sandra.devonssay@gmail.com',
  'contact@myinnerquest.fr',
];

// Limites par plan
export const PLAN_LIMITS = {
  free: {
    prospects_per_hour: 3,
    prospects_per_day: 10,
    prospects_per_month: 50,
    messages_per_hour: 3,
    messages_per_day: 10,
    messages_per_month: 50,
    clients: 0,           // Pas de multi-clients
    voice_profiles: 1,
  },
  solo: {
    prospects_per_hour: 5,
    prospects_per_day: 40,
    prospects_per_month: 500,
    messages_per_hour: 5,
    messages_per_day: 40,
    messages_per_month: 500,
    clients: 0,           // Pas de multi-clients
    voice_profiles: 1,
  },
  agence: {
    prospects_per_hour: 10,
    prospects_per_day: 100,
    prospects_per_month: 2000,
    messages_per_hour: 10,
    messages_per_day: 100,
    messages_per_month: 2000,
    clients: 10,
    voice_profiles: 10,
  },
  agency_plus: {
    prospects_per_hour: 20,
    prospects_per_day: 200,
    prospects_per_month: 10000,   // "Illimité" = 10k max
    messages_per_hour: 20,
    messages_per_day: 200,
    messages_per_month: 10000,   // "Illimité" = 10k max
    clients: 100,                // "Illimité" = 100 max
    voice_profiles: 100,
  },
};

// Labels d'affichage pour le frontend (marketing)
export const PLAN_DISPLAY = {
  free: {
    name: 'Free',
    prospects_label: '50/mois',
    messages_label: '50/mois',
    clients_label: '-',
    price: 0,
  },
  solo: {
    name: 'Solo',
    prospects_label: '500/mois',
    messages_label: '500/mois',
    clients_label: '-',
    price: 29,
  },
  agence: {
    name: 'Agence',
    prospects_label: '2 000/mois',
    messages_label: '2 000/mois',
    clients_label: '10 clients',
    price: 79,
  },
  agency_plus: {
    name: 'Agency+',
    prospects_label: 'Illimité*',
    messages_label: 'Illimité*',
    clients_label: 'Illimité*',
    footnote: '*Fair use : jusqu\'à 10 000/mois. Besoin de plus ? Contactez-nous.',
    price: 149,
  },
};

/**
 * Obtenir les limites pour un utilisateur
 * @param {Object} user - Utilisateur avec email et plan
 * @returns {Object} Limites applicables
 */
export function getUserLimits(user) {
  // Accès illimité pour certains emails
  if (user?.email && UNLIMITED_EMAILS.includes(user.email.toLowerCase())) {
    return {
      prospects_per_hour: Infinity,
      prospects_per_day: Infinity,
      prospects_per_month: Infinity,
      messages_per_hour: Infinity,
      messages_per_day: Infinity,
      messages_per_month: Infinity,
      clients: Infinity,
      voice_profiles: Infinity,
      is_unlimited: true,
    };
  }

  const plan = user?.plan || 'free';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  return {
    ...limits,
    is_unlimited: false,
  };
}

/**
 * Vérifier si un utilisateur a accès illimité
 * @param {Object} user - Utilisateur
 * @returns {boolean}
 */
export function isUnlimitedUser(user) {
  return user?.email && UNLIMITED_EMAILS.includes(user.email.toLowerCase());
}

export default { PLAN_LIMITS, PLAN_DISPLAY, UNLIMITED_EMAILS, getUserLimits, isUnlimitedUser };
