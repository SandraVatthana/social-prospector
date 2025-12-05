import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Sidebar, Header } from './components/layout';
import LegalFooter from './components/layout/LegalFooter';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Voice from './pages/Voice';
import Settings from './pages/Settings';
import Search from './pages/Search';
import Prospects from './pages/Prospects';
import Messages from './pages/Messages';
import Billing from './pages/Billing';
import AnalyticsAgence from './pages/AnalyticsAgence';
import LoginPage from './pages/LoginPage';
import Conversation from './pages/Conversation';
import Clients from './pages/Clients';
import OnboardingProfond from './components/onboarding/OnboardingProfond';
import GuidedTour, { useTour, STORAGE_KEY } from './components/tour/GuidedTour';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ClientProvider } from './contexts/ClientContext';
import { ToastProvider } from './components/ui/Toast';
import WelcomeModal from './components/ui/WelcomeModal';
import FAQChatbot from './components/ui/FAQChatbot';

// Pages légales et publiques
import OptOut from './pages/OptOut';
import Privacy from './pages/legal/Privacy';
import Terms from './pages/legal/Terms';
import Legal from './pages/legal/Legal';
import Admin from './pages/Admin';
import Landing from './pages/Landing';

// Contexte pour le tour guidé
const TourContext = createContext(null);
export const useTourContext = () => useContext(TourContext);


// Routes publiques qui ne nécessitent pas d'authentification
const PUBLIC_ROUTES = ['/opt-out', '/privacy', '/terms', '/legal', '/landing', '/login'];

function AppContent() {
  const { needsOnboarding, completeOnboarding, skipOnboardingDemo, user, loginDemo, loading, onboardingData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isOpen: isTourOpen, startTour, closeTour, isTourCompleted, resetTour } = useTour();
  const [hasCheckedTour, setHasCheckedTour] = useState(false);

  // Vérifier si on est sur une route publique
  const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname);

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
    if (!loading && user && !needsOnboarding && !hasCheckedTour && !isPublicRoute) {
      setHasCheckedTour(true);
      // Petit délai pour laisser l'UI se charger
      const timer = setTimeout(() => {
        if (!isTourCompleted()) {
          startTour();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, user, needsOnboarding, hasCheckedTour, isTourCompleted, startTour, isPublicRoute]);

  const handleTourClose = () => {
    closeTour();
  };

  const handleTourNavigate = (path) => {
    navigate(path);
  };

  // Routes publiques accessibles sans auth
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/opt-out" element={<OptOut />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/login" element={<LoginPage onDemoLogin={handleDemoLogin} />} />
      </Routes>
    );
  }

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

  // Si pas d'utilisateur, afficher la landing page
  if (!user) {
    return <Landing />;
  }

  // Si l'utilisateur n'a pas complété l'onboarding, afficher l'onboarding
  if (needsOnboarding) {
    return (
      <OnboardingProfond
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        initialData={onboardingData}
      />
    );
  }

  // Page admin (layout différent sans sidebar)
  if (location.pathname === '/admin') {
    return (
      <div className="min-h-screen flex flex-col">
        <Admin />
        <LegalFooter />
      </div>
    );
  }

  // Layout principal avec sidebar
  return (
    <TourContext.Provider value={{ startTour, resetTour }}>
      <div className="flex min-h-screen bg-warm-50">
        {/* Sidebar */}
        <Sidebar
          user={user}
          prospectsCount={0}
          messagesCount={0}
        />

        {/* Main content */}
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/analytics-agence" element={<AnalyticsAgence />} />
              <Route path="/voice" element={<Voice />} />
              <Route path="/search" element={<Search />} />
              <Route path="/prospects" element={<Prospects />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/conversation/:prospectId" element={<Conversation />} />
              {/* Redirections et catch-all */}
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <LegalFooter />
        </div>

        {/* Tour guidé */}
        <GuidedTour
          isOpen={isTourOpen}
          onClose={handleTourClose}
          onNavigate={handleTourNavigate}
        />

        {/* Pop-up de bienvenue (bêta) */}
        <WelcomeModal />

        {/* Chatbot FAQ flottant */}
        <FAQChatbot />
      </div>
    </TourContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ClientProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ClientProvider>
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
