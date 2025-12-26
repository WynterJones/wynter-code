import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import type { Session, Message, ClaudeModel, ToolCall, StreamingStats, PermissionMode, SessionType } from "@/types";
import type { PendingQuestion, PendingQuestionSet } from "@/components/output/AskUserQuestionBlock";

export interface ClaudeSessionInfo {
  model?: string;
  claudeSessionId?: string;
  tools?: string[];
  cwd?: string;
  status: "starting" | "ready" | "ended";
}

interface StreamingState {
  isStreaming: boolean;
  streamingText: string;
  thinkingText: string;
  pendingToolCalls: ToolCall[];
  stats: StreamingStats;
  pendingQuestion: PendingQuestion | null;
  pendingQuestionSet: PendingQuestionSet | null;
}

interface SessionStore {
  sessions: Map<string, Session[]>;
  activeSessionId: Map<string, string>;
  messages: Map<string, Message[]>;
  streamingState: Map<string, StreamingState>;
  claudeSessionState: Map<string, ClaudeSessionInfo>;

  createSession: (projectId: string, type?: SessionType, model?: ClaudeModel) => string;
  removeSession: (projectId: string, sessionId: string) => void;
  setActiveSession: (projectId: string, sessionId: string) => void;
  getSessionsForProject: (projectId: string) => Session[];
  getActiveSession: (projectId: string) => Session | undefined;

  addMessage: (
    sessionId: string,
    message: Omit<Message, "id" | "createdAt">
  ) => void;
  updateLastMessage: (sessionId: string, content: string) => void;
  getMessages: (sessionId: string) => Message[];
  clearMessages: (sessionId: string) => void;

  updateSessionModel: (sessionId: string, model: ClaudeModel) => void;
  updateSessionName: (sessionId: string, name: string) => void;
  updateSessionColor: (sessionId: string, color: string) => void;
  updateSessionPermissionMode: (sessionId: string, mode: PermissionMode) => void;
  updateClaudeSessionId: (sessionId: string, claudeSessionId: string) => void;
  getSession: (sessionId: string) => Session | undefined;

  // Streaming state
  startStreaming: (sessionId: string) => void;
  appendStreamingText: (sessionId: string, text: string) => void;
  appendThinkingText: (sessionId: string, text: string) => void;
  setThinking: (sessionId: string, isThinking: boolean) => void;
  setCurrentTool: (sessionId: string, toolName: string | undefined) => void;
  updateStats: (sessionId: string, stats: Partial<StreamingStats>) => void;
  addPendingToolCall: (sessionId: string, toolCall: ToolCall) => void;
  updateToolCallStatus: (
    sessionId: string,
    toolId: string,
    status: ToolCall["status"],
    output?: string
  ) => void;
  appendToolInput: (
    sessionId: string,
    toolId: string,
    partialJson: string
  ) => void;
  finishStreaming: (sessionId: string) => void;
  getStreamingState: (sessionId: string) => StreamingState;
  setPendingQuestion: (sessionId: string, question: PendingQuestion | null) => void;
  setPendingQuestionSet: (sessionId: string, questionSet: PendingQuestionSet | null) => void;

  // Claude session state (persistent CLI session)
  setClaudeSessionStarting: (sessionId: string) => void;
  setClaudeSessionReady: (sessionId: string, info: Partial<ClaudeSessionInfo>) => void;
  setClaudeSessionEnded: (sessionId: string) => void;
  getClaudeSessionState: (sessionId: string) => ClaudeSessionInfo | undefined;
  isClaudeSessionActive: (sessionId: string) => boolean;

  reset: () => void;
}

const defaultStats: StreamingStats = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  startTime: Date.now(),
  isThinking: false,
};

