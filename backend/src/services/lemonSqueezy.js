import crypto from 'crypto';

/**
 * Service Lemon Squeezy
 * Gestion des abonnements et webhooks
 * 
 * Documentation: https://docs.lemonsqueezy.com/api
 */

const LEMON_API_URL = 'https://api.lemonsqueezy.com/v1';
const LEMON_API_KEY = process.env.LEMON_SQUEEZY_API_KEY;
const LEMON_STORE_ID = process.env.LEMON_SQUEEZY_STORE_ID;
const LEMON_WEBHOOK_SECRET = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

/**
 * Configuration des plans
 * Les variant_id correspondent à vos produits Lemon Squeezy
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    variant_id: null, // Pas de variant pour le plan gratuit
    limits: {
      prospects_par_heure: 5,
      prospects_par_jour: 10,
      prospects_par_mois: 50,
      comptes_sociaux: 1,
      voix: 1,
      recherches_sauvegardees: 3,
    },
    features: [
      '50 prospects/mois',
      '1 profil MA VOIX',
      '1 compte social',
      'Génération de messages',
    ],
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    price: 79,
    variant_id: process.env.LEMON_VARIANT_SOLO, // À configurer
    limits: {
      prospects_par_heure: 20,
      prospects_par_jour: 50,
      prospects_par_mois: 500,
      comptes_sociaux: 1,
      voix: 3,
      recherches_sauvegardees: 20,
    },
    features: [
      '500 prospects/mois',
      '3 profils MA VOIX',
      '1 compte social',
      'Analytics complets',
      'Export CSV',
      'Support email',
    ],
  },
  agence: {
    id: 'agence',
    name: 'Agence',
    price: 149,
    variant_id: process.env.LEMON_VARIANT_AGENCE, // À configurer
    limits: {
      prospects_par_heure: 50,
      prospects_par_jour: 150,
      prospects_par_mois: 3000,
      comptes_sociaux: 3,
      voix: 10,
      recherches_sauvegardees: 100,
    },
    features: [
      '3000 prospects/mois',
      '10 profils MA VOIX',
      '3 comptes sociaux',
      'Analytics avancés',
      'Export illimité',
      'Support prioritaire',
      'Accès API',
    ],
    popular: true,
  },
  agency_plus: {
    id: 'agency_plus',
    name: 'Agency+',
    price: 299,
    variant_id: process.env.LEMON_VARIANT_AGENCY_PLUS, // À configurer
    limits: {
      prospects_par_heure: 100,
      prospects_par_jour: 500,
      prospects_par_mois: 10000,
      comptes_sociaux: 10,
      voix: -1, // Illimité
      recherches_sauvegardees: -1, // Illimité
    },
    features: [
      '10 000 prospects/mois',
      'Profils MA VOIX illimités',
      '10 comptes sociaux',
      'Analytics avancés',
      'Export illimité',
      'Support dédié',
      'Accès API complet',
      'Onboarding personnalisé',
    ],
  },
};

/**
 * Headers pour l'API Lemon Squeezy
 */
function getHeaders() {
  return {
    'Accept': 'application/vnd.api+json',
    'Content-Type': 'application/vnd.api+json',
    'Authorization': `Bearer ${LEMON_API_KEY}`,
  };
}

/**
 * Crée une URL de checkout pour un plan
 */
export async function createCheckout(variantId, userId, userEmail, userName) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/checkouts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: userEmail,
            name: userName,
            custom: {
              user_id: userId,
            },
          },
          checkout_options: {
            dark: false,
            embed: false,
            media: true,
            logo: true,
            button_color: '#6366f1', // Brand color
          },
          product_options: {
            enabled_variants: [variantId],
            redirect_url: `${process.env.FRONTEND_URL}/billing/success`,
            receipt_link_url: `${process.env.FRONTEND_URL}/billing`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: LEMON_STORE_ID,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Lemon Squeezy checkout error:', error);
    throw new Error('Failed to create checkout');
  }

  const data = await response.json();
  return data.data.attributes.url;
}

/**
 * Récupère les infos d'un abonnement
 */
export async function getSubscription(subscriptionId) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/subscriptions/${subscriptionId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Annule un abonnement
 */
export async function cancelSubscription(subscriptionId) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes: {
          cancelled: true,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to cancel subscription');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Réactive un abonnement annulé (avant fin de période)
 */
export async function resumeSubscription(subscriptionId) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes: {
          cancelled: false,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to resume subscription');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Change de plan (upgrade/downgrade)
 */
export async function updateSubscription(subscriptionId, newVariantId) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/subscriptions/${subscriptionId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        type: 'subscriptions',
        id: subscriptionId,
        attributes: {
          variant_id: newVariantId,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update subscription');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Récupère l'URL du portail client
 */
export async function getCustomerPortalUrl(customerId) {
  if (!LEMON_API_KEY) {
    throw new Error('Lemon Squeezy API key not configured');
  }

  const response = await fetch(`${LEMON_API_URL}/customers/${customerId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch customer');
  }

  const data = await response.json();
  return data.data.attributes.urls.customer_portal;
}

/**
 * Vérifie la signature d'un webhook Lemon Squeezy
 */
export function verifyWebhookSignature(payload, signature) {
  if (!LEMON_WEBHOOK_SECRET) {
    console.warn('Webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', LEMON_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Trouve le plan correspondant à un variant_id
 */
export function getPlanByVariantId(variantId) {
  return Object.values(PLANS).find(plan => plan.variant_id === variantId);
}

/**
 * Récupère les limites d'un plan
 */
export function getPlanLimits(planId) {
  return PLANS[planId]?.limits || PLANS.free.limits;
}

export default {
  PLANS,
  createCheckout,
  getSubscription,
  cancelSubscription,
  resumeSubscription,
  updateSubscription,
  getCustomerPortalUrl,
  verifyWebhookSignature,
  getPlanByVariantId,
  getPlanLimits,
};
