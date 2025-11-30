import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'social-prospector-onboarding';

/**
 * Hook pour gérer l'état de l'onboarding
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingData, setOnboardingData] = useState(null);

  // Vérifier si l'onboarding a été complété
  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    if (!stored) {
      setShowOnboarding(true);
    } else {
      try {
        setOnboardingData(JSON.parse(stored));
      } catch (e) {
        // Invalid data, show onboarding again
        setShowOnboarding(true);
      }
    }
  }, []);

  // Compléter l'onboarding
  const completeOnboarding = useCallback((data) => {
    const fullData = {
      ...data,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(fullData));
    setOnboardingData(fullData);
    setShowOnboarding(false);
  }, []);

  // Passer l'onboarding
  const skipOnboarding = useCallback(() => {
    const data = {
      skipped: true,
      skippedAt: new Date().toISOString(),
    };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(data));
    setOnboardingData(data);
    setShowOnboarding(false);
  }, []);

  // Reset l'onboarding (pour debug/settings)
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setOnboardingData(null);
    setShowOnboarding(true);
  }, []);

  return {
    showOnboarding,
    onboardingData,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    isCompleted: !!onboardingData && !onboardingData.skipped,
    isSkipped: onboardingData?.skipped || false,
  };
}

export default useOnboarding;
