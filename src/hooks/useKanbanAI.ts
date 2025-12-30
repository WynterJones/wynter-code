import { useState, useCallback, useRef, useEffect } from "react";
import { claudeService } from "@/services/claude";
import { useKanbanStore } from "@/stores/kanbanStore";
import type { KanbanTask, KanbanStatus, KanbanPriority } from "@/types/kanban";
import type { ClaudeSessionCallbacks } from "@/services/claude";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface KanbanAction {
  type: "list_tasks" | "create_task" | "update_task" | "delete_task" | "move_task";
  status?: KanbanStatus;
  title?: string;
  priority?: KanbanPriority;
  description?: string;
  taskId?: string;
  newStatus?: KanbanStatus;
}

interface UseKanbanAIReturn {
  messages: AIMessage[];
  streamingText: string;
  isStreaming: boolean;
  isSessionActive: boolean;
  sendPrompt: (prompt: string) => Promise<void>;
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;
  clearMessages: () => void;
}

function serializeBoardState(workspaceId: string): string {
  const store = useKanbanStore.getState();
  const board = store.getBoard(workspaceId);

  const byStatus: Record<KanbanStatus, KanbanTask[]> = {
    backlog: [],
    doing: [],
    mvp: [],
    polished: [],
  };

  for (const task of board.tasks) {
    byStatus[task.status].push(task);
  }

  // Sort by order within each column
  for (const status of Object.keys(byStatus) as KanbanStatus[]) {
    byStatus[status].sort((a, b) => a.order - b.order);
  }

  const formatTasks = (tasks: KanbanTask[]) => {
    if (tasks.length === 0) return "  (empty)";
    return tasks.map(t =>
      `  - [${t.id.slice(0, 8)}] "${t.title}" (P${t.priority}${t.description ? `, desc: "${t.description}"` : ""})`
    ).join("\n");
  };

  return `
## Backlog
${formatTasks(byStatus.backlog)}

## Doing
${formatTasks(byStatus.doing)}

## MVP
${formatTasks(byStatus.mvp)}

## Polished
${formatTasks(byStatus.polished)}
`.trim();
}

function buildSystemPrompt(workspaceId: string): string {
  const boardState = serializeBoardState(workspaceId);

  return `You are a Kanban board assistant. Help users manage their tasks through natural language.

CURRENT BOARD STATE:
${boardState}

When the user asks you to perform actions on the board, respond conversationally AND include a JSON block with the actions to execute.

ACTION FORMAT:
\`\`\`json
{"actions": [{"type": "action_type", ...params}]}
\`\`\`

AVAILABLE ACTIONS:
- list_tasks: {type: "list_tasks", status?: "backlog"|"doing"|"mvp"|"polished"}
- create_task: {type: "create_task", title: string, priority: 0|1|2|3|4, status?: "backlog"|"doing"|"mvp"|"polished", description?: string}
- update_task: {type: "update_task", taskId: string, title?: string, priority?: 0|1|2|3|4, description?: string}
- delete_task: {type: "delete_task", taskId: string}
- move_task: {type: "move_task", taskId: string, newStatus: "backlog"|"doing"|"mvp"|"polished"}

PRIORITY LEVELS: 0=Urgent, 1=High, 2=Medium, 3=Low, 4=None (default: 2)
STATUS: Default is "backlog". Use the status the user specifies (e.g., "add to MVP" means status: "mvp")

IMPORTANT:
- Use the first 8 characters of task IDs when referencing tasks
- If unsure which task the user means, list matching tasks and ask for clarification
- Only include the JSON block when you need to execute actions
- Keep responses concise and helpful`;
}

