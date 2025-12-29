import { useState, useCallback, useRef, useEffect } from "react";
import { claudeService } from "@/services/claude";
import type { ClaudeSessionCallbacks } from "@/services/claude";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface UseAIAssistantReturn {
  messages: AIMessage[];
  streamingText: string;
  isStreaming: boolean;
  isSessionActive: boolean;
  sendPrompt: (prompt: string) => Promise<void>;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  clearMessages: () => void;
}

/**
 * Reusable AI assistant hook for simple chat functionality.
 * Unlike useKanbanAI, this doesn't parse actions - just provides a chat interface.
 *
 * @param sessionId - Unique identifier for the session
 * @param systemContext - Optional context to prepend to each prompt
 */
export function useAIAssistant(
  sessionId: string,
  systemContext?: string
): UseAIAssistantReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const sessionIdRef = useRef(sessionId);
  const cwdRef = useRef("/");
  const streamingTextRef = useRef("");

  // Update ref when sessionId changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const startSession = useCallback(async () => {
    // Check if session is active on backend and stop it first
    const isBackendActive = await claudeService.checkSessionActive(sessionIdRef.current);
    if (isSessionActive || isBackendActive) {
      console.log("[useAIAssistant] Session already active, stopping first...");
      try {
        await claudeService.stopSession(sessionIdRef.current);
        // Wait for backend to confirm session is stopped
        let attempts = 0;
        while (attempts < 10) {
          const stillActive = await claudeService.checkSessionActive(sessionIdRef.current);
          if (!stillActive) break;
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }
      } catch (err) {
        console.warn("[useAIAssistant] Error stopping existing session:", err);
      }
      setIsSessionActive(false);
    }

    const callbacks: ClaudeSessionCallbacks = {
      onSessionStarting: () => {
        console.log("[useAIAssistant] Session starting...");
      },
      onSessionReady: (info) => {
        console.log("[useAIAssistant] Session ready:", info);
        setIsSessionActive(true);
      },
      onSessionEnded: (reason) => {
        console.log("[useAIAssistant] Session ended:", reason);
        setIsSessionActive(false);
        setIsStreaming(false);
      },
      onText: (text) => {
        streamingTextRef.current += text;
        setStreamingText(streamingTextRef.current);
      },
      onThinking: () => {},
      onThinkingStart: () => {},
      onThinkingEnd: () => {},
      onToolStart: () => {},
      onToolInputDelta: () => {},
      onToolEnd: () => {},
      onToolResult: () => {},
      onAskUserQuestion: () => {},
      onInit: () => {},
      onUsage: () => {},
      onResult: (result) => {
        const fullText = streamingTextRef.current || result;

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: fullText,
            timestamp: Date.now(),
          },
        ]);

        streamingTextRef.current = "";
        setStreamingText("");
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error("[useAIAssistant] Error:", error);
        setIsStreaming(false);
      },
    };

    try {
      await claudeService.startSession(
        cwdRef.current,
        sessionIdRef.current,
        callbacks,
        "acceptEdits",
        undefined,
        true,
        undefined
      );
    } catch (error) {
      console.error("[useAIAssistant] Failed to start session:", error);
      throw error;
    }
  }, [isSessionActive]);

  const stopSession = useCallback(async () => {
    if (!isSessionActive) return;

    try {
      await claudeService.stopSession(sessionIdRef.current);
    } catch (error) {
      console.error("[useAIAssistant] Failed to stop session:", error);
    }

    setIsSessionActive(false);
    setIsStreaming(false);
    setStreamingText("");
  }, [isSessionActive]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      console.log("[useAIAssistant] sendPrompt called:", {
        isSessionActive,
        sessionId: sessionIdRef.current,
        promptLength: prompt.length,
      });

      if (!isSessionActive) {
        console.error("[useAIAssistant] Session not active!");
        throw new Error("Session not active");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: prompt,
          timestamp: Date.now(),
        },
      ]);

      setIsStreaming(true);
      streamingTextRef.current = "";
      setStreamingText("");

      // Build prompt with optional context
      const fullPrompt = systemContext
        ? `${systemContext}\n\nUser request: ${prompt}`
        : prompt;

      console.log("[useAIAssistant] Sending to claude service...");

      try {
        await claudeService.sendPrompt(sessionIdRef.current, fullPrompt);
        console.log("[useAIAssistant] sendPrompt succeeded");
      } catch (error) {
        console.error("[useAIAssistant] Failed to send prompt:", error);
        setIsStreaming(false);
        throw error;
      }
    },
    [isSessionActive, systemContext]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (claudeService.isSessionActive(sessionIdRef.current)) {
        claudeService.stopSession(sessionIdRef.current).catch(console.error);
      }
    };
  }, []);

  return {
    messages,
    streamingText,
    isStreaming,
    isSessionActive,
    sendPrompt,
    startSession,
    stopSession,
    clearMessages,
  };
}
