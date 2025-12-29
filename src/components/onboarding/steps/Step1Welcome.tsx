import { Button } from "@/components/ui/Button";
import { ChevronRight } from "lucide-react";

interface Step1WelcomeProps {
  onNext: () => void;
}

export function Step1Welcome({ onNext }: Step1WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] px-8 py-12 text-center">
      <img
        src="/icons/icon1.png"
        alt="Wynter Code"
        className="w-28 h-28 mb-8"
      />

      <h1 className="text-3xl font-bold text-text-primary mb-4">Howdy! 🤠</h1>

      <p className="text-lg text-text-secondary max-w-md mb-4">
        A companion for building with AI agents. Let's get you set up in just a
        few steps.
      </p>

      <p className="text-sm text-text-secondary opacity-60 max-w-md mb-8">
        Supports: Claude Code / Codex / Gemini
      </p>

      <Button variant="primary" size="lg" onClick={onNext} className="gap-2">
        Get Started
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
