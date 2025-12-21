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
  private _unlisten: UnlistenFn | null = null;
  private _isStreaming = false;
  private _currentToolId: string | null = null;

  setModel(model: ClaudeModel) {
    this._currentModel = model;
  }

  get currentModel() {
    return this._currentModel;
  }

  get isStreaming() {
    return this._isStreaming;
  }

  async startStreaming(
    prompt: string,
    cwd: string,
    sessionId: string,
    callbacks: ClaudeStreamCallbacks,
    claudeSessionId?: string,
    permissionMode?: PermissionMode
  ): Promise<void> {
    if (this._isStreaming) {
      throw new Error("Already streaming");
    }

    this._isStreaming = true;
    let capturedClaudeSessionId: string | undefined = claudeSessionId;

    // Set up event listener before invoking the command
    this._unlisten = await listen<StreamChunk>("claude-stream", (event) => {
      const chunk = event.payload;

      // Only process chunks for this session
      if (chunk.session_id !== sessionId) {
        return;
      }

      // Capture claude session ID from any chunk that has it
      if (chunk.claude_session_id) {
        capturedClaudeSessionId = chunk.claude_session_id;
      }

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
            this._currentToolId = chunk.tool_id;
            callbacks.onToolStart(chunk.tool_name, chunk.tool_id);
          }
          break;

        case "tool_use":
          if (chunk.tool_name && chunk.tool_id) {
            this._currentToolId = chunk.tool_id;
            callbacks.onToolStart(chunk.tool_name, chunk.tool_id);
          }
          break;

        case "tool_input_delta":
          // Accumulate tool input JSON
          if (chunk.content && this._currentToolId) {
            callbacks.onToolInputDelta(this._currentToolId, chunk.content);
          }
          break;

        case "tool_result":
          if (chunk.tool_id) {
            callbacks.onToolResult(chunk.tool_id, chunk.content || "");
            this._currentToolId = null;
          }
          break;

        case "block_end":
          // Could be end of thinking or tool
          callbacks.onThinkingEnd();
          if (this._currentToolId) {
            callbacks.onToolEnd(this._currentToolId);
            this._currentToolId = null;
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
          this.stopStreaming();
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

    try {
      // Invoke the streaming command
      await invoke("run_claude_streaming", {
        prompt,
        cwd,
        sessionId,
        claudeSessionId,
        permissionMode,
      });
    } catch (error) {
      this._isStreaming = false;
      this._unlisten?.();
      this._unlisten = null;
      throw error;
    }
  }

  stopStreaming() {
    this._isStreaming = false;
    if (this._unlisten) {
      this._unlisten();
      this._unlisten = null;
    }
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
