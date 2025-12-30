import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import type { StreamChunk, GeminiModel, StreamingStats, PermissionMode, ImageAttachment } from "@/types";

export interface GeminiSessionInfo {
  model?: string;
  cwd?: string;
}

export interface GeminiSessionCallbacks {
  onSessionStarting: () => void;
  onSessionReady: (info: GeminiSessionInfo) => void;
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

class GeminiService {
  private _currentModel: GeminiModel = "gemini-2.5-flash";

  // Per-session state Maps
  private _unlistenMap = new Map<string, UnlistenFn>();
  private _sessionActiveMap = new Map<string, boolean>();
  private _currentToolIdMap = new Map<string, string | null>();
  private _callbacksMap = new Map<string, GeminiSessionCallbacks>();
  private _isThinkingMap = new Map<string, boolean>();
  private _modelMap = new Map<string, GeminiModel>();

  setModel(model: GeminiModel) {
    this._currentModel = model;
  }

  get currentModel() {
    return this._currentModel;
  }

  /** Check if a specific session is active */
  isSessionActive(sessionId: string): boolean {
    return this._sessionActiveMap.get(sessionId) || false;
  }

  /** Start a Gemini CLI session */
  async startSession(
    cwd: string,
    sessionId: string,
    callbacks: GeminiSessionCallbacks,
    model?: string,
    permissionMode?: PermissionMode,
    safeMode?: boolean
  ): Promise<void> {
    if (this._sessionActiveMap.get(sessionId)) {
      console.error("[GeminiService] Session already active:", sessionId);
      throw new Error("Session already active");
    }

    // Store callbacks and model
    this._callbacksMap.set(sessionId, callbacks);
    this._currentToolIdMap.set(sessionId, null);
    this._modelMap.set(sessionId, (model as GeminiModel) || this._currentModel);

    // Set up event listener for gemini-stream
    const unlisten = await listen<StreamChunk>("gemini-stream", (event) => {
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
            cwd,
          });
          break;

        case "init":
          cb.onInit(chunk.model || "", cwd);
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
            cb.onThinking(chunk.content);
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
          cb.onUsage({
            inputTokens: chunk.input_tokens,
            outputTokens: chunk.output_tokens,
          });
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
          // Turn/prompt completed
          cb.onResult(chunk.content || "");
          // Extract usage from result if present - these are final values
          if (chunk.input_tokens || chunk.output_tokens) {
            cb.onUsage({
              inputTokens: chunk.input_tokens,
              outputTokens: chunk.output_tokens,
            }, true);
          }
          break;

        case "session_ended":
          this._sessionActiveMap.set(sessionId, false);
          cb.onSessionEnded(chunk.content || "Session ended");
          this.cleanupSession(sessionId);
          break;

        case "stderr":
          // Log stderr but don't show to user unless it's an error
          break;

        default:
          break;
      }
    });

    this._unlistenMap.set(sessionId, unlisten);

    try {
      await invoke("start_gemini_session", {
        cwd,
        sessionId,
        model: model || this._currentModel,
        permissionMode,
        safeMode,
      });
    } catch (error) {
      console.error("[GeminiService] start_gemini_session FAILED:", error);
      this.cleanupSession(sessionId);
      throw error;
    }
  }

  /** Stop a running Gemini session */
  async stopSession(sessionId: string): Promise<void> {
    try {
      await invoke("stop_gemini_session", { sessionId });
    } catch (error) {
      console.error("[GeminiService] stopSession failed:", error);
    }
    this._sessionActiveMap.delete(sessionId);
    this.cleanupSession(sessionId);
  }

  /** Send a prompt to a running session */
  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    if (!this._sessionActiveMap.get(sessionId)) {
      throw new Error("Session not active. Start a session first.");
    }
    // Gemini spawns a new process for each prompt
    await invoke("send_gemini_input", { sessionId, input: prompt, model: this._modelMap.get(sessionId) || this._currentModel });
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

    // Convert base64 images to temp file paths for Gemini -i flag
    const imagePaths: string[] = [];
    if (images && images.length > 0) {
      for (const img of images) {
        try {
          // Extract base64 data (remove data URL prefix if present)
          let base64Data = img.data;
          if (base64Data.startsWith("data:")) {
            base64Data = base64Data.split(",")[1] || base64Data;
          }
          const tempPath = await invoke<string>("save_temp_image", {
            base64Data,
            mediaType: img.mimeType,
          });
          imagePaths.push(tempPath);
        } catch (error) {
          console.error("[GeminiService] Failed to save image:", error);
        }
      }
    }

    // Send prompt with image paths
    await invoke("send_gemini_input", {
      sessionId,
      input: text,
      model: this._modelMap.get(sessionId) || this._currentModel,
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
    this._modelMap.delete(sessionId);
  }
}

export const geminiService = new GeminiService();
