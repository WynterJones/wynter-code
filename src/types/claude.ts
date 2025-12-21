import type { ClaudeModel } from "./session";

export interface ClaudeConfig {
  model: ClaudeModel;
  allowedTools: string[];
  cwd: string;
}

export interface ClaudeResponse {
  type: "message" | "error" | "done";
  content?: string;
  error?: string;
  sessionId?: string;
  cost?: {
    input_tokens: number;
    output_tokens: number;
    total_cost_usd: number;
  };
}

export interface ClaudeSessionState {
  isConnected: boolean;
  isStreaming: boolean;
  sessionId: string | null;
  error: string | null;
}
