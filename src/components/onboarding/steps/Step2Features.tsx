import { Button } from "@/components/ui/Button";
import {
  ChevronRight,
  ChevronLeft,
  FolderOpen,
  MessageSquare,
  ListChecks,
  Sparkles,
} from "lucide-react";

interface Step2FeaturesProps {
  onNext: () => void;
  onPrevious: () => void;
}

const features = [
  {
    icon: FolderOpen,
    title: "Manage multiple projects",
    description: "Switch between projects with organized tabs",
  },
  {
    icon: MessageSquare,
    title: "Beautiful chat interface",
    description: "Interact with AI in a clean, intuitive interface",
  },
  {
    icon: ListChecks,
    title: "Developer Tools",
    description: "A tonne of tools for every situation as a developer",
  },
  {
    icon: Sparkles,
    title: "Focus with music mode",
    description: "Take breaks with built-in relaxation features",
  },
];

export function Step2Features({ onNext, onPrevious }: Step2FeaturesProps) {
  return (
    <div className="flex flex-col min-h-[450px] px-8 py-10">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
          What you can do
        </h2>

        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 rounded-lg bg-bg-tertiary/50 border border-border hover:border-accent/50 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-accent mb-3" />
              <h3 className="font-semibold text-text-primary mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-text-secondary">
                {feature.description}
              </p>
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
