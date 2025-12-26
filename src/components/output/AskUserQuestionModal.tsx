import { useState, useCallback } from "react";
import {
  CheckCircle2,
  Circle,
  Square,
  CheckSquare,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Check,
  Send,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PendingQuestionSet } from "./AskUserQuestionBlock";

interface AskUserQuestionModalProps {
  questionSet: PendingQuestionSet;
  onSubmit: (answers: Record<string, string[]>) => void;
}

interface QuestionAnswers {
  [questionId: string]: {
    selected: Set<string>;
    customText: string;
    useCustom: boolean;
  };
}

export function AskUserQuestionModal({
  questionSet,
  onSubmit,
}: AskUserQuestionModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [answers, setAnswers] = useState<QuestionAnswers>(() => {
    const initial: QuestionAnswers = {};
    questionSet.questions.forEach((q) => {
      initial[q.id] = { selected: new Set(), customText: "", useCustom: false };
    });
    return initial;
  });

  const currentQuestion = questionSet.questions[currentIndex];
  const isLastQuestion = currentIndex === questionSet.questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const canProceed = currentAnswer
    ? currentAnswer.selected.size > 0 ||
      (currentAnswer.useCustom && currentAnswer.customText.trim().length > 0)
    : false;

  // Check if all questions are answered
  const allAnswered = questionSet.questions.every((q) => {
    const answer = answers[q.id];
    return (
      answer.selected.size > 0 ||
      (answer.useCustom && answer.customText.trim().length > 0)
    );
  });

  const handleOptionClick = useCallback(
    (optionLabel: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => {
        const current = prev[currentQuestion.id];
        const newSelected = new Set(current.selected);

        if (currentQuestion.multiSelect) {
          if (newSelected.has(optionLabel)) {
            newSelected.delete(optionLabel);
          } else {
            newSelected.add(optionLabel);
          }
        } else {
          newSelected.clear();
          newSelected.add(optionLabel);
        }

        return {
          ...prev,
          [currentQuestion.id]: {
            ...current,
            selected: newSelected,
            useCustom: false,
          },
        };
      });
    },
    [currentQuestion]
  );

  const handleCustomClick = useCallback(() => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const current = prev[currentQuestion.id];
      return {
        ...prev,
        [currentQuestion.id]: {
          ...current,
          selected: new Set(),
          useCustom: true,
        },
      };
    });
  }, [currentQuestion]);

  const handleCustomTextChange = useCallback(
    (text: string) => {
      if (!currentQuestion) return;
      setAnswers((prev) => {
        const current = prev[currentQuestion.id];
        return {
          ...prev,
          [currentQuestion.id]: {
            ...current,
            customText: text,
          },
        };
      });
    },
    [currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (isLastQuestion) {
      setShowReview(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [isLastQuestion]);

  const handleBack = useCallback(() => {
    if (showReview) {
      setShowReview(false);
    } else if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [showReview, currentIndex]);

  const handleSubmit = useCallback(() => {
    const compiled: Record<string, string[]> = {};
    questionSet.questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer.useCustom && answer.customText.trim()) {
        compiled[q.id] = [answer.customText.trim()];
      } else {
        compiled[q.id] = Array.from(answer.selected);
      }
    });
    onSubmit(compiled);
  }, [answers, questionSet.questions, onSubmit]);

  const handleTabClick = useCallback((index: number) => {
    setShowReview(false);
    setCurrentIndex(index);
  }, []);

  const handleEditFromReview = useCallback((index: number) => {
    setShowReview(false);
    setCurrentIndex(index);
  }, []);

  // Get display text for an answer
  const getAnswerDisplay = (questionId: string): string => {
    const answer = answers[questionId];
    if (answer.useCustom && answer.customText.trim()) {
      return `"${answer.customText.trim()}"`;
    }
    if (answer.selected.size > 0) {
      return Array.from(answer.selected).join(", ");
    }
    return "Not answered";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-bg-primary border-2 border-accent rounded-lg shadow-2xl overflow-hidden">
        {/* Header with tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-bg-secondary/50 overflow-x-auto">
          {questionSet.questions.map((q, index) => {
            const answer = answers[q.id];
            const isAnswered =
              answer.selected.size > 0 ||
              (answer.useCustom && answer.customText.trim().length > 0);
            const isCurrent = !showReview && index === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => handleTabClick(index)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  "whitespace-nowrap",
                  isCurrent
                    ? "bg-accent text-white"
                    : isAnswered
                      ? "bg-accent-green/20 text-accent-green"
                      : "bg-bg-hover text-text-secondary hover:bg-bg-tertiary"
                )}
              >
                {isAnswered && !isCurrent && <Check className="w-3 h-3" />}
                {q.header || `Question ${index + 1}`}
              </button>
            );
          })}
          {/* Submit/Review tab */}
          <button
            onClick={() => setShowReview(true)}
            disabled={!allAnswered}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              "whitespace-nowrap",
              showReview
                ? "bg-accent text-white"
                : allAnswered
                  ? "bg-bg-hover text-text-secondary hover:bg-bg-tertiary"
                  : "bg-bg-hover/50 text-text-secondary/50 cursor-not-allowed"
            )}
          >
            <Check className="w-3 h-3" />
            Submit
          </button>
        </div>

        {/* Review view */}
        {showReview ? (
          <div className="px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0" />
              <h3 className="text-base font-medium text-text-primary">
                Review Your Answers
              </h3>
            </div>

            <div className="space-y-3 mb-4">
              {questionSet.questions.map((q, index) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-bg-secondary/50 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-text-secondary mb-1">
                      {q.header || `Question ${index + 1}`}
                    </div>
                    <div className="text-sm text-text-primary font-medium truncate">
                      {getAnswerDisplay(q.id)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditFromReview(index)}
                    className="p-1.5 rounded hover:bg-bg-hover transition-colors text-text-secondary hover:text-text-primary"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Question content */
          <div className="px-6 py-5">
            {/* Question text */}
            <div className="flex items-start gap-3 mb-5">
              <MessageSquare className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <h3 className="text-base font-medium text-text-primary leading-relaxed">
                {currentQuestion?.question}
              </h3>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-4">
              {currentQuestion?.options.map((option, optIndex) => {
                const isSelected = currentAnswer?.selected.has(option.label);
                const Icon = currentQuestion.multiSelect
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
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg",
                      "text-left transition-all duration-150",
                      "border",
                      isSelected
                        ? "bg-accent/10 border-accent/50 text-text-primary"
                        : "bg-bg-secondary/50 border-border/50 hover:bg-bg-hover hover:border-border text-text-secondary"
                    )}
                  >
                    <span className="text-text-secondary/60 font-mono text-xs mt-0.5 w-4">
                      {optIndex + 1}.
                    </span>
                    <Icon
                      className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        isSelected ? "text-accent" : "text-text-secondary/60"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-sm",
                          isSelected && "font-medium text-text-primary"
                        )}
                      >
                        {option.label}
                      </div>
                      {option.description && (
                        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                          {option.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Custom input option */}
              <button
                onClick={handleCustomClick}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg",
                  "text-left transition-all duration-150",
                  "border",
                  currentAnswer?.useCustom
                    ? "bg-accent/10 border-accent/50 text-text-primary"
                    : "bg-bg-secondary/50 border-border/50 hover:bg-bg-hover hover:border-border text-text-secondary"
                )}
              >
                <span className="text-text-secondary/60 font-mono text-xs mt-0.5 w-4">
                  {(currentQuestion?.options.length || 0) + 1}.
                </span>
                <Circle
                  className={cn(
                    "w-4 h-4 mt-0.5 flex-shrink-0",
                    currentAnswer?.useCustom
                      ? "text-accent"
                      : "text-text-secondary/60"
                  )}
                />
                <span className="text-sm">Type something...</span>
              </button>

              {/* Custom text input */}
              {currentAnswer?.useCustom && (
                <div className="ml-11 mt-2">
                  <textarea
                    value={currentAnswer.customText}
                    onChange={(e) => handleCustomTextChange(e.target.value)}
                    placeholder="Enter your response..."
                    className={cn(
                      "w-full px-3 py-2 rounded-lg text-sm",
                      "bg-bg-secondary border border-border",
                      "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30",
                      "text-text-primary placeholder:text-text-secondary/50",
                      "resize-none"
                    )}
                    rows={3}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg-secondary/30">
          <div className="flex items-center gap-2">
            {(currentIndex > 0 || showReview) && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!showReview && (
              <span className="text-xs text-text-secondary">
                {currentQuestion?.multiSelect
                  ? "Select one or more options"
                  : "Select one option"}
              </span>
            )}

            {showReview ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSubmit}
                className="min-w-[100px] bg-accent-green hover:bg-accent-green/90"
              >
                <Send className="w-4 h-4 mr-1.5" />
                Submit
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={!canProceed}
                className="min-w-[100px]"
              >
                {isLastQuestion ? (
                  <>
                    Review
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
