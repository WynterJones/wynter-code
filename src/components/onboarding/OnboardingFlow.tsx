import { useMemo } from "react";
import { createPortal } from "react-dom";
import { useOnboardingStore, TOTAL_STEPS } from "@/stores";
import { Step1Welcome } from "./steps/Step1Welcome";
import { Step2Features } from "./steps/Step2Features";
import { Step3Workflow } from "./steps/Step3Workflow";
import { Step4SystemCheck } from "./steps/Step4SystemCheck";

export function OnboardingFlow() {
  const { currentStep, nextStep, previousStep, completeOnboarding } =
    useOnboardingStore();

  const handleComplete = () => {
    completeOnboarding();
  };

  // Generate static stars
  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.15,
      twinkleDelay: Math.random() * 8,
      twinkleDuration: 3 + Math.random() * 4,
    }));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome onNext={nextStep} />;
      case 2:
        return <Step2Features onNext={nextStep} onPrevious={previousStep} />;
      case 3:
        return <Step3Workflow onNext={nextStep} onPrevious={previousStep} />;
      case 4:
        return (
          <Step4SystemCheck
            onComplete={handleComplete}
            onPrevious={previousStep}
          />
        );
      default:
        return <Step1Welcome onNext={nextStep} />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Space background */}
      <div className="absolute inset-0 bg-[#08080f]" />

      {/* Ambient gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 70% at 50% 35%, rgba(65, 33, 85, 0.15) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 75% 55%, rgba(100, 130, 200, 0.08) 0%, transparent 45%)
          `,
        }}
      />

      {/* Stars layer */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animation: `twinkle ${star.twinkleDuration}s ease-in-out infinite`,
              animationDelay: `${star.twinkleDelay}s`,
            }}
          />
        ))}
      </div>

      {/* Nebula-like clouds */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `
            radial-gradient(ellipse 35% 25% at 15% 75%, rgba(180, 140, 200, 0.25) 0%, transparent 70%),
            radial-gradient(ellipse 45% 35% at 85% 25%, rgba(120, 160, 220, 0.2) 0%, transparent 60%)
          `,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 75% 75% at 50% 50%, transparent 20%, rgba(0, 0, 0, 0.4) 100%)",
        }}
      />

      {/* Content card */}
      <div className="relative w-full max-w-2xl mx-4 z-10">
        <div className="bg-bg-secondary/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl overflow-hidden">
          {renderStep()}

          <div className="px-8 pb-6">
            <div className="flex justify-center gap-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i + 1 === currentStep
                      ? "bg-accent"
                      : i + 1 < currentStep
                      ? "bg-accent/50"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>
    </div>,
    document.body
  );
}
