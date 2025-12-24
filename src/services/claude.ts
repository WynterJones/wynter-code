import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { StreamChunk, ClaudeModel, StreamingStats, PermissionMode } from "@/types";

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

export interface ClaudeStreamCallbacks {
  onText: (text: string) => void;
  onThinking: (text: string) => void;
  onThinkingStart: () => void;
  onThinkingEnd: () => void;
  onToolStart: (toolName: string, toolId: string) => void;
  onToolInputDelta: (toolId: string, partialJson: string) => void;
  onToolEnd: (toolId: string) => void;
  onToolResult: (toolId: string, content: string) => void;
  onInit: (model: string, cwd: string, claudeSessionId?: string) => void;
  onUsage: (stats: Partial<StreamingStats>) => void;
  onResult: (result: string) => void;
  onError: (error: string) => void;
  onDone: (exitCode: number, claudeSessionId?: string, stats?: Partial<StreamingStats>) => void;
}

class ClaudeService {
  private _currentModel: ClaudeModel = "claude-sonnet-4-20250514";

  // Per-session state Maps
  private _unlistenMap = new Map<string, UnlistenFn>();
  private _streamingMap = new Map<string, boolean>();
  private _currentToolIdMap = new Map<string, string | null>();

  setModel(model: ClaudeModel) {
    this._currentModel = model;
  }

  get currentModel() {
    return this._currentModel;
  }

  /** Check if ANY session is currently streaming */
  get isStreaming() {
    return Array.from(this._streamingMap.values()).some(v => v);
  }

  /** Check if a specific session is streaming */
  isSessionStreaming(sessionId: string): boolean {
    return this._streamingMap.get(sessionId) || false;
  }

  /** Get all currently streaming session IDs */
  getStreamingSessionIds(): string[] {
    return Array.from(this._streamingMap.entries())
      .filter(([, streaming]) => streaming)
      .map(([id]) => id);
  }

  async startStreaming(
    prompt: string,
    cwd: string,
    sessionId: string,
    callbacks: ClaudeStreamCallbacks,
    claudeSessionId?: string,
    permissionMode?: PermissionMode
  ): Promise<void> {
    // Only check if THIS session is streaming, not globally
    if (this._streamingMap.get(sessionId)) {
      throw new Error("Session already streaming");
    }

    this._streamingMap.set(sessionId, true);
    this._currentToolIdMap.set(sessionId, null);
    let capturedClaudeSessionId: string | undefined = claudeSessionId;

    // Set up event listener before invoking the command
    const unlisten = await listen<StreamChunk>("claude-stream", (event) => {
      const chunk = event.payload;

      // Only process chunks for this session
      if (chunk.session_id !== sessionId) {
        return;
      }

      // Capture claude session ID from any chunk that has it
      if (chunk.claude_session_id) {
        capturedClaudeSessionId = chunk.claude_session_id;
      }

      const currentToolId = this._currentToolIdMap.get(sessionId);

      switch (chunk.chunk_type) {
        case "init":
          if (chunk.model) {
            callbacks.onInit(chunk.model, chunk.content || cwd, chunk.claude_session_id);
          }
          break;

        case "text":
          if (chunk.content) {
            callbacks.onText(chunk.content);
          }
          break;

        case "thinking":
          if (chunk.content) {
            callbacks.onThinking(chunk.content);
          }
          break;

        case "thinking_start":
          callbacks.onThinkingStart();
          break;

        case "tool_start":
          if (chunk.tool_name && chunk.tool_id) {
            this._currentToolIdMap.set(sessionId, chunk.tool_id);
            callbacks.onToolStart(chunk.tool_name, chunk.tool_id);
          }
          break;

        case "tool_use":
          if (chunk.tool_name && chunk.tool_id) {
            this._currentToolIdMap.set(sessionId, chunk.tool_id);
            callbacks.onToolStart(chunk.tool_name, chunk.tool_id);
          }
          break;

        case "tool_input_delta":
          // Accumulate tool input JSON
          if (chunk.content && currentToolId) {
            callbacks.onToolInputDelta(currentToolId, chunk.content);
          }
          break;

        case "tool_result":
          if (chunk.tool_id) {
            callbacks.onToolResult(chunk.tool_id, chunk.content || "");
            this._currentToolIdMap.set(sessionId, null);
          }
          break;

        case "block_end":
          // Could be end of thinking or tool
          callbacks.onThinkingEnd();
          if (currentToolId) {
            callbacks.onToolEnd(currentToolId);
            this._currentToolIdMap.set(sessionId, null);
          }
          break;

        case "usage":
          callbacks.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            cacheReadTokens: chunk.cache_read_tokens,
            cacheWriteTokens: chunk.cache_write_tokens,
          });
          break;

        case "result":
          if (chunk.content) {
            callbacks.onResult(chunk.content);
          }
          // Also pass final stats
          callbacks.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            costUsd: chunk.cost_usd,
            durationMs: chunk.duration_ms,
          });
          break;

