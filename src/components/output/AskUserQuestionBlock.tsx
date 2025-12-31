export interface QuestionOption {
  label: string;
  description?: string;
}

export interface QuestionGroup {
  id: string;
  header: string; // Tab name like "Scope", "Backend"
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

// Single question for backwards compatibility
export interface PendingQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

// Full question set with multiple groups
export interface PendingQuestionSet {
  id: string;
  questions: QuestionGroup[];
  toolId: string;
}

