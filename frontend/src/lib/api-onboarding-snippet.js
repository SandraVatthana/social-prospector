// ============================================
// SNIPPET À AJOUTER DANS frontend/src/lib/api.js
// Dans la classe API, ajouter ces méthodes :
// ============================================

  // =====================
  // ONBOARDING PROFOND
  // =====================

  /**
   * Génère un profil MA VOIX à partir des données d'onboarding
   * @param {Object} onboardingData - Données collectées pendant l'onboarding
   */
  async generateVoiceProfileFromOnboarding(onboardingData) {
    return this.request('/onboarding/generate-voice', {
      method: 'POST',
      body: onboardingData,
    });
  }

  /**
   * Complète l'onboarding et sauvegarde le profil
   * @param {Object} onboardingData - Données d'onboarding
   * @param {Object} voiceProfile - Profil MA VOIX généré
   */
  async completeOnboarding(onboardingData, voiceProfile) {
    return this.request('/onboarding/complete', {
      method: 'POST',
      body: {
        onboarding_data: onboardingData,
        voice_profile: voiceProfile,
      },
    });
  }

  /**
   * Vérifie le statut d'onboarding de l'utilisateur
   */
  async getOnboardingStatus() {
    return this.request('/onboarding/status');
  }

// ============================================
