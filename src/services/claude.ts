import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { StreamChunk, ClaudeModel, StreamingStats, PermissionMode, McpPermissionRequest, StructuredPrompt } from "@/types";
import { streamingBuffer } from "./streamingBuffer";

interface McpPermissionEvent {
  request: McpPermissionRequest;
}

interface CommandOutput {
  stdout: string;
  stderr: string;
  code: number;
}

export interface ClaudeSessionInfo {
  model?: string;
  providerSessionId?: string;
  tools?: string[];
  cwd?: string;
  permissionMode?: PermissionMode;
}

export interface AskUserQuestionInput {
  questions: Array<{
    question: string;
    header?: string;
    options: Array<{ label: string; description?: string }>;
    multiSelect: boolean;
  }>;
}

export interface ClaudeSessionCallbacks {
  onSessionStarting: () => void;
  onSessionReady: (info: ClaudeSessionInfo) => void;
  onSessionEnded: (reason: string) => void;
  onText: (text: string) => void;
  onThinking: (text: string) => void;
  onThinkingStart: () => void;
  onThinkingEnd: () => void;
  onToolStart: (toolName: string, toolId: string) => void;
  onToolInputDelta: (toolId: string, partialJson: string) => void;
  onToolEnd: (toolId: string) => void;
  onToolResult: (toolId: string, content: string, isError?: boolean) => void;
  onAskUserQuestion: (toolId: string, input: AskUserQuestionInput) => void;
  onInit: (model: string, cwd: string, providerSessionId?: string) => void;
  onUsage: (stats: Partial<StreamingStats>, isFinal?: boolean) => void;
  onResult: (result: string) => void;
  onError: (error: string) => void;
  onPermissionRequest?: (request: McpPermissionRequest) => void;
}

class ClaudeService {
  private _currentModel: ClaudeModel = "claude-sonnet-4-20250514";

  // Per-session state Maps
  private _unlistenMap = new Map<string, UnlistenFn>();
  private _mcpUnlistenMap = new Map<string, UnlistenFn>();
  private _mcpPortMap = new Map<string, number>();
  private _sessionActiveMap = new Map<string, boolean>();
  private _currentToolIdMap = new Map<string, string | null>();
  private _currentToolNameMap = new Map<string, string | null>();
  private _toolInputAccumulator = new Map<string, string>();
  private _callbacksMap = new Map<string, ClaudeSessionCallbacks>();

  setModel(model: ClaudeModel) {
    this._currentModel = model;
  }

  get currentModel() {
    return this._currentModel;
  }

  /** Check if a specific session is active */
  isSessionActive(sessionId: string): boolean {
    return this._sessionActiveMap.get(sessionId) || false;
  }

  /** Start the MCP permission server for manual mode */
  async startMcpPermissionServer(sessionId: string): Promise<number> {
    const port = await invoke<number>("start_mcp_permission_server", { sessionId });
    this._mcpPortMap.set(sessionId, port);
    return port;
  }

  /** Stop the MCP permission server */
  async stopMcpPermissionServer(): Promise<void> {
    await invoke("stop_mcp_permission_server");
  }

  /** Respond to an MCP permission request */
  async respondToPermission(
    requestId: string,
    approved: boolean,
    updatedInput?: Record<string, unknown>
  ): Promise<void> {
    try {
      await invoke("respond_to_mcp_permission", {
        requestId,
        approved,
        updatedInput: updatedInput ? JSON.stringify(updatedInput) : null,
      });
    } catch (error) {
      console.error("[ClaudeService] respondToPermission FAILED:", error);
      throw error;
    }
  }

  /** Set up MCP permission event listener for a session */
  private async setupMcpPermissionListener(sessionId: string): Promise<void> {
    const unlisten = await listen<McpPermissionEvent>("mcp-permission-request", (event) => {
      const { request } = event.payload;

      // Only process requests for this session
      if (request.sessionId !== sessionId) {
        return;
      }

      const cb = this._callbacksMap.get(sessionId);

      if (cb?.onPermissionRequest) {
        cb.onPermissionRequest(request);
      } else {
        console.warn("[ClaudeService] No onPermissionRequest callback found!");
      }
    });

    this._mcpUnlistenMap.set(sessionId, unlisten);
  }

