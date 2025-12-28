import type {
  CustomHandledCommand,
  SlashCommandResponse,
  ContextResponse,
  CostResponse,
  UsageResponse,
  StatusResponse,
  TodosResponse,
  ContextItem,
  TodoItem,
} from "@/types/slashCommandResponse";
import { LOCAL_ONLY_COMMANDS, CUSTOM_UI_COMMANDS } from "@/types/slashCommandResponse";

/**
 * All commands with custom handling
 */
export const ALL_CUSTOM_COMMANDS: CustomHandledCommand[] = [
  ...LOCAL_ONLY_COMMANDS,
  ...CUSTOM_UI_COMMANDS,
];

/**
 * Extract command name from a prompt string
 */
export function extractCommandName(prompt: string): string | null {
  const match = prompt.trim().match(/^\/(\w+)/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Check if a prompt is a slash command
 */
export function isSlashCommand(prompt: string): boolean {
  return prompt.trim().startsWith("/");
}

/**
 * Check if command should be handled with custom UI
 */
export function isCustomHandledCommand(
  commandName: string
): commandName is CustomHandledCommand {
  return ALL_CUSTOM_COMMANDS.includes(commandName as CustomHandledCommand);
}

/**
 * Check if command should be handled locally (no CLI call)
 */
export function isLocalOnlyCommand(commandName: string): boolean {
  return LOCAL_ONLY_COMMANDS.includes(commandName as CustomHandledCommand);
}

/**
 * Parse CLI response for custom commands
 * Returns null if parsing fails (caller should fall back to raw text)
 */
export function parseCommandResponse(
  command: CustomHandledCommand,
  response: string
): SlashCommandResponse | null {
  try {
    switch (command) {
      case "clear":
        return { type: "clear" };
      case "context":
        return parseContextResponse(response);
      case "cost":
        return parseCostResponse(response);
      case "usage":
        return parseUsageResponse(response);
      case "status":
        return parseStatusResponse(response);
      case "todos":
        return parseTodosResponse(response);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Parse /context response
 * Format varies but typically shows context items with token counts
 */
function parseContextResponse(text: string): SlashCommandResponse | null {
  const items: ContextItem[] = [];
  let totalTokens = 0;
  let maxTokens = 200000; // Default context window

  // Try to extract total/max from text
  const totalMatch = text.match(/(\d[\d,]*)\s*(?:\/|of)\s*(\d[\d,]*)\s*tokens?/i);
  if (totalMatch) {
    totalTokens = parseInt(totalMatch[1].replace(/,/g, ""));
    maxTokens = parseInt(totalMatch[2].replace(/,/g, ""));
  }

  // Extract individual items - look for patterns like "filename: 1234 tokens" or "filename (1234)"
  const lines = text.split("\n");
  for (const line of lines) {
    // Pattern: "  filename.ts: 1234 tokens" or "filename (1,234 tokens)"
    const itemMatch = line.match(/^\s*(.+?)(?::\s*|\s*\()\s*([\d,]+)\s*(?:tokens?|\))/i);
    if (itemMatch) {
      const name = itemMatch[1].trim();
      const tokens = parseInt(itemMatch[2].replace(/,/g, ""));

      // Determine type based on name
      let type: ContextItem["type"] = "unknown";
      if (name.includes("/") || name.includes(".")) {
        type = name.endsWith("/") ? "directory" : "file";
      } else if (name.toLowerCase().includes("system") || name.toLowerCase().includes("prompt")) {
        type = "system";
      } else if (name.toLowerCase().includes("conversation") || name.toLowerCase().includes("message")) {
        type = "conversation";
      }

      items.push({
        type,
        name,
        tokens,
        percentage: maxTokens > 0 ? (tokens / maxTokens) * 100 : 0,
      });

      if (!totalMatch) {
        totalTokens += tokens;
      }
    }
  }

  // If no items parsed, try to at least get totals
  if (items.length === 0) {
    const tokenMatch = text.match(/(\d[\d,]*)\s*tokens?/i);
    if (tokenMatch) {
      totalTokens = parseInt(tokenMatch[1].replace(/,/g, ""));
    }
  }

  const data: ContextResponse = {
    totalTokens,
    maxTokens,
    usedPercentage: maxTokens > 0 ? (totalTokens / maxTokens) * 100 : 0,
    items,
  };

  return { type: "context", data };
}

/**
 * Parse /cost response
 */
function parseCostResponse(text: string): SlashCommandResponse | null {
  let sessionTotal = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens: number | undefined;
  let cacheWriteTokens: number | undefined;

  // Look for cost in dollars
  const costMatch = text.match(/\$?([\d.]+)/);
  if (costMatch) {
    sessionTotal = parseFloat(costMatch[1]);
  }

  // Extract token counts
  const inputMatch = text.match(/input(?:\s+tokens?)?:\s*([\d,]+)/i);
  const outputMatch = text.match(/output(?:\s+tokens?)?:\s*([\d,]+)/i);
  const cacheReadMatch = text.match(/cache\s*read(?:\s+tokens?)?:\s*([\d,]+)/i);
  const cacheWriteMatch = text.match(/cache\s*write(?:\s+tokens?)?:\s*([\d,]+)/i);

  if (inputMatch) inputTokens = parseInt(inputMatch[1].replace(/,/g, ""));
  if (outputMatch) outputTokens = parseInt(outputMatch[1].replace(/,/g, ""));
  if (cacheReadMatch) cacheReadTokens = parseInt(cacheReadMatch[1].replace(/,/g, ""));
  if (cacheWriteMatch) cacheWriteTokens = parseInt(cacheWriteMatch[1].replace(/,/g, ""));

  const data: CostResponse = {
    sessionTotal,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
  };

  return { type: "cost", data };
}

/**
 * Parse /usage response
 */
function parseUsageResponse(text: string): SlashCommandResponse | null {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens: number | undefined;
  let cacheWriteTokens: number | undefined;
  let turns: number | undefined;
  let apiDurationMs: number | undefined;

  // Extract token counts
  const inputMatch = text.match(/input(?:\s+tokens?)?:\s*([\d,]+)/i);
  const outputMatch = text.match(/output(?:\s+tokens?)?:\s*([\d,]+)/i);
  const cacheReadMatch = text.match(/cache\s*read(?:\s+tokens?)?:\s*([\d,]+)/i);
  const cacheWriteMatch = text.match(/cache\s*write(?:\s+tokens?)?:\s*([\d,]+)/i);
  const turnsMatch = text.match(/turns?:\s*(\d+)/i);
  const durationMatch = text.match(/duration:\s*([\d.]+)\s*(?:ms|s)/i);

  if (inputMatch) inputTokens = parseInt(inputMatch[1].replace(/,/g, ""));
  if (outputMatch) outputTokens = parseInt(outputMatch[1].replace(/,/g, ""));
  if (cacheReadMatch) cacheReadTokens = parseInt(cacheReadMatch[1].replace(/,/g, ""));
  if (cacheWriteMatch) cacheWriteTokens = parseInt(cacheWriteMatch[1].replace(/,/g, ""));
  if (turnsMatch) turns = parseInt(turnsMatch[1]);
  if (durationMatch) {
    const val = parseFloat(durationMatch[1]);
    apiDurationMs = durationMatch[0].includes("s") && !durationMatch[0].includes("ms") ? val * 1000 : val;
  }

  const totalTokens = inputTokens + outputTokens + (cacheReadTokens || 0) + (cacheWriteTokens || 0);

  const data: UsageResponse = {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    totalTokens,
    turns,
    apiDurationMs,
  };

  return { type: "usage", data };
}

/**
 * Parse /status response
 */
function parseStatusResponse(text: string): SlashCommandResponse | null {
  let model = "unknown";
  let cwd = "";
  let permissionMode: string | undefined;
  const tools: string[] = [];
  const mcpServers: string[] = [];

  // Extract model
  const modelMatch = text.match(/model:\s*(.+?)(?:\n|$)/i);
  if (modelMatch) model = modelMatch[1].trim();

  // Extract working directory
  const cwdMatch = text.match(/(?:cwd|directory|working):\s*(.+?)(?:\n|$)/i);
  if (cwdMatch) cwd = cwdMatch[1].trim();

  // Extract permission mode
  const permMatch = text.match(/permission(?:\s*mode)?:\s*(.+?)(?:\n|$)/i);
  if (permMatch) permissionMode = permMatch[1].trim();

  // Extract tools (comma or newline separated)
  const toolsMatch = text.match(/tools?:\s*(.+?)(?:\n\n|$)/is);
  if (toolsMatch) {
    const toolsText = toolsMatch[1];
    const toolList = toolsText.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
    tools.push(...toolList);
  }

  // Extract MCP servers
  const mcpMatch = text.match(/mcp\s*servers?:\s*(.+?)(?:\n\n|$)/is);
  if (mcpMatch) {
    const mcpText = mcpMatch[1];
    const mcpList = mcpText.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    mcpServers.push(...mcpList);
  }

  const data: StatusResponse = {
    model,
    cwd,
    permissionMode,
    tools,
    mcpServers: mcpServers.length > 0 ? mcpServers : undefined,
    isActive: true,
  };

  return { type: "status", data };
}

/**
 * Parse /todos response
 */
function parseTodosResponse(text: string): SlashCommandResponse | null {
  const todos: TodoItem[] = [];

  // Look for todo items with status indicators
  // Patterns: "- [ ] task", "- [x] task", "[ ] task", "[x] task", "pending: task", etc.
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Checkbox patterns
    const checkboxMatch = trimmed.match(/^[-*]?\s*\[([ xX])\]\s*(.+)/);
    if (checkboxMatch) {
      const status = checkboxMatch[1].toLowerCase() === "x" ? "completed" : "pending";
      todos.push({ content: checkboxMatch[2].trim(), status });
      continue;
    }

    // Status prefix patterns
    const statusMatch = trimmed.match(/^(pending|in_progress|completed|done|todo):\s*(.+)/i);
    if (statusMatch) {
      let status: TodoItem["status"] = "pending";
      const statusText = statusMatch[1].toLowerCase();
      if (statusText === "completed" || statusText === "done") {
        status = "completed";
      } else if (statusText === "in_progress") {
        status = "in_progress";
      }
      todos.push({ content: statusMatch[2].trim(), status });
      continue;
    }

    // Numbered list with status
    const numberedMatch = trimmed.match(/^\d+\.\s*(.+)/);
    if (numberedMatch) {
      // Check for status indicators in content
      const content = numberedMatch[1];
      let status: TodoItem["status"] = "pending";
      if (content.includes("[completed]") || content.includes("[done]")) {
        status = "completed";
      } else if (content.includes("[in_progress]") || content.includes("[in progress]")) {
        status = "in_progress";
      }
      todos.push({ content: content.replace(/\[.*?\]/g, "").trim(), status });
    }
  }

  const completedCount = todos.filter((t) => t.status === "completed").length;

  const data: TodosResponse = {
    todos,
    completedCount,
    totalCount: todos.length,
  };

  return { type: "todos", data };
}

// Re-export types for convenience
export type { CustomHandledCommand, SlashCommandResponse };
