/**
 * Slash commands that get custom UI handling
 */
export type CustomHandledCommand =
  | "clear"
  | "context"
  | "cost"
  | "usage"
  | "status"
  | "todos";

/**
 * Commands that are handled locally without CLI call
 */
export const LOCAL_ONLY_COMMANDS: CustomHandledCommand[] = ["clear"];

/**
 * Commands that go to CLI but get custom UI rendering
 */
export const CUSTOM_UI_COMMANDS: CustomHandledCommand[] = [
  "context",
  "cost",
  "usage",
  "status",
  "todos",
];

/**
 * Context item in the context tree
 */
export interface ContextItem {
  type: "file" | "directory" | "system" | "conversation" | "unknown";
  name: string;
  path?: string;
  tokens: number;
  percentage?: number;
}

/**
 * Response from /context command
 */
export interface ContextResponse {
  totalTokens: number;
  maxTokens: number;
  usedPercentage: number;
  items: ContextItem[];
}

/**
 * Response from /cost command
 */
export interface CostResponse {
  sessionTotal: number;
  currentTurn?: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

/**
 * Response from /usage command
 */
export interface UsageResponse {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens: number;
  turns?: number;
  apiDurationMs?: number;
}

/**
 * Response from /status command
 */
export interface StatusResponse {
  sessionId?: string;
  model: string;
  cwd: string;
  permissionMode?: string;
  tools: string[];
  mcpServers?: string[];
  isActive: boolean;
}

/**
 * Todo item from /todos command
 */
export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

/**
 * Response from /todos command
 */
export interface TodosResponse {
  todos: TodoItem[];
  completedCount: number;
  totalCount: number;
}

/**
 * Union of all custom command responses
 */
export type SlashCommandResponse =
  | { type: "clear" }
  | { type: "context"; data: ContextResponse }
  | { type: "cost"; data: CostResponse }
  | { type: "usage"; data: UsageResponse }
  | { type: "status"; data: StatusResponse }
  | { type: "todos"; data: TodosResponse };
