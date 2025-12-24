import { useState } from "react";
import { CheckCircle2, Circle, Square, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface QuestionOption {
  label: string;
  description?: string;
}

export interface PendingQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

interface AskUserQuestionBlockProps {
  question: PendingQuestion;
  onSubmit: (selectedOptions: string[]) => void;
  disabled?: boolean;
}

export function AskUserQuestionBlock({
  question,
  onSubmit,
  disabled = false,
}: AskUserQuestionBlockProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleOptionClick = (optionLabel: string) => {
    if (disabled) return;

    if (question.multiSelect) {
      const newSelected = new Set(selected);
      if (newSelected.has(optionLabel)) {
        newSelected.delete(optionLabel);
      } else {
        newSelected.add(optionLabel);
      }
      setSelected(newSelected);
    } else {
      setSelected(new Set([optionLabel]));
    }
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    onSubmit(Array.from(selected));
  };

  return (
    <div className="rounded-lg border border-accent-yellow/30 bg-accent-yellow/5 p-4 my-2">
      <div className="text-sm font-medium text-text-primary mb-3">
        {question.question}
      </div>

      <div className="space-y-2 mb-4">
        {question.options.map((option) => {
          const isSelected = selected.has(option.label);
          const Icon = question.multiSelect
            ? isSelected
              ? CheckSquare
              : Square
            : isSelected
              ? CheckCircle2
              : Circle;

          return (
            <button
              key={option.label}
              onClick={() => handleOptionClick(option.label)}
              disabled={disabled}
              className={cn(
                "w-full flex items-start gap-3 p-2 rounded-md",
                "text-left text-sm transition-colors",
                disabled && "opacity-50 cursor-not-allowed",
                isSelected
                  ? "bg-accent/10 text-text-primary"
                  : "hover:bg-bg-hover text-text-secondary"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mt-0.5 flex-shrink-0",
                  isSelected ? "text-accent" : "text-text-secondary"
                )}
              />
              <div className="flex flex-col gap-0.5">
                <span className={cn(isSelected && "font-medium")}>
                  {option.label}
                </span>
                {option.description && (
                  <span className="text-xs text-text-secondary">
                    {option.description}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={handleSubmit}
          disabled={selected.size === 0 || disabled}
        >
          Submit Response
        </Button>
        {question.multiSelect && (
          <span className="text-xs text-text-secondary">
            Select one or more options
          </span>
        )}
      </div>
    </div>
  );
}
