import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { StreamChunk, CodexModel, StreamingStats, PermissionMode, ImageAttachment } from "@/types";

export interface CodexSessionInfo {
  model?: string;
  providerSessionId?: string; // thread_id for Codex
  tools?: string[];
  cwd?: string;
}

export interface CodexSessionCallbacks {
  onSessionStarting: () => void;
  onSessionReady: (info: CodexSessionInfo) => void;
  onSessionEnded: (reason: string) => void;
  onText: (text: string) => void;
  onThinking: (text: string) => void;
  onThinkingStart: () => void;
  onThinkingEnd: () => void;
  onToolStart: (toolName: string, toolId: string) => void;
  onToolInputDelta: (toolId: string, partialJson: string) => void;
  onToolEnd: (toolId: string) => void;
  onToolResult: (toolId: string, content: string, isError?: boolean) => void;
  onInit: (model: string, cwd: string, providerSessionId?: string) => void;
  onUsage: (stats: Partial<StreamingStats>, isFinal?: boolean) => void;
  onResult: (result: string) => void;
  onError: (error: string) => void;
}

class CodexService {
  private _currentModel: CodexModel = "gpt-5.2-codex";

  // Per-session state Maps
  private _unlistenMap = new Map<string, UnlistenFn>();
  private _sessionActiveMap = new Map<string, boolean>();
  private _currentToolIdMap = new Map<string, string | null>();
  private _callbacksMap = new Map<string, CodexSessionCallbacks>();
  private _isThinkingMap = new Map<string, boolean>();

  setModel(model: CodexModel) {
    this._currentModel = model;
  }

  get currentModel() {
    return this._currentModel;
  }

  /** Check if a specific session is active */
  isSessionActive(sessionId: string): boolean {
    return this._sessionActiveMap.get(sessionId) || false;
  }

