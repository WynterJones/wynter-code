export interface JustParameter {
  name: string;
  defaultValue?: string;
  isVariadic?: boolean;
}

export interface JustRecipe {
  name: string;
  description?: string;
  dependencies: string[];
  parameters: JustParameter[];
  body: string[];
  lineNumber: number;
  isPrivate?: boolean;
  isQuiet?: boolean;
}

export interface JustfileData {
  path: string;
  variables: Record<string, string>;
  recipes: JustRecipe[];
  rawContent: string;
}

export type RecipeExecutionStatus = "idle" | "running" | "success" | "error";

export interface RecipeExecution {
  recipeName: string;
  status: RecipeExecutionStatus;
  startedAt: number;
  ptyId?: string;
}
