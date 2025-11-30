import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUser(session.user);
        api.setToken(session.access_token);
        checkOnboarding();
      }
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setUser(session.user);
        api.setToken(session.access_token);
      } else {
        setUser(null);
        api.setToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setOnboardingCompleted(data.onboarding_completed);
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
    }
  };

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    if (data.session) {
      api.setToken(data.session.access_token);
    }
    return data;
  };

  // Connexion avec Google OAuth
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      }
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    api.setToken(null);
    setUser(null);
    setSession(null);
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
    session,
    loading,
    onboardingCompleted,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
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