  /** Start a persistent Codex session */
  async startSession(
    cwd: string,
    sessionId: string,
    callbacks: CodexSessionCallbacks,
    resumeThreadId?: string,
    model?: string,
    permissionMode?: PermissionMode,
    safeMode?: boolean
  ): Promise<void> {
    if (this._sessionActiveMap.get(sessionId)) {
      console.error("[CodexService] Session already active:", sessionId);
      throw new Error("Session already active");
    }

    // Store callbacks
    this._callbacksMap.set(sessionId, callbacks);
    this._currentToolIdMap.set(sessionId, null);

    // Set up event listener for codex-stream
    const unlisten = await listen<StreamChunk>("codex-stream", (event) => {
      const chunk = event.payload;

      // Only process chunks for this session
      if (chunk.session_id !== sessionId) {
        return;
      }

      const cb = this._callbacksMap.get(sessionId);
      if (!cb) return;

      switch (chunk.chunk_type) {
        case "session_starting":
          cb.onSessionStarting();
          break;

        case "session_ready":
          this._sessionActiveMap.set(sessionId, true);
          cb.onSessionReady({
            model: chunk.model,
            providerSessionId: chunk.thread_id,
            cwd,
          });
          break;

        case "init":
          cb.onInit(chunk.model || "", cwd, chunk.thread_id);
          break;

        case "text":
          // End thinking if we were thinking
          if (this._isThinkingMap.get(sessionId)) {
            cb.onThinkingEnd();
            this._isThinkingMap.set(sessionId, false);
          }
          if (chunk.content) {
            cb.onText(chunk.content);
          }
          break;

        case "thinking":
          if (chunk.content) {
            if (!this._isThinkingMap.get(sessionId)) {
              cb.onThinkingStart();
              this._isThinkingMap.set(sessionId, true);
            }
            // Format Codex reasoning items as bullet points (each item.completed is a discrete thought)
            cb.onThinking(`• ${chunk.content}\n`);
          }
          break;

        case "tool_start":
          // End thinking if we were thinking
          if (this._isThinkingMap.get(sessionId)) {
            cb.onThinkingEnd();
            this._isThinkingMap.set(sessionId, false);
          }
          if (chunk.tool_name && chunk.tool_id) {
            this._currentToolIdMap.set(sessionId, chunk.tool_id);
            cb.onToolStart(chunk.tool_name, chunk.tool_id);
            // If initial tool_input is provided, send it as delta so UI gets populated
            if (chunk.tool_input) {
              cb.onToolInputDelta(chunk.tool_id, chunk.tool_input);
            }
          }
          break;

        case "tool_result":
          if (chunk.tool_id) {
            cb.onToolResult(chunk.tool_id, chunk.content || "", chunk.tool_is_error);
            this._currentToolIdMap.set(sessionId, null);
          }
          break;

        case "usage":
          // For Codex, usage events come from turn.completed - these are final values
          cb.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
            cacheReadTokens: chunk.cache_read_tokens,
          }, true);
          break;

        case "turn_start":
          // Turn started - can be used for UI feedback
          break;

        case "error":
          if (chunk.content) {
            cb.onError(chunk.content);
          }
          break;

        case "result":
          // End thinking if we were thinking
          if (this._isThinkingMap.get(sessionId)) {
            cb.onThinkingEnd();
            this._isThinkingMap.set(sessionId, false);
          }
          // Turn/prompt completed - call onResult
          cb.onResult(chunk.content || "");
          break;

        case "session_ended":
          this._sessionActiveMap.set(sessionId, false);
          cb.onSessionEnded(chunk.content || "Session ended");
          this.cleanupSession(sessionId);
          break;

        case "stderr":
          // Log stderr but don't show to user unless it's an error
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
      await invoke("start_codex_session", {
        cwd,
        sessionId,
        resumeThreadId,
        model: model || this._currentModel,
        initialPrompt: null, // Will send initial prompt via sendPrompt
        permissionMode,
        safeMode,
      });
    } catch (error) {
      console.error("[CodexService] start_codex_session FAILED:", error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  /** Stop a running Codex session */
  async stopSession(sessionId: string): Promise<void> {
    try {
      await invoke("stop_codex_session", { sessionId });
    } catch (error) {
      console.error("[CodexService] stopSession failed:", error);
    }
    this._sessionActiveMap.delete(sessionId);
    this.cleanupSession(sessionId);
  }

  /** Send a prompt to a running session */
  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    if (!this._sessionActiveMap.get(sessionId)) {
      throw new Error("Session not active. Start a session first.");
    }
    // Codex spawns a new process for each prompt, passing model for consistency
    await invoke("send_codex_input", { sessionId, input: prompt, model: this._currentModel });
  }

  /** Send a structured prompt with images to a running session */
  async sendStructuredPrompt(
    sessionId: string,
    text: string,
    images?: ImageAttachment[]
  ): Promise<void> {
    if (!this._sessionActiveMap.get(sessionId)) {
      throw new Error("Session not active. Start a session first.");
    }

    // Convert base64 images to temp file paths for Codex -i flag
    const imagePaths: string[] = [];
    if (images && images.length > 0) {
      for (const img of images) {
        try {
          const tempPath = await invoke<string>("save_temp_image", {
            base64Data: img.data,
            mediaType: img.mimeType,
          });
          imagePaths.push(tempPath);
        } catch (error) {
          console.error("[CodexService] Failed to save image:", error);
        }
      }
    }

    // Send prompt with image paths
    await invoke("send_codex_input", {
      sessionId,
      input: text,
      model: this._currentModel,
      images: imagePaths.length > 0 ? imagePaths : null,
    });
  }

  /** Clean up session resources */
  private cleanupSession(sessionId: string): void {
    const unlisten = this._unlistenMap.get(sessionId);
    if (unlisten) {
      unlisten();
      this._unlistenMap.delete(sessionId);
    }
    this._callbacksMap.delete(sessionId);
    this._currentToolIdMap.delete(sessionId);
    this._sessionActiveMap.delete(sessionId);
    this._isThinkingMap.delete(sessionId);
  }
}

export const codexService = new CodexService();