  /** Start a persistent Claude session */
  async startSession(
    cwd: string,
    sessionId: string,
    callbacks: ClaudeSessionCallbacks,
    permissionMode?: PermissionMode,
    resumeSessionId?: string,
    safeMode?: boolean,
    model?: string
  ): Promise<void> {
    if (this._sessionActiveMap.get(sessionId)) {
      console.error("[ClaudeService] Session already active:", sessionId);
      throw new Error("Session already active");
    }

    // Store callbacks
    this._callbacksMap.set(sessionId, callbacks);
    this._currentToolIdMap.set(sessionId, null);

    // Set up streaming buffer callbacks for batched text updates
    streamingBuffer.onTextBatch = (sid, text) => {
      const cb = this._callbacksMap.get(sid);
      if (cb) cb.onText(text);
    };
    streamingBuffer.onThinkingBatch = (sid, text) => {
      const cb = this._callbacksMap.get(sid);
      if (cb) cb.onThinking(text);
    };

    // Set up event listener
    const unlisten = await listen<StreamChunk>("claude-stream", (event) => {
      const chunk = event.payload;

      // Only process chunks for this session
      if (chunk.session_id !== sessionId) {
        return;
      }

      const cb = this._callbacksMap.get(sessionId);
      if (!cb) return;

      const currentToolId = this._currentToolIdMap.get(sessionId);

      switch (chunk.chunk_type) {
        case "session_starting":
          cb.onSessionStarting();
          break;

        case "session_ready":
          this._sessionActiveMap.set(sessionId, true);
          // Parse init info from content (it's the full JSON) or from chunk fields
          // Map both claude_session_id and thread_id to providerSessionId
          let info: ClaudeSessionInfo = {
            model: chunk.model,
            providerSessionId: chunk.claude_session_id || chunk.thread_id,
            tools: chunk.tools,
            permissionMode: chunk.permission_mode,
          };
          if (chunk.content) {
            try {
              const initData = JSON.parse(chunk.content);
              info = {
                model: initData.model || chunk.model,
                providerSessionId: initData.session_id || chunk.claude_session_id || chunk.thread_id,
                tools: initData.tools || chunk.tools,
                cwd: initData.cwd,
                permissionMode: initData.permissionMode || chunk.permission_mode,
              };
            } catch (error) {
              // Use basic info from chunk fields
            }
          }
          cb.onSessionReady(info);
          break;

        case "session_ended":
          this._sessionActiveMap.delete(sessionId);
          cb.onSessionEnded(chunk.content || "Session ended");
          this.cleanupSession(sessionId);
          break;

        case "stderr":
          if (chunk.content) {
            cb.onError(`[stderr] ${chunk.content}`);
          }
          break;

        case "init":
          if (chunk.model) {
            cb.onInit(chunk.model, chunk.content || cwd, chunk.claude_session_id);
          }
          break;

        case "text":
          if (chunk.content) {
            // Buffer text for batching to reduce state update frequency
            streamingBuffer.appendText(sessionId, chunk.content);
          }
          break;

        case "thinking":
          if (chunk.content) {
            // Buffer thinking text for batching
            streamingBuffer.appendThinking(sessionId, chunk.content);
          }
          break;

        case "thinking_start":
          cb.onThinkingStart();
          break;

        case "tool_start":
        case "tool_use":
          if (chunk.tool_id) {
            // Flush any pending text BEFORE showing the tool card
            streamingBuffer.flushAll(sessionId);

            // Use tool name if available, otherwise extract from input or use placeholder
            const toolName = chunk.tool_name || "unknown_tool";
            this._currentToolIdMap.set(sessionId, chunk.tool_id);
            this._currentToolNameMap.set(sessionId, toolName);
            this._toolInputAccumulator.set(sessionId, chunk.tool_input || "");
            cb.onToolStart(toolName, chunk.tool_id);
            // If initial tool_input is provided, send it as delta so UI gets populated
            if (chunk.tool_input) {
              cb.onToolInputDelta(chunk.tool_id, chunk.tool_input);
            }
          }
          break;

        case "tool_input_delta":
          if (chunk.content && currentToolId) {
            // Accumulate input for AskUserQuestion detection
            const currentAccum = this._toolInputAccumulator.get(sessionId) || "";
            this._toolInputAccumulator.set(sessionId, currentAccum + chunk.content);
            cb.onToolInputDelta(currentToolId, chunk.content);
          }
          break;

        case "tool_result":
          if (chunk.tool_id) {
            cb.onToolResult(chunk.tool_id, chunk.content || "", chunk.tool_is_error);
            this._currentToolIdMap.set(sessionId, null);
          }
          break;

        case "block_end":
          cb.onThinkingEnd();
          if (currentToolId) {
            // Check if this was AskUserQuestion tool
            const toolName = this._currentToolNameMap.get(sessionId);
            if (toolName === "AskUserQuestion") {
              const accumulatedInput = this._toolInputAccumulator.get(sessionId) || "";
              try {
                const parsed = JSON.parse(accumulatedInput) as AskUserQuestionInput;
                cb.onAskUserQuestion(currentToolId, parsed);
              } catch (error) {
                console.error("[ClaudeService] Failed to parse AskUserQuestion input:", error);
              }
            }
            cb.onToolEnd(currentToolId);
            this._currentToolIdMap.set(sessionId, null);
            this._currentToolNameMap.set(sessionId, null);
            this._toolInputAccumulator.set(sessionId, "");
          }
          break;

        case "usage":
          cb.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            cacheReadTokens: chunk.cache_read_tokens,
            cacheWriteTokens: chunk.cache_write_tokens,
          });
          break;

        case "result":
          // Flush any pending text before result
          streamingBuffer.flushAll(sessionId);

          if (chunk.content) {
            cb.onResult(chunk.content);
          }
          // Pass isFinal=true for result events - these contain accurate final token counts
          cb.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            cacheReadTokens: chunk.cache_read_tokens,
            cacheWriteTokens: chunk.cache_write_tokens,
            costUsd: chunk.cost_usd,
            durationMs: chunk.duration_ms,
            durationApiMs: chunk.duration_api_ms,
            numTurns: chunk.num_turns,
            resultSubtype: chunk.subtype as 'success' | 'error_max_turns' | 'error_during_execution' | undefined,
            isError: chunk.is_error,
          }, true);
          break;

