import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { type CallBackProps, STATUS, type Step, type StoreHelpers } from 'react-joyride';
import { CustomTooltip } from './CustomTooltip';

interface OnboardingContextType {
  startTour: () => void;
  stopTour: () => void;
  isRunning: boolean;
  setSteps: (steps: Step[]) => void;
}

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: React.ReactNode;
  defaultSteps?: Step[];
  tourId?: string;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ 
  children, 
  defaultSteps = [],
  tourId = 'default-tour'
}) => {
  const [steps, setStepsState] = useState<Step[]>(defaultSteps);
  const [isRunning, setIsRunning] = useState(false);
  const [helpers, setHelpers] = useState<StoreHelpers | null>(null);

  useEffect(() => {
    // Check if user has already completed the tour
    const hasCompleted = localStorage.getItem(`onboarding_completed_${tourId}`);
    if (!hasCompleted && steps.length > 0) {
      // Small delay to let UI render before starting
      const timer = setTimeout(() => {
        setIsRunning(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [tourId, steps.length]);

  const startTour = useCallback(() => {
    setIsRunning(true);
    helpers?.reset(true);
  }, [helpers]);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setIsRunning(false);
      localStorage.setItem(`onboarding_completed_${tourId}`, 'true');
    }
  };

  const getHelpers = (helpersInstance: StoreHelpers) => {
    setHelpers(helpersInstance);
  };

  return (
    <OnboardingContext.Provider value={{ startTour, stopTour, isRunning, setSteps: setStepsState }}>
      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={isRunning}
        scrollToFirstStep
        showProgress={false} // We show progress in our custom tooltip
        showSkipButton
        steps={steps}
        getHelpers={getHelpers}
        tooltipComponent={CustomTooltip}
        floaterProps={{
          disableAnimation: true, // We handle animation in CustomTooltip
        }}
        styles={{
          options: {
            zIndex: 10000,
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            primaryColor: 'var(--primary)',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            mixBlendMode: 'hard-light' as any,
          },
          spotlight: {
            borderRadius: '16px',
            backgroundColor: 'transparent',
          }
        }}
      />
      {children}
    </OnboardingContext.Provider>
  );
};