function parseActions(text: string): KanbanAction[] {
  const actions: KanbanAction[] = [];

  // Find JSON blocks in the response
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/g;
  let match;

  while ((match = jsonBlockRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.actions && Array.isArray(parsed.actions)) {
        actions.push(...parsed.actions);
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  return actions;
}

export function useKanbanAI(workspaceId: string): UseKanbanAIReturn {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const sessionIdRef = useRef(`kanban-ai-${workspaceId}`);
  const cwdRef = useRef("/");
  const streamingTextRef = useRef("");

  const {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useKanbanStore();

  const executeActions = useCallback((actions: KanbanAction[]) => {
    for (const action of actions) {
      try {
        switch (action.type) {
          case "list_tasks":
            // This is informational, already shown in response
            break;

          case "create_task":
            if (action.title) {
              const taskId = createTask(
                workspaceId,
                action.title,
                action.priority ?? 2,
                action.description
              );
              // If a specific status was requested, move the task there
              if (action.status && action.status !== "backlog") {
                moveTask(workspaceId, taskId, action.status);
              }
            }
            break;

          case "update_task":
            if (action.taskId) {
              // Find full task ID from partial
              const allTasks = getTasks(workspaceId);
              const task = allTasks.find(t => t.id.startsWith(action.taskId!));
              if (task) {
                updateTask(workspaceId, task.id, {
                  title: action.title,
                  priority: action.priority,
                  description: action.description,
                });
              }
            }
            break;

          case "delete_task":
            if (action.taskId) {
              const allTasks = getTasks(workspaceId);
              const task = allTasks.find(t => t.id.startsWith(action.taskId!));
              if (task) {
                deleteTask(workspaceId, task.id);
              }
            }
            break;

          case "move_task":
            if (action.taskId && action.newStatus) {
              const allTasks = getTasks(workspaceId);
              const task = allTasks.find(t => t.id.startsWith(action.taskId!));
              if (task) {
                moveTask(workspaceId, task.id, action.newStatus);
              }
            }
            break;
        }
      } catch (error) {
        console.error("[useKanbanAI] Failed to execute action:", action, error);
      }
    }
  }, [workspaceId, getTasks, createTask, updateTask, deleteTask, moveTask]);

  const startSession = useCallback(async () => {
    if (isSessionActive) return;

    const callbacks: ClaudeSessionCallbacks = {
      onSessionStarting: () => {
      },
      onSessionReady: () => {
        setIsSessionActive(true);
      },
      onSessionEnded: (_reason) => {
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
        // Final result received - use ref to get accumulated text
        const fullText = streamingTextRef.current || result;

        // Parse and execute actions
        const actions = parseActions(fullText);
        if (actions.length > 0) {
          executeActions(actions);
        }

        // Add to messages
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: fullText,
          timestamp: Date.now(),
        }]);

        // Reset streaming state
        streamingTextRef.current = "";
        setStreamingText("");
        setIsStreaming(false);
      },
      onError: (error) => {
        console.error("[useKanbanAI] Error:", error);
        setIsStreaming(false);
      },
    };

    try {
      await claudeService.startSession(
        cwdRef.current,
        sessionIdRef.current,
        callbacks,
        "acceptEdits", // Permission mode
        undefined, // No resume
        true, // Safe mode
        undefined // Default model
      );
    } catch (error) {
      console.error("[useKanbanAI] Failed to start session:", error);
      throw error;
    }
  }, [isSessionActive, executeActions]);

  const stopSession = useCallback(async () => {
    if (!isSessionActive) return;

    try {
      await claudeService.stopSession(sessionIdRef.current);
    } catch (error) {
      console.error("[useKanbanAI] Failed to stop session:", error);
    }

    setIsSessionActive(false);
    setIsStreaming(false);
    setStreamingText("");
  }, [isSessionActive]);

  const sendPrompt = useCallback(async (prompt: string) => {
    if (!isSessionActive) {
      throw new Error("Session not active");
    }

    // Add user message
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    }]);

    setIsStreaming(true);
    streamingTextRef.current = "";
    setStreamingText("");

    // Build prompt with current board state
    const systemPrompt = buildSystemPrompt(workspaceId);
    const fullPrompt = `${systemPrompt}\n\nUser request: ${prompt}`;

    try {
      await claudeService.sendPrompt(sessionIdRef.current, fullPrompt);
    } catch (error) {
      console.error("[useKanbanAI] Failed to send prompt:", error);
      setIsStreaming(false);
      throw error;
    }
  }, [isSessionActive, workspaceId]);

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
