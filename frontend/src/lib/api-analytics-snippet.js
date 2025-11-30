// ============================================
// SNIPPET À AJOUTER DANS frontend/src/lib/api.js
// Dans la classe API, ajouter ces méthodes :
// ============================================

  // =====================
  // ANALYTICS
  // =====================

  /**
   * Stats globales
   */
  async getAnalytics() {
    return this.request('/analytics');
  }

  /**
   * Évolution dans le temps
   * @param {string} periode - '7d' | '30d' | '90d'
   */
  async getAnalyticsEvolution(periode = '30d') {
    return this.request(`/analytics/evolution?periode=${periode}`);
  }

  /**
   * Meilleurs hooks par taux de réponse
   * @param {number} limit - Nombre de hooks à récupérer
   */
  async getAnalyticsHooks(limit = 10) {
    return this.request(`/analytics/hooks?limit=${limit}`);
  }

  /**
   * Stats par recherche
   */
  async getAnalyticsSearches() {
    return this.request('/analytics/searches');
  }

  /**
   * Stats par plateforme
   */
  async getAnalyticsPlatforms() {
    return this.request('/analytics/platforms');
  }

  /**
   * Sauvegarde snapshot quotidien (debug)
   */
  async saveAnalyticsSnapshot() {
    return this.request('/analytics/snapshot', { method: 'POST' });
  }

// ============================================
// Si ces méthodes n'existent pas déjà
// ============================================
