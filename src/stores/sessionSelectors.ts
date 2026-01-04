/**
 * Session Store Selectors
 *
 * Granular selector hooks that only subscribe to specific pieces of state.
 * Using these instead of useSessionStore() directly prevents unnecessary re-renders.
 */

import { useSessionStore, StreamingState, ClaudeSessionInfo } from './sessionStore';
import { useShallow } from 'zustand/shallow';
import type { Message, Session } from '@/types';

/**
 * Get streaming state for a specific session.
 * Only re-renders when this session's streaming state changes.
 */
export function useStreamingState(sessionId: string | undefined): StreamingState | null {
  return useSessionStore(
    useShallow((state) => (sessionId ? state.streamingState.get(sessionId) ?? null : null))
  );
}

/**
 * Get messages for a specific session.
 * Only re-renders when this session's messages change.
 */
export function useMessages(sessionId: string | undefined): Message[] {
  return useSessionStore(
    (state) => (sessionId ? state.messages.get(sessionId) ?? [] : [])
  );
}

/**
 * Get Claude session state (model, tools, etc).
 * Only re-renders when this session's Claude state changes.
 */
export function useClaudeSessionState(sessionId: string | undefined): ClaudeSessionInfo | undefined {
  return useSessionStore(
    useShallow((state) => (sessionId ? state.claudeSessionState.get(sessionId) : undefined))
  );
}

/**
 * Get the active session ID for a project.
 * Only re-renders when the active session changes.
 */
export function useActiveSessionId(projectId: string): string | undefined {
  return useSessionStore(
    (state) => state.activeSessionId.get(projectId)
  );
}

/**
 * Get all sessions for a project.
 * Only re-renders when sessions for this project change.
 */
export function useProjectSessions(projectId: string): Session[] {
  return useSessionStore(
    (state) => state.sessions.get(projectId) ?? []
  );
}

/**
 * Get the current active session object.
 * Only re-renders when the active session changes.
 */
export function useActiveSession(projectId: string): Session | undefined {
  return useSessionStore(
    useShallow((state) => {
      const activeId = state.activeSessionId.get(projectId);
      if (!activeId) return undefined;
      const sessions = state.sessions.get(projectId);
      return sessions?.find(s => s.id === activeId);
    })
  );
}

/**
 * Check if a Claude session is actively streaming.
 * Only re-renders when streaming status changes (not on every text update).
 */
export function useIsStreaming(sessionId: string | undefined): boolean {
  return useSessionStore(
    (state) => {
      if (!sessionId) return false;
      const streamingState = state.streamingState.get(sessionId);
      return streamingState?.isStreaming ?? false;
    }
  );
}

/**
 * Get context stats for a session.
 * Only re-renders when stats change.
 */
export function useContextStats(sessionId: string | undefined) {
  return useSessionStore(
    useShallow((state) => (sessionId ? state.sessionContextStats.get(sessionId) : undefined))
  );
}

/**
 * Get stable action references that never cause re-renders.
 * Use this for methods you need to call.
 */
export function useSessionActions() {
  return useSessionStore(
    useShallow((state) => ({
      createSession: state.createSession,
      removeSession: state.removeSession,
      setActiveSession: state.setActiveSession,
      addMessage: state.addMessage,
      updateLastMessage: state.updateLastMessage,
      clearMessages: state.clearMessages,
      updateSessionModel: state.updateSessionModel,
      updateSessionName: state.updateSessionName,
      updateSessionColor: state.updateSessionColor,
      updateSessionPermissionMode: state.updateSessionPermissionMode,
      updateSessionProvider: state.updateSessionProvider,
      updateProviderSessionId: state.updateProviderSessionId,
      startStreaming: state.startStreaming,
      appendStreamingText: state.appendStreamingText,
      appendThinkingText: state.appendThinkingText,
      setThinking: state.setThinking,
      setCurrentTool: state.setCurrentTool,
      updateStats: state.updateStats,
      addPendingToolCall: state.addPendingToolCall,
      updateToolCallStatus: state.updateToolCallStatus,
      appendToolInput: state.appendToolInput,
      finishStreaming: state.finishStreaming,
      setPendingQuestion: state.setPendingQuestion,
      setPendingQuestionSet: state.setPendingQuestionSet,
      setLastCommand: state.setLastCommand,
      setClaudeSessionStarting: state.setClaudeSessionStarting,
      setClaudeSessionReady: state.setClaudeSessionReady,
      setClaudeSessionEnded: state.setClaudeSessionEnded,
      clearContextStats: state.clearContextStats,
      reset: state.reset,
    }))
  );
}
