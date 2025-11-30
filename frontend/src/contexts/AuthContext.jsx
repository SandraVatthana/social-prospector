import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  // Vérifier l'authentification et le statut d'onboarding au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Vérifier si un token existe
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      // Récupérer le profil utilisateur
      const profileResponse = await api.getProfile();
      if (profileResponse.data) {
        setUser(profileResponse.data);
      }

      // Vérifier le statut d'onboarding
      const onboardingResponse = await api.getOnboardingStatus();
      if (onboardingResponse.data) {
        setOnboardingCompleted(onboardingResponse.data.completed);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
      // Token invalide, le supprimer
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (token) => {
    api.setToken(token);
    await checkAuth();
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
    setOnboardingCompleted(null);
  };

  const completeOnboarding = () => {
    setOnboardingCompleted(true);
  };

  // Pour la démo sans backend, permettre de simuler l'authentification
  const loginDemo = (demoUser) => {
    setUser(demoUser);
    setOnboardingCompleted(false); // Afficher l'onboarding en démo
  };

  const skipOnboardingDemo = () => {
    setOnboardingCompleted(true);
  };

  const value = {
    user,
    loading,
    onboardingCompleted,
    login,
    logout,
    loginDemo,
    completeOnboarding,
    skipOnboardingDemo,
    isAuthenticated: !!user,
    needsOnboarding: user && onboardingCompleted === false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
