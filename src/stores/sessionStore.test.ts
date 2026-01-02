import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore } from "./sessionStore";

describe("sessionStore", () => {
  beforeEach(() => {
    useSessionStore.getState().reset();
  });

  describe("session management", () => {
    it("creates a session with default values", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      const session = store.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.projectId).toBe("project-1");
      expect(session?.type).toBe("claude");
      expect(session?.provider).toBe("claude");
      expect(session?.model).toBe("claude-sonnet-4-20250514");
      expect(session?.permissionMode).toBe("acceptEdits");
      expect(session?.isActive).toBe(true);
    });

    it("creates terminal session with correct name", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1", "terminal");

      const session = store.getSession(sessionId);
      expect(session?.name).toBe("Terminal");
      expect(session?.type).toBe("terminal");
    });

    it("creates codespace session with correct name", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1", "codespace");

      const session = store.getSession(sessionId);
      expect(session?.name).toBe("Codespace");
      expect(session?.type).toBe("codespace");
    });

    it("sets created session as active", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      const active = store.getActiveSession("project-1");
      expect(active?.id).toBe(sessionId);
    });

    it("removes session and cleans up related data", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.addMessage(sessionId, {
        sessionId,
        role: "user",
        content: "Hello",
      });

      store.removeSession("project-1", sessionId);

      expect(store.getSession(sessionId)).toBeUndefined();
      expect(store.getMessages(sessionId)).toEqual([]);
    });

    it("switches active session when removing current active", () => {
      const store = useSessionStore.getState();
      const session1 = store.createSession("project-1");
      const session2 = store.createSession("project-1");

      store.setActiveSession("project-1", session2);
      expect(store.getActiveSession("project-1")?.id).toBe(session2);

      store.removeSession("project-1", session2);
      expect(store.getActiveSession("project-1")?.id).toBe(session1);
    });

    it("reorders sessions correctly", () => {
      const store = useSessionStore.getState();
      const session1 = store.createSession("project-1");
      const session2 = store.createSession("project-1");
      const session3 = store.createSession("project-1");

      store.reorderSessions("project-1", 0, 2);

      const sessions = store.getSessionsForProject("project-1");
      expect(sessions[0].id).toBe(session2);
      expect(sessions[1].id).toBe(session3);
      expect(sessions[2].id).toBe(session1);
    });
  });

  describe("message handling", () => {
    it("adds messages to a session", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.addMessage(sessionId, {
        sessionId,
        role: "user",
        content: "Hello",
      });

      const messages = store.getMessages(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Hello");
      expect(messages[0].role).toBe("user");
      expect(messages[0].id).toBeDefined();
      expect(messages[0].createdAt).toBeDefined();
    });

    it("updates the last message content", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.addMessage(sessionId, {
        sessionId,
        role: "assistant",
        content: "Initial",
      });

      store.updateLastMessage(sessionId, "Updated");

      const messages = store.getMessages(sessionId);
      expect(messages[0].content).toBe("Updated");
    });

    it("clears messages for a session", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.addMessage(sessionId, {
        sessionId,
        role: "user",
        content: "Hello",
      });
      store.addMessage(sessionId, {
        sessionId,
        role: "assistant",
        content: "Hi",
      });

      store.clearMessages(sessionId);

      expect(store.getMessages(sessionId)).toEqual([]);
    });
  });

  describe("session updates", () => {
    it("updates session model", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateSessionModel(sessionId, "claude-opus-4-20250514");

      expect(store.getSession(sessionId)?.model).toBe("claude-opus-4-20250514");
    });

    it("updates session name", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateSessionName(sessionId, "My Session");

      expect(store.getSession(sessionId)?.name).toBe("My Session");
    });

    it("updates session color", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateSessionColor(sessionId, "#ff0000");

      expect(store.getSession(sessionId)?.color).toBe("#ff0000");
    });

    it("updates session permission mode", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateSessionPermissionMode(sessionId, "bypassPermissions");

      expect(store.getSession(sessionId)?.permissionMode).toBe(
        "bypassPermissions"
      );
    });

    it("updates session provider", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateSessionProvider(sessionId, "codex");

      expect(store.getSession(sessionId)?.provider).toBe("codex");
    });

    it("updates provider session id", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.updateProviderSessionId(sessionId, "provider-session-123");

      expect(store.getSession(sessionId)?.providerSessionId).toBe(
        "provider-session-123"
      );
    });
  });

  describe("streaming state", () => {
    it("initializes with default streaming state", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      const state = store.getStreamingState(sessionId);
      expect(state.isStreaming).toBe(false);
      expect(state.streamingText).toBe("");
      expect(state.thinkingText).toBe("");
      expect(state.pendingToolCalls).toEqual([]);
    });

    it("starts streaming correctly", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);

      const state = store.getStreamingState(sessionId);
      expect(state.isStreaming).toBe(true);
      expect(state.streamingText).toBe("");
      expect(state.stats.startTime).toBeDefined();
    });

    it("appends streaming text", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendStreamingText(sessionId, "Hello ");
      store.appendStreamingText(sessionId, "World");

      const state = store.getStreamingState(sessionId);
      expect(state.streamingText).toBe("Hello World");
    });

    it("appends thinking text", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendThinkingText(sessionId, "Thinking...");

      const state = store.getStreamingState(sessionId);
      expect(state.thinkingText).toBe("Thinking...");
    });

    it("sets thinking state", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.setThinking(sessionId, true);

      expect(store.getStreamingState(sessionId).stats.isThinking).toBe(true);
    });

    it("sets current tool", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.setCurrentTool(sessionId, "read_file");

      expect(store.getStreamingState(sessionId).stats.currentTool).toBe(
        "read_file"
      );
    });

    it("updates stats and accumulates context stats when final", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.updateStats(
        sessionId,
        {
          inputTokens: 100,
          outputTokens: 50,
          cacheReadTokens: 20,
          cacheWriteTokens: 10,
        },
        true
      );

      const contextStats = store.getContextStats(sessionId);
      expect(contextStats?.inputTokens).toBe(100);
      expect(contextStats?.outputTokens).toBe(50);

      store.updateStats(
        sessionId,
        {
          inputTokens: 200,
          outputTokens: 100,
        },
        true
      );

      const updatedStats = store.getContextStats(sessionId);
      expect(updatedStats?.inputTokens).toBe(300);
      expect(updatedStats?.outputTokens).toBe(150);
    });

    it("finishes streaming and creates message", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendStreamingText(sessionId, "Here is the response.");
      store.finishStreaming(sessionId);

      const messages = store.getMessages(sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe("Here is the response.");
      expect(messages[0].role).toBe("assistant");

      const state = store.getStreamingState(sessionId);
      expect(state.isStreaming).toBe(false);
      expect(state.streamingText).toBe("");
    });

    it("replaces trailing colon with period on finish", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendStreamingText(sessionId, "Here is the response:");
      store.finishStreaming(sessionId);

      const messages = store.getMessages(sessionId);
      expect(messages[0].content).toBe("Here is the response.");
    });

    it("does not finish streaming if pending approvals exist", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendStreamingText(sessionId, "Response");
      store.addPendingToolCall(sessionId, {
        id: "tool-1",
        name: "write_file",
        input: {},
        status: "pending",
      });

      store.finishStreaming(sessionId);

      const state = store.getStreamingState(sessionId);
      expect(state.isStreaming).toBe(true);
      expect(store.getMessages(sessionId)).toHaveLength(0);
    });
  });

  describe("tool calls", () => {
    it("adds pending tool calls", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.addPendingToolCall(sessionId, {
        id: "tool-1",
        name: "read_file",
        input: { path: "/test.txt" },
        status: "pending",
      });

      const state = store.getStreamingState(sessionId);
      expect(state.pendingToolCalls).toHaveLength(1);
      expect(state.pendingToolCalls[0].name).toBe("read_file");
    });

    it("updates tool call status", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.addPendingToolCall(sessionId, {
        id: "tool-1",
        name: "read_file",
        input: {},
        status: "pending",
      });

      store.updateToolCallStatus(sessionId, "tool-1", "running");
      expect(
        store.getStreamingState(sessionId).pendingToolCalls[0].status
      ).toBe("running");

      store.updateToolCallStatus(
        sessionId,
        "tool-1",
        "completed",
        "File content"
      );
      const toolCall = store.getStreamingState(sessionId).pendingToolCalls[0];
      expect(toolCall.status).toBe("completed");
      expect(toolCall.output).toBe("File content");
    });

    it("prevents pending to completed transition", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.addPendingToolCall(sessionId, {
        id: "tool-1",
        name: "write_file",
        input: {},
        status: "pending",
      });

      store.updateToolCallStatus(sessionId, "tool-1", "completed");

      expect(
        store.getStreamingState(sessionId).pendingToolCalls[0].status
      ).toBe("pending");
    });

    it("appends tool input progressively", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.addPendingToolCall(sessionId, {
        id: "tool-1",
        name: "write_file",
        input: { raw: "" },
        status: "pending",
      });

      store.appendToolInput(sessionId, "tool-1", '{"path":');
      store.appendToolInput(sessionId, "tool-1", '"/test.txt"}');

      const toolCall = store.getStreamingState(sessionId).pendingToolCalls[0];
      expect(toolCall.input.path).toBe("/test.txt");
    });
  });

  describe("claude session state", () => {
    it("tracks session starting state", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.setClaudeSessionStarting(sessionId);

      const state = store.getClaudeSessionState(sessionId);
      expect(state?.status).toBe("starting");
      expect(store.isClaudeSessionActive(sessionId)).toBe(false);
    });

    it("tracks session ready state with info", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.setClaudeSessionStarting(sessionId);
      store.setClaudeSessionReady(sessionId, {
        model: "claude-sonnet-4-20250514",
        tools: ["read_file", "write_file"],
        permissionMode: "acceptEdits",
      });

      const state = store.getClaudeSessionState(sessionId);
      expect(state?.status).toBe("ready");
      expect(state?.model).toBe("claude-sonnet-4-20250514");
      expect(state?.tools).toEqual(["read_file", "write_file"]);
      expect(store.isClaudeSessionActive(sessionId)).toBe(true);
    });

    it("removes session state when ended", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.setClaudeSessionStarting(sessionId);
      store.setClaudeSessionReady(sessionId, {});
      store.setClaudeSessionEnded(sessionId);

      expect(store.getClaudeSessionState(sessionId)).toBeUndefined();
      expect(store.isClaudeSessionActive(sessionId)).toBe(false);
    });
  });

  describe("pending questions", () => {
    it("sets and clears pending question", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.setPendingQuestion(sessionId, {
        id: "q1",
        question: "Do you want to proceed?",
        options: [],
        multiSelect: false,
      });

      expect(
        store.getStreamingState(sessionId).pendingQuestion?.question
      ).toBe("Do you want to proceed?");

      store.setPendingQuestion(sessionId, null);
      expect(store.getStreamingState(sessionId).pendingQuestion).toBeNull();
    });

    it("sets and clears pending question set", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.setPendingQuestionSet(sessionId, {
        id: "set-1",
        toolId: "tool-1",
        questions: [],
      });

      expect(
        store.getStreamingState(sessionId).pendingQuestionSet?.toolId
      ).toBe("tool-1");

      store.setPendingQuestionSet(sessionId, null);
      expect(store.getStreamingState(sessionId).pendingQuestionSet).toBeNull();
    });

    it("does not finish streaming with pending question set", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.appendStreamingText(sessionId, "Response");
      store.setPendingQuestionSet(sessionId, {
        id: "set-1",
        toolId: "tool-1",
        questions: [],
      });

      store.finishStreaming(sessionId);

      expect(store.getStreamingState(sessionId).isStreaming).toBe(true);
    });
  });

  describe("context stats", () => {
    it("clears context stats", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");

      store.startStreaming(sessionId);
      store.updateStats(sessionId, { inputTokens: 100 }, true);

      store.clearContextStats(sessionId);

      expect(store.getContextStats(sessionId)).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("resets all state", () => {
      const store = useSessionStore.getState();
      const sessionId = store.createSession("project-1");
      store.addMessage(sessionId, {
        sessionId,
        role: "user",
        content: "Hello",
      });
      store.startStreaming(sessionId);
      store.setClaudeSessionStarting(sessionId);

      store.reset();

      expect(store.getSessionsForProject("project-1")).toEqual([]);
      expect(store.getActiveSession("project-1")).toBeUndefined();
      expect(store.getMessages(sessionId)).toEqual([]);
      expect(store.getStreamingState(sessionId).isStreaming).toBe(false);
      expect(store.getClaudeSessionState(sessionId)).toBeUndefined();
    });
  });
});
