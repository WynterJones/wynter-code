import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SystemCheckResults {
  node: string | null;
  npm: string | null;
  git: string | null;
  claude: string | null;
  codex: string | null;
  gemini: string | null;
}

interface OnboardingStore {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  systemCheckResults: SystemCheckResults | null;
  isCheckingSystem: boolean;

  completeOnboarding: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setSystemCheckResults: (results: SystemCheckResults) => void;
  setIsCheckingSystem: (checking: boolean) => void;
  resetOnboarding: () => void;
  reset: () => void;
}

const ONBOARDING_STEPS = [
  { id: 1, name: "Welcome" },
  { id: 2, name: "Features" },
  { id: 3, name: "Workflow" },
  { id: 4, name: "System Check" },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      hasCompletedOnboarding: false,
      currentStep: 1,
      systemCheckResults: null,
      isCheckingSystem: false,

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      setCurrentStep: (step: number) => {
        if (step >= 1 && step <= TOTAL_STEPS) {
          set({ currentStep: step });
        }
      },

      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < TOTAL_STEPS) {
          set({ currentStep: currentStep + 1 });
        }
      },

      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },

      setSystemCheckResults: (results: SystemCheckResults) => {
        set({ systemCheckResults: results });
      },

      setIsCheckingSystem: (checking: boolean) => {
        set({ isCheckingSystem: checking });
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          currentStep: 1,
          systemCheckResults: null,
          isCheckingSystem: false,
        });
      },

      reset: () => {
        set({
          hasCompletedOnboarding: false,
          currentStep: 1,
          systemCheckResults: null,
          isCheckingSystem: false,
        });
      },
    }),
    {
      name: "wynter-code-onboarding",
    }
  )
);
