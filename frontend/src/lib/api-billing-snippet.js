// ============================================
// SNIPPET À AJOUTER DANS frontend/src/lib/api.js
// Dans la classe API, ajouter ces méthodes :
// ============================================

  // =====================
  // BILLING
  // =====================

  /**
   * Liste des plans disponibles
   */
  async getBillingPlans() {
    return this.request('/billing/plans');
  }

  /**
   * Statut d'abonnement de l'utilisateur
   */
  async getBillingStatus() {
    return this.request('/billing/status');
  }

  /**
   * Usage actuel vs limites du plan
   */
  async getBillingUsage() {
    return this.request('/billing/usage');
  }

  /**
   * Créer une session checkout Lemon Squeezy
   * @param {string} planId - ID du plan ('solo', 'agence', 'agency_plus')
   */
  async createCheckout(planId) {
    return this.request('/billing/checkout', {
      method: 'POST',
      body: { plan_id: planId },
    });
  }

  /**
   * Obtenir l'URL du portail client
   */
  async getCustomerPortal() {
    return this.request('/billing/portal', {
      method: 'POST',
    });
  }

  /**
   * Annuler l'abonnement
   */
  async cancelSubscription() {
    return this.request('/billing/cancel', {
      method: 'POST',
    });
  }

  /**
   * Réactiver un abonnement annulé
   */
  async resumeSubscription() {
    return this.request('/billing/resume', {
      method: 'POST',
    });
  }

// ============================================
