/**
 * API Client pour Social Prospector
 */
class API {
  constructor() {
    this.baseUrl = '/api';
    this.token = localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Une erreur est survenue');
    }

    return response.json();
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // User
  async getProfile() {
    return this.request('/user/profile');
  }

  async updateProfile(data) {
    return this.request('/user/profile', {
      method: 'PATCH',
      body: data,
    });
  }

  // Analytics
  async getAnalytics() {
    return this.request('/analytics');
  }

  async getAnalyticsEvolution(period = '30d') {
    return this.request(`/analytics/evolution?period=${period}`);
  }

  async getAnalyticsHooks() {
    return this.request('/analytics/hooks');
  }

  async getAnalyticsPlatforms() {
    return this.request('/analytics/platforms');
  }

  // Prospects
  async getProspects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/prospects${query ? `?${query}` : ''}`);
  }

  async getProspect(id) {
    return this.request(`/prospects/${id}`);
  }

  async getProspectPosts(username, platform = 'instagram', limit = 3) {
    return this.request(`/prospects/${username}/posts?platform=${platform}&limit=${limit}`);
  }

  async analyzeProspectPosts(posts, prospect) {
    return this.request('/prospects/analyze-posts', {
      method: 'POST',
      body: { posts, prospect },
    });
  }

  async generateEnhancedMessage(prospect, posts, analysis) {
    return this.request('/prospects/generate-message', {
      method: 'POST',
      body: { prospect, posts, analysis },
    });
  }

  // Messages
  async getMessages(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/messages${query ? `?${query}` : ''}`);
  }

  async generateMessage(prospectId) {
    return this.request('/messages/generate', {
      method: 'POST',
      body: { prospect_id: prospectId },
    });
  }

  // Voice
  async testVoice(prospect, voiceProfile) {
    return this.request('/voice/test', {
      method: 'POST',
      body: { prospect, voiceProfile },
    });
  }

  // Usage
  async getUsage() {
    return this.request('/billing/usage');
  }

  // Onboarding
  async getOnboardingStatus() {
    return this.request('/onboarding/status');
  }

  async generateVoiceProfileFromOnboarding(onboardingData) {
    return this.request('/onboarding/generate-voice', {
      method: 'POST',
      body: onboardingData,
    });
  }

  async completeOnboarding(onboardingData, voiceProfile) {
    return this.request('/onboarding/complete', {
      method: 'POST',
      body: {
        onboarding_data: onboardingData,
        voice_profile: voiceProfile,
      },
    });
  }

  // Voice Profiles
  async createVoiceProfile(voiceProfile) {
    return this.request('/voice/profiles', {
      method: 'POST',
      body: voiceProfile,
    });
  }

  async getVoiceProfiles() {
    return this.request('/voice/profiles');
  }

  async analyzeVoice(texts) {
    return this.request('/voice/analyze', {
      method: 'POST',
      body: { texts },
    });
  }

  async saveOnboarding(onboardingData, voiceProfile) {
    // Alias pour completeOnboarding pour compatibilité
    return this.completeOnboarding(onboardingData, voiceProfile);
  }
}

export const api = new API();
