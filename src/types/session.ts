export type ClaudeModel = "claude-sonnet-4-20250514" | "claude-opus-4-20250514" | "claude-haiku-3-5-20241022";

export interface Session {
  id: string;
  projectId: string;
  name: string;
  model: ClaudeModel;
  claudeSessionId: string | null;
  isActive: boolean;
  createdAt: Date;
  color?: string;
  permissionMode: PermissionMode;
}

export interface ImageAttachment {
  id: string;
  data: string;
  mimeType: string;
  name?: string;
}

export interface FileReference {
  id: string;
  path: string;
  displayPath: string;
}

export interface MessageAttachments {
  images?: ImageAttachment[];
  files?: FileReference[];
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  attachments?: MessageAttachments;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
  status: "pending" | "running" | "completed" | "error";
}

export interface StreamingChunk {
  type: "text" | "tool_use" | "tool_result" | "init" | "result" | "error" | "done" | "assistant";
  content?: string;
  toolCall?: ToolCall;
  sessionId?: string;
}

export interface StreamChunk {
  chunk_type: string;
  content?: string;
  tool_name?: string;
  tool_input?: string;
  session_id?: string;
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  cost_usd?: number;
  duration_ms?: number;
  tool_id?: string;
  claude_session_id?: string;
}

export type PermissionMode = "default" | "plan" | "acceptEdits" | "bypassPermissions";

export interface StreamingStats {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd?: number;
  durationMs?: number;
  startTime: number;
  isThinking: boolean;
  currentTool?: string;
}

export interface ToolApproval {
  toolId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}
