// ============================================
// SNIPPET À AJOUTER DANS frontend/src/lib/api.js
// Dans la classe API, ajouter ces méthodes :
// ============================================

  // =====================
  // USER / SETTINGS
  // =====================

  /**
   * Récupère le profil utilisateur
   */
  async getProfile() {
    return this.request('/user/profile');
  }

  /**
   * Met à jour le profil
   */
  async updateProfile(data) {
    return this.request('/user/profile', {
      method: 'PATCH',
      body: data,
    });
  }

  /**
   * Exporte toutes les données utilisateur (RGPD)
   */
  async exportUserData() {
    return this.request('/user/export');
  }

  /**
   * Supprime le compte
   */
  async deleteAccount() {
    return this.request('/user/account', {
      method: 'DELETE',
    });
  }

  /**
   * Sauvegarde les données d'onboarding
   */
  async saveOnboarding(data, skipped = false) {
    return this.request('/user/onboarding', {
      method: 'POST',
      body: { data, skipped },
    });
  }

// ============================================
