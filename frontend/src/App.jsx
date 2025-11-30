import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Voice from './pages/Voice';
import Settings from './pages/Settings';
import Search from './pages/Search';
import Prospects from './pages/Prospects';
import Messages from './pages/Messages';
import Billing from './pages/Billing';
import OnboardingProfond from './components/onboarding/OnboardingProfond';
import GuidedTour, { useTour, STORAGE_KEY } from './components/tour/GuidedTour';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Contexte pour le tour guidé
const TourContext = createContext(null);
export const useTourContext = () => useContext(TourContext);

// Données mock pour la démo
const mockUser = {
  name: 'Sandra',
  email: 'sandra@example.com',
  plan: 'Solo',
  days_until_renewal: 23,
};

function AppContent() {
  const { needsOnboarding, completeOnboarding, skipOnboardingDemo, user, loginDemo, loading } = useAuth();
  const navigate = useNavigate();
  const { isOpen: isTourOpen, startTour, closeTour, isTourCompleted, resetTour } = useTour();
  const [hasCheckedTour, setHasCheckedTour] = useState(false);

  // En mode démo, auto-login si pas d'utilisateur
  // Commenter ces lignes pour tester l'onboarding
  // useEffect(() => {
  //   if (!loading && !user) {
  //     loginDemo(mockUser);
  //   }
  // }, [loading, user]);

  // Pour la démo : afficher un bouton pour lancer l'onboarding
  const handleDemoLogin = () => {
    loginDemo(mockUser);
  };

  const handleOnboardingComplete = (data, voiceProfile, redirectTo) => {
    completeOnboarding();
    if (redirectTo === 'search') {
      navigate('/search');
    } else {
      navigate('/');
    }
  };

  const handleOnboardingSkip = () => {
    skipOnboardingDemo();
    navigate('/');
  };

  // Lancer le tour guidé à la première visite (après l'onboarding)
  useEffect(() => {
    if (!loading && user && !needsOnboarding && !hasCheckedTour) {
      setHasCheckedTour(true);
      // Petit délai pour laisser l'UI se charger
      const timer = setTimeout(() => {
        if (!isTourCompleted()) {
          startTour();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, needsOnboarding, hasCheckedTour, isTourCompleted, startTour]);

  const handleTourClose = () => {
    closeTour();
  };

  const handleTourNavigate = (path) => {
    navigate(path);
  };

  // État de chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-warm-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-warm-500">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si pas d'utilisateur, afficher page de connexion démo
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-50 via-white to-accent-50">
        <div className="bg-white rounded-3xl shadow-2xl shadow-brand-500/10 p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-warm-900 mb-2">Bienvenue sur Social Prospector</h1>
          <p className="text-warm-500 mb-8">La prospection qui parle avec ta vraie voix</p>
          <button
            onClick={handleDemoLogin}
            className="w-full px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-brand-500/25"
          >
            Démarrer la démo
          </button>
          <p className="text-xs text-warm-400 mt-4">
            Mode démo — aucune inscription requise
          </p>
        </div>
      </div>
    );
  }

  // Si l'utilisateur n'a pas complété l'onboarding, afficher l'onboarding
  if (needsOnboarding) {
    return (
      <OnboardingProfond
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    );
  }

  // Layout principal avec sidebar
  return (
    <TourContext.Provider value={{ startTour, resetTour }}>
      <div className="flex min-h-screen bg-warm-50">
        {/* Sidebar */}
        <Sidebar
          user={mockUser}
          prospectsCount={127}
          messagesCount={12}
        />

        {/* Main content */}
        <main className="flex-1 ml-64">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/voice" element={<Voice />} />
            <Route path="/search" element={<Search />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Tour guidé */}
        <GuidedTour
          isOpen={isTourOpen}
          onClose={handleTourClose}
          onNavigate={handleTourNavigate}
        />
      </div>
    </TourContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// Placeholder pour les pages non implémentées
function PlaceholderPage({ title, subtitle }) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="p-8">
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-warm-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warm-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-semibold text-warm-700 mb-2">Page en cours de développement</h2>
          <p className="text-warm-500">Cette fonctionnalité sera bientôt disponible</p>
        </div>
      </div>
    </>
  );
}