        case "error":
          if (chunk.content) {
            callbacks.onError(chunk.content);
          }
          break;

        case "done":
          const exitCodeMatch = chunk.content?.match(/exit_code:(-?\d+)/);
          const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : 0;
          callbacks.onDone(exitCode, chunk.claude_session_id || capturedClaudeSessionId, {
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            costUsd: chunk.cost_usd,
            durationMs: chunk.duration_ms,
          });
          this.stopSessionStreaming(sessionId);
          break;

        case "system":
          // System messages - could show these in a special way
          if (chunk.content) {
            callbacks.onText(`[System] ${chunk.content}`);
          }
          break;

        default:
          // Ignore unknown chunk types
          break;
      }
    });

    this._unlistenMap.set(sessionId, unlisten);

    try {
      // Use the new process manager command
      await invoke("start_claude_streaming", {
        prompt,
        cwd,
        sessionId,
        claudeSessionId,
        permissionMode,
      });
    } catch (error) {
      this.stopSessionStreaming(sessionId);
      throw error;
    }
  }

  /** Stop streaming for a specific session */
  stopSessionStreaming(sessionId: string) {
    this._streamingMap.delete(sessionId);
    this._currentToolIdMap.delete(sessionId);

    const unlisten = this._unlistenMap.get(sessionId);
    if (unlisten) {
      unlisten();
      this._unlistenMap.delete(sessionId);
    }
  }

  /** Legacy method - stops all streaming (for backwards compatibility) */
  stopStreaming() {
    // Stop all sessions
    for (const sessionId of this._streamingMap.keys()) {
      this.stopSessionStreaming(sessionId);
    }
  }

  /** Send input to a running Claude session (for tool approvals, questions) */
  async sendInput(sessionId: string, input: string): Promise<void> {
    await invoke("send_claude_input", { sessionId, input });
  }

  /** Terminate a running Claude session */
  async terminateSession(sessionId: string): Promise<void> {
    await invoke("terminate_claude_session", { sessionId });
    this.stopSessionStreaming(sessionId);
  }

  /** Check if a Claude session is active (running on backend) */
  async isSessionActive(sessionId: string): Promise<boolean> {
    return await invoke<boolean>("is_claude_session_active", { sessionId });
  }

  /** Get list of all active Claude sessions from backend */
  async getActiveSessions(): Promise<string[]> {
    return await invoke<string[]>("list_active_claude_sessions");
  }

  // Non-streaming version for simple queries
  async sendPromptSync(prompt: string, cwd: string): Promise<string> {
    try {
      const output = await invoke<CommandOutput>("run_claude", {
        prompt,
        cwd,
      });

      if (output.code !== 0) {
        return output.stderr || "Command failed with no error message";
      }

      try {
        const parsed = JSON.parse(output.stdout);
        if (parsed.result) {
          return parsed.result;
        } else if (parsed.error) {
          return `Error: ${parsed.error}`;
        }
        return output.stdout;
      } catch {
        return output.stdout || "No response received";
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error: ${errorMessage}`;
    }
  }

  async checkInstalled(): Promise<boolean> {
    try {
      const output = await invoke<CommandOutput>("run_claude", {
        prompt: "--version",
        cwd: ".",
      });
      return output.code === 0;
    } catch {
      return false;
    }
  }
}

export const claudeService = new ClaudeService();