const defaultStreamingState: StreamingState = {
  isStreaming: false,
  streamingText: "",
  thinkingText: "",
  pendingToolCalls: [],
  stats: { ...defaultStats },
  pendingQuestion: null,
  pendingQuestionSet: null,
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: new Map(),
      activeSessionId: new Map(),
      messages: new Map(),
      streamingState: new Map(),
      claudeSessionState: new Map(),

      createSession: (
        projectId: string,
        type: SessionType = "claude",
        model: ClaudeModel = "claude-sonnet-4-20250514"
      ) => {
        const sessionId = uuid();
        const session: Session = {
          id: sessionId,
          projectId,
          name: type === "terminal" ? "Terminal" : "",
          type,
          model,
          claudeSessionId: null,
          isActive: true,
          createdAt: new Date(),
          permissionMode: "default",
        };

        set((state) => {
          const newSessions = new Map(state.sessions);
          const projectSessions = newSessions.get(projectId) || [];
          newSessions.set(projectId, [...projectSessions, session]);

          const newActiveSessionId = new Map(state.activeSessionId);
          newActiveSessionId.set(projectId, sessionId);

          return {
            sessions: newSessions,
            activeSessionId: newActiveSessionId,
          };
        });

        return sessionId;
      },

      removeSession: (projectId: string, sessionId: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          const projectSessions = (newSessions.get(projectId) || []).filter(
            (s) => s.id !== sessionId
          );
          newSessions.set(projectId, projectSessions);

          const newActiveSessionId = new Map(state.activeSessionId);
          if (state.activeSessionId.get(projectId) === sessionId) {
            newActiveSessionId.set(projectId, projectSessions[0]?.id || "");
          }

          const newMessages = new Map(state.messages);
          newMessages.delete(sessionId);

          const newStreamingState = new Map(state.streamingState);
          newStreamingState.delete(sessionId);

          return {
            sessions: newSessions,
            activeSessionId: newActiveSessionId,
            messages: newMessages,
            streamingState: newStreamingState,
          };
        });
      },

      setActiveSession: (projectId: string, sessionId: string) => {
        set((state) => {
          const newActiveSessionId = new Map(state.activeSessionId);
          newActiveSessionId.set(projectId, sessionId);
          return { activeSessionId: newActiveSessionId };
        });
      },

      getSessionsForProject: (projectId: string) => {
        return get().sessions.get(projectId) || [];
      },

      getActiveSession: (projectId: string) => {
        const sessions = get().sessions.get(projectId) || [];
        const activeId = get().activeSessionId.get(projectId);
        return sessions.find((s) => s.id === activeId);
      },

      addMessage: (
        sessionId: string,
        message: Omit<Message, "id" | "createdAt">
      ) => {
        set((state) => {
          const newMessages = new Map(state.messages);
          const sessionMessages = newMessages.get(sessionId) || [];
          newMessages.set(sessionId, [
            ...sessionMessages,
            {
              ...message,
              id: uuid(),
              createdAt: new Date(),
            },
          ]);
          return { messages: newMessages };
        });
      },

      updateLastMessage: (sessionId: string, content: string) => {
        set((state) => {
          const newMessages = new Map(state.messages);
          const sessionMessages = [...(newMessages.get(sessionId) || [])];
          if (sessionMessages.length > 0) {
            const lastMessage = sessionMessages[sessionMessages.length - 1];
            sessionMessages[sessionMessages.length - 1] = {
              ...lastMessage,
              content,
            };
            newMessages.set(sessionId, sessionMessages);
          }
          return { messages: newMessages };
        });
      },

      getMessages: (sessionId: string) => {
        return get().messages.get(sessionId) || [];
      },

      clearMessages: (sessionId: string) => {
        set((state) => {
          const newMessages = new Map(state.messages);
          newMessages.set(sessionId, []);
          return { messages: newMessages };
        });
      },

      updateSessionModel: (sessionId: string, model: ClaudeModel) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          for (const [projectId, sessions] of newSessions) {
            const updatedSessions = sessions.map((s) =>
              s.id === sessionId ? { ...s, model } : s
            );
            newSessions.set(projectId, updatedSessions);
          }
          return { sessions: newSessions };
        });
      },

      updateSessionName: (sessionId: string, name: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          for (const [projectId, sessions] of newSessions) {
            const updatedSessions = sessions.map((s) =>
              s.id === sessionId ? { ...s, name } : s
            );
            newSessions.set(projectId, updatedSessions);
          }
          return { sessions: newSessions };
        });
      },

      updateSessionColor: (sessionId: string, color: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          for (const [projectId, sessions] of newSessions) {
            const updatedSessions = sessions.map((s) =>
              s.id === sessionId ? { ...s, color } : s
            );
            newSessions.set(projectId, updatedSessions);
          }
          return { sessions: newSessions };
        });
      },

      updateSessionPermissionMode: (sessionId: string, mode: PermissionMode) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          for (const [projectId, sessions] of newSessions) {
            const updatedSessions = sessions.map((s) =>
              s.id === sessionId ? { ...s, permissionMode: mode } : s
            );
            newSessions.set(projectId, updatedSessions);
          }
          return { sessions: newSessions };
        });
      },

      updateClaudeSessionId: (sessionId: string, claudeSessionId: string) => {
        set((state) => {
          const newSessions = new Map(state.sessions);
          for (const [projectId, sessions] of newSessions) {
            const updatedSessions = sessions.map((s) =>
              s.id === sessionId ? { ...s, claudeSessionId } : s
            );
            newSessions.set(projectId, updatedSessions);
          }
          return { sessions: newSessions };
        });
      },

      getSession: (sessionId: string) => {
        for (const sessions of get().sessions.values()) {
          const session = sessions.find((s) => s.id === sessionId);
          if (session) return session;
        }
        return undefined;
      },

      // Streaming state methods
      startStreaming: (sessionId: string) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          newStreamingState.set(sessionId, {
            isStreaming: true,
            streamingText: "",
            thinkingText: "",
            pendingToolCalls: [],
            stats: { ...defaultStats, startTime: Date.now() },
            pendingQuestion: null,
            pendingQuestionSet: null,
          });
          return { streamingState: newStreamingState };
        });
      },

      appendStreamingText: (sessionId: string, text: string) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            streamingText: current.streamingText + text,
          });
          return { streamingState: newStreamingState };
        });
      },

      appendThinkingText: (sessionId: string, text: string) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            thinkingText: current.thinkingText + text,
          });
          return { streamingState: newStreamingState };
        });
      },

      setThinking: (sessionId: string, isThinking: boolean) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            stats: { ...current.stats, isThinking },
          });
          return { streamingState: newStreamingState };
        });
      },

      setCurrentTool: (sessionId: string, toolName: string | undefined) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            stats: { ...current.stats, currentTool: toolName },
          });
          return { streamingState: newStreamingState };
        });
      },

      updateStats: (sessionId: string, newStats: Partial<StreamingStats>) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            stats: { ...current.stats, ...newStats },
          });
          return { streamingState: newStreamingState };
        });
      },

      addPendingToolCall: (sessionId: string, toolCall: ToolCall) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          newStreamingState.set(sessionId, {
            ...current,
            pendingToolCalls: [...current.pendingToolCalls, toolCall],
          });
          return { streamingState: newStreamingState };
        });
      },

      updateToolCallStatus: (
        sessionId: string,
        toolId: string,
        status: ToolCall["status"],
        output?: string
      ) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          const updatedToolCalls = current.pendingToolCalls.map((tc) => {
            if (tc.id !== toolId) return tc;

            // Don't allow transitioning directly from "pending" to "completed"
            // This can happen when Claude CLI sends its own tool_result for permission handling
            // Only user approval (pending → running) or execution finish (running → completed) should work
            if (tc.status === "pending" && status === "completed") {
              console.log("[SessionStore] Blocked pending→completed transition for tool:", tc.name, "- output:", output?.substring(0, 100));
              return tc; // Keep as pending
            }

            return { ...tc, status, output };
          });
          newStreamingState.set(sessionId, {
            ...current,
            pendingToolCalls: updatedToolCalls,
          });
          return { streamingState: newStreamingState };
        });
      },

      appendToolInput: (
        sessionId: string,
        toolId: string,
        partialJson: string
      ) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || {
            ...defaultStreamingState,
          };
          const updatedToolCalls = current.pendingToolCalls.map((tc) => {
            if (tc.id === toolId) {
              // Accumulate the raw JSON string
              const existingRaw = (tc.input.raw as string) || "";
              const newRaw = existingRaw + partialJson;
              // Try to parse it
              let parsedInput: Record<string, unknown> = { raw: newRaw };
              try {
                parsedInput = JSON.parse(newRaw);
              } catch {
                // Not yet valid JSON, keep accumulating
              }
              return { ...tc, input: parsedInput };
            }
            return tc;
          });
          newStreamingState.set(sessionId, {
            ...current,
            pendingToolCalls: updatedToolCalls,
          });
          return { streamingState: newStreamingState };
        });
      },

      finishStreaming: (sessionId: string) => {
        const state = get();
        const streamingState =
          state.streamingState.get(sessionId) || defaultStreamingState;

        // Check for tool calls that are still pending approval - don't finish until approved
        const pendingApprovals = streamingState.pendingToolCalls.filter(
          (tc) => tc.status === "pending"
        );

        // If there are pending approvals, don't finish streaming yet
        if (pendingApprovals.length > 0) {
          console.log("[SessionStore] finishStreaming blocked - waiting for tool approvals:", pendingApprovals.map(tc => tc.name));
          return;
        }

        // If there's a pending question set (AskUserQuestion), don't finish yet
        if (streamingState.pendingQuestionSet) {
          console.log("[SessionStore] finishStreaming blocked - waiting for question response");
          return;
        }

        // If there's streaming text, convert it to a message
        if (streamingState.streamingText.trim()) {
          state.addMessage(sessionId, {
            sessionId,
            role: "assistant",
            content: streamingState.streamingText,
            toolCalls:
              streamingState.pendingToolCalls.length > 0
                ? streamingState.pendingToolCalls
                : undefined,
          });
        }

        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          newStreamingState.set(sessionId, { ...defaultStreamingState });
          return { streamingState: newStreamingState };
        });
      },

      getStreamingState: (sessionId: string) => {
        return get().streamingState.get(sessionId) || defaultStreamingState;
      },

      setPendingQuestion: (sessionId: string, question: PendingQuestion | null) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || { ...defaultStreamingState };
          newStreamingState.set(sessionId, {
            ...current,
            pendingQuestion: question,
          });
          return { streamingState: newStreamingState };
        });
      },

      setPendingQuestionSet: (sessionId: string, questionSet: PendingQuestionSet | null) => {
        set((state) => {
          const newStreamingState = new Map(state.streamingState);
          const current = newStreamingState.get(sessionId) || { ...defaultStreamingState };
          newStreamingState.set(sessionId, {
            ...current,
            pendingQuestionSet: questionSet,
          });
          return { streamingState: newStreamingState };
        });
      },

      // Claude session state methods
      setClaudeSessionStarting: (sessionId: string) => {
        set((state) => {
          const newClaudeSessionState = new Map(state.claudeSessionState);
          newClaudeSessionState.set(sessionId, { status: "starting" });
          return { claudeSessionState: newClaudeSessionState };
        });
      },

      setClaudeSessionReady: (sessionId: string, info: Partial<ClaudeSessionInfo>) => {
        set((state) => {
          const newClaudeSessionState = new Map(state.claudeSessionState);
          const current = newClaudeSessionState.get(sessionId) || { status: "starting" as const };
          newClaudeSessionState.set(sessionId, {
            ...current,
            ...info,
            status: "ready",
          });
          return { claudeSessionState: newClaudeSessionState };
        });
      },

      setClaudeSessionEnded: (sessionId: string) => {
        set((state) => {
          const newClaudeSessionState = new Map(state.claudeSessionState);
          newClaudeSessionState.delete(sessionId);
          return { claudeSessionState: newClaudeSessionState };
        });
      },

      getClaudeSessionState: (sessionId: string) => {
        return get().claudeSessionState.get(sessionId);
      },

      isClaudeSessionActive: (sessionId: string) => {
        const state = get().claudeSessionState.get(sessionId);
        return state?.status === "ready";
      },

      reset: () => {
        set({
          sessions: new Map(),
          activeSessionId: new Map(),
          messages: new Map(),
          streamingState: new Map(),
          claudeSessionState: new Map(),
        });
      },
    }),
    {
      name: "wynter-code-sessions",
      partialize: (state) => ({
        sessions: Array.from(state.sessions.entries()),
        activeSessionId: Array.from(state.activeSessionId.entries()),
        messages: Array.from(state.messages.entries()),
      }),
      merge: (persisted: unknown, current) => {
        const data = persisted as {
          sessions?: [string, Session[]][];
          activeSessionId?: [string, string][];
          messages?: [string, Message[]][];
        } | null;

        // Migrate old sessions to include new required fields
        const migratedSessions = new Map<string, Session[]>();
        if (data?.sessions) {
          for (const [projectId, sessions] of data.sessions) {
            const migrated = sessions.map((s) => ({
              ...s,
              type: s.type || "claude" as const,
              permissionMode: s.permissionMode || "default" as const,
              color: s.color || undefined,
            }));
            migratedSessions.set(projectId, migrated);
          }
        }

        return {
          ...current,
          sessions: migratedSessions,
          activeSessionId: new Map(data?.activeSessionId || []),
          messages: new Map(data?.messages || []),
          streamingState: new Map(),
        };
      },
    }
  )
);