        case "error":
          if (chunk.content) {
            cb.onError(chunk.content);
          }
          break;

        case "raw":
          if (chunk.content) {
            cb.onText(chunk.content);
          }
          break;

        default:
          break;
      }
    });

    this._unlistenMap.set(sessionId, unlisten);

    try {
      // For manual mode, start MCP permission server first
      let mcpPermissionPort: number | undefined;
      if (permissionMode === "manual") {
        mcpPermissionPort = await this.startMcpPermissionServer(sessionId);
        await this.setupMcpPermissionListener(sessionId);
      }

      await invoke("start_claude_session", {
        cwd,
        sessionId,
        permissionMode,
        resumeSessionId,
        safeMode,
        mcpPermissionPort,
        model,
      });
    } catch (error) {
      console.error("[ClaudeService] start_claude_session FAILED:", error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  /** Stop a running Claude session */
  async stopSession(sessionId: string): Promise<void> {
    try {
      await invoke("stop_claude_session", { sessionId });
    } catch (error) {
      console.error("[ClaudeService] stopSession failed:", error);
    }
    this._sessionActiveMap.delete(sessionId);
    this.cleanupSession(sessionId);
  }

  /** Send a prompt to a running session */
  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    if (!this._sessionActiveMap.get(sessionId)) {
      throw new Error("Session not active. Start a session first.");
    }
    // Send prompt with newline to execute
    await invoke("send_claude_input", { sessionId, input: prompt + "\n" });
  }

  /** Send input to a running Claude session (formatted as JSON user message) */
  async sendInput(sessionId: string, input: string): Promise<void> {
    await invoke("send_claude_input", { sessionId, input });
  }

  /** Send raw input to a running Claude session (for tool approvals like "y" or "n") */
  async sendRawInput(sessionId: string, input: string): Promise<void> {
    await invoke("send_claude_raw_input", { sessionId, input });
  }

  /** Send a structured prompt with images and files to a running session */
  async sendStructuredPrompt(sessionId: string, prompt: StructuredPrompt): Promise<void> {
    if (!this._sessionActiveMap.get(sessionId)) {
      throw new Error("Session not active. Start a session first.");
    }
    await invoke("send_claude_structured_input", {
      sessionId,
      text: prompt.text,
      images: prompt.images,
      files: prompt.files,
    });
  }

  /** Check if a Claude session is active on backend */
  async checkSessionActive(sessionId: string): Promise<boolean> {
    return await invoke<boolean>("is_claude_session_active", { sessionId });
  }

  /** Get list of all active Claude sessions from backend */
  async getActiveSessions(): Promise<string[]> {
    return await invoke<string[]>("list_active_claude_sessions");
  }

  private cleanupSession(sessionId: string) {
    // Clear streaming buffer for this session
    streamingBuffer.clear(sessionId);

    this._currentToolIdMap.delete(sessionId);
    this._currentToolNameMap.delete(sessionId);
    this._toolInputAccumulator.delete(sessionId);
    this._callbacksMap.delete(sessionId);

    const unlisten = this._unlistenMap.get(sessionId);
    if (unlisten) {
      unlisten();
      this._unlistenMap.delete(sessionId);
    }

    // Clean up MCP permission resources
    const mcpUnlisten = this._mcpUnlistenMap.get(sessionId);
    if (mcpUnlisten) {
      mcpUnlisten();
      this._mcpUnlistenMap.delete(sessionId);
    }

    if (this._mcpPortMap.has(sessionId)) {
      this._mcpPortMap.delete(sessionId);
      // Stop the MCP permission server (fire and forget)
      this.stopMcpPermissionServer().catch(console.error);
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
      } catch (error) {
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
    } catch (error) {
      return false;
    }
  }
}

export const claudeService = new ClaudeService();
