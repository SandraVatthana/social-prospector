import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

// ID de l'extension Chrome SOS Prospection (à remplacer par l'ID réel après publication)
// En développement, utiliser l'ID temporaire ou essayer plusieurs méthodes
const EXTENSION_ID = null; // Sera défini après publication sur le Chrome Web Store

/**
 * Sync auth token with Chrome extension (if installed)
 * Utilise postMessage pour communiquer avec le content script de l'extension
 */
async function syncTokenWithExtension(token) {
  // Store token globally for extension requests
  _currentExtensionToken = token;

  try {
    console.log('[Auth] Syncing token with extension, has token:', !!token);

    // Méthode 1: Via chrome.runtime.sendMessage (si l'ID de l'extension est connu)
    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, {
        action: 'setAuthToken',
        token: token
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('[Auth] Extension not found or not responding');
        } else if (response?.success) {
          console.log('[Auth] Token synced with extension via runtime');
        }
      });
    }

    // Méthode 2: Via window.postMessage (pour le content script)
    window.postMessage({
      type: 'SOS_PROSPECTION_AUTH',
      action: token ? 'setAuthToken' : 'clearAuthToken',
      token: token
    }, window.location.origin);

  } catch (error) {
    // Silently fail - extension may not be installed
    console.log('[Auth] Could not sync with extension:', error.message);
  }
}

/**
 * Clear auth token from Chrome extension
 */
async function clearExtensionToken() {
  // Clear global token
  _currentExtensionToken = null;

  try {
    if (EXTENSION_ID && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(EXTENSION_ID, { action: 'clearAuthToken' });
    }
    window.postMessage({
      type: 'SOS_PROSPECTION_AUTH',
      action: 'clearAuthToken'
    }, window.location.origin);
  } catch (error) {
    // Silently fail
  }
}

// Global variable to store current token for extension requests
let _currentExtensionToken = null;

/**
 * Listen for extension presence and token requests
 */
if (typeof window !== 'undefined') {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'SOS_PROSPECTION_EXTENSION') {
      console.log('[Auth] Extension detected, version:', event.data.version);

      // If extension requests token and we have one, send it
      if (event.data.requestToken && _currentExtensionToken) {
        console.log('[Auth] Sending token to extension on request');
        window.postMessage({
          type: 'SOS_PROSPECTION_AUTH',
          action: 'setAuthToken',
          token: _currentExtensionToken
        }, window.location.origin);
      }
    }
  });
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);

  // MODE DEMO : Auto-login pour les tests (mettre à false pour la prod)
  const DEMO_MODE = false;

  // Détecter si l'utilisateur vient de SOS Storytelling (?from=sos)
  const [fromSOS, setFromSOS] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isFromSOS = params.get('from') === 'sos';
    if (isFromSOS) {
      // Marquer dans localStorage pour les sessions futures
      localStorage.setItem('prospection_from_sos', 'true');
      // Nettoyer l'URL
      const url = new URL(window.location.href);
      url.searchParams.delete('from');
      window.history.replaceState({}, '', url.pathname);
    }
    return isFromSOS || localStorage.getItem('prospection_from_sos') === 'true';
  });

  // Vérifier l'authentification au chargement
  useEffect(() => {
    // En mode démo, connecter automatiquement
    if (DEMO_MODE) {
      setUser({
        name: 'Sandra',
        email: 'sandra@example.com',
        plan: 'Solo',
        days_until_renewal: 23,
      });
      setOnboardingCompleted(true); // Skip l'onboarding en démo
      setLoading(false);
      return;
    }

    // Récupérer la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        setUser(session.user);
        api.setToken(session.access_token);
        // Sync token with extension
        syncTokenWithExtension(session.access_token);
        // Attendre que checkOnboarding soit terminé AVANT de mettre loading à false
        await checkOnboarding(session.user?.id);
      }
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] Auth state changed:', _event, session?.user?.id);
      setSession(session);
      if (session) {
        setUser(session.user);
        api.setToken(session.access_token);
        // Sync token with extension
        syncTokenWithExtension(session.access_token);
        // Recharger les données d'onboarding en arrière-plan (pas de await pour éviter de bloquer)
        checkOnboarding(session.user?.id);
      } else {
        setUser(null);
        api.setToken(null);
        // Clear extension token
        clearExtensionToken();
        setOnboardingCompleted(null);
        setOnboardingData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (userId) => {
    if (!userId) {
      console.log('[AuthContext] No userId, skipping onboarding check');
      setOnboardingCompleted(false);
      return;
    }

    try {
      console.log('[AuthContext] Checking onboarding for user:', userId);

      const { data, error } = await supabase
        .from('users')
        .select('onboarding_completed, onboarding_data')
        .eq('id', userId)
        .single();

      console.log('[AuthContext] Onboarding check result:', {
        completed: data?.onboarding_completed,
        hasData: !!data?.onboarding_data,
        dataKeys: data?.onboarding_data ? Object.keys(data.onboarding_data) : [],
        error: error?.message
      });

      if (error) {
        // Utilisateur n'existe pas encore dans la table users (premier login)
        console.log('[AuthContext] User not in users table yet, setting onboarding to false');
        setOnboardingCompleted(false);
        setOnboardingData(null);
      } else if (data) {
        setOnboardingCompleted(data.onboarding_completed ?? false);
        setOnboardingData(data.onboarding_data);
      }
    } catch (error) {
      console.error('[AuthContext] Error checking onboarding:', error);
      // En cas d'erreur, on considère que l'onboarding n'est pas fait
      setOnboardingCompleted(false);
      setOnboardingData(null);
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
    onboardingData,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    logout: signOut, // Alias pour compatibilité
    loginDemo,
    completeOnboarding,
    skipOnboardingDemo,
    isAuthenticated: !!user,
    // Skip l'onboarding si l'utilisateur vient de SOS Storytelling
    needsOnboarding: user && onboardingCompleted === false && !fromSOS,
    fromSOS,
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
