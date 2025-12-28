export type ClaudeModel = "claude-opus-4-20250514" | "claude-sonnet-4-20250514" | "claude-3-5-haiku-20241022";

export type SessionType = "claude" | "terminal";

export interface Session {
  id: string;
  projectId: string;
  name: string;
  type: SessionType;
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

/** Structured prompt for sending to Claude with multimodal content */
export interface StructuredPrompt {
  text: string;
  images?: Array<{ base64: string; mediaType: string }>;
  files?: string[];
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
  isError?: boolean; // Tool execution resulted in error
}

export interface StreamingChunk {
  type: "text" | "tool_use" | "tool_result" | "init" | "result" | "error" | "done" | "assistant";
  content?: string;
  toolCall?: ToolCall;
  sessionId?: string;
}

export type PermissionMode = "default" | "plan" | "acceptEdits" | "bypassPermissions" | "manual";

export type ResultSubtype = 'success' | 'error_max_turns' | 'error_during_execution';

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
  // Result message fields
  subtype?: ResultSubtype | 'init';
  is_error?: boolean;
  num_turns?: number;
  duration_api_ms?: number;
  // Init message fields
  permission_mode?: PermissionMode;
  tools?: string[];
  // Tool result fields
  tool_is_error?: boolean;
}

export interface StreamingStats {
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd?: number;
  durationMs?: number;
  durationApiMs?: number;
  startTime: number;
  isThinking: boolean;
  currentTool?: string;
  // New fields
  numTurns?: number;
  resultSubtype?: ResultSubtype;
  isError?: boolean;
}

export interface ToolApproval {
  toolId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
}

export interface McpPermissionRequest {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  sessionId: string;
}

export interface McpPermissionResponse {
  behavior: "allow" | "deny";
  updatedInput?: Record<string, unknown>;
  message?: string;
}
