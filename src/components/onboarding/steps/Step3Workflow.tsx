import { Button } from "@/components/ui/Button";
import { ChevronRight, ChevronLeft, FolderOpen, Keyboard, Zap } from "lucide-react";

interface Step3WorkflowProps {
  onNext: () => void;
  onPrevious: () => void;
}

const steps = [
  {
    number: 1,
    icon: FolderOpen,
    title: "Open your project folder",
    description: "Select any folder containing your code",
  },
  {
    number: 2,
    icon: Keyboard,
    title: "Type your prompt",
    description: "Describe what you want Claude to do",
  },
  {
    number: 3,
    icon: Zap,
    title: "Claude Code does the work",
    description: "Watch as your code is analyzed and modified",
  },
];

export function Step3Workflow({ onNext, onPrevious }: Step3WorkflowProps) {
  return (
    <div className="flex flex-col min-h-[450px] px-8 py-10">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
          How it works
        </h2>

        <div className="space-y-4 max-w-md mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-4 p-4 rounded-lg bg-bg-tertiary/50 border border-border"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold">{step.number}</span>
              </div>
              <div>
                <h3 className="font-semibold text-text-primary mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-text-secondary">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={onPrevious} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>
        <Button variant="primary" onClick={onNext} className="gap-2">
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
