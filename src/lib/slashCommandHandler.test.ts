import { describe, it, expect } from "vitest";
import {
  extractCommandName,
  isCustomHandledCommand,
  isLocalOnlyCommand,
  parseCommandResponse,
} from "./slashCommandHandler";

describe("slashCommandHandler", () => {
  describe("extractCommandName", () => {
    it("extracts command name from valid slash command", () => {
      expect(extractCommandName("/help")).toBe("help");
      expect(extractCommandName("/clear")).toBe("clear");
      expect(extractCommandName("/context")).toBe("context");
    });

    it("handles commands with arguments", () => {
      expect(extractCommandName("/cost detailed")).toBe("cost");
      expect(extractCommandName("/status --verbose")).toBe("status");
    });

    it("handles leading/trailing whitespace", () => {
      expect(extractCommandName("  /help  ")).toBe("help");
      expect(extractCommandName("\t/clear\n")).toBe("clear");
    });

    it("returns lowercase command names", () => {
      expect(extractCommandName("/HELP")).toBe("help");
      expect(extractCommandName("/Clear")).toBe("clear");
      expect(extractCommandName("/CONTEXT")).toBe("context");
    });

    it("returns null for non-commands", () => {
      expect(extractCommandName("hello")).toBeNull();
      expect(extractCommandName("")).toBeNull();
      expect(extractCommandName("not a command")).toBeNull();
    });

    it("returns null for invalid command formats", () => {
      expect(extractCommandName("/ space")).toBeNull();
      expect(extractCommandName("/-dash")).toBeNull();
    });

    it("accepts numeric-only commands", () => {
      // The regex /^\/(\\w+)/ matches digits since \\w includes [0-9]
      expect(extractCommandName("/123")).toBe("123");
    });
  });

  describe("isCustomHandledCommand", () => {
    it("returns true for custom handled commands", () => {
      expect(isCustomHandledCommand("clear")).toBe(true);
      expect(isCustomHandledCommand("context")).toBe(true);
      expect(isCustomHandledCommand("cost")).toBe(true);
      expect(isCustomHandledCommand("usage")).toBe(true);
      expect(isCustomHandledCommand("status")).toBe(true);
      expect(isCustomHandledCommand("todos")).toBe(true);
    });

    it("returns false for non-custom commands", () => {
      expect(isCustomHandledCommand("help")).toBe(false);
      expect(isCustomHandledCommand("unknown")).toBe(false);
      expect(isCustomHandledCommand("commit")).toBe(false);
    });
  });

  describe("isLocalOnlyCommand", () => {
    it("returns true for local-only commands", () => {
      expect(isLocalOnlyCommand("clear")).toBe(true);
    });

    it("returns false for CLI commands", () => {
      expect(isLocalOnlyCommand("context")).toBe(false);
      expect(isLocalOnlyCommand("cost")).toBe(false);
      expect(isLocalOnlyCommand("usage")).toBe(false);
      expect(isLocalOnlyCommand("status")).toBe(false);
      expect(isLocalOnlyCommand("todos")).toBe(false);
    });

    it("returns false for unknown commands", () => {
      expect(isLocalOnlyCommand("unknown")).toBe(false);
      expect(isLocalOnlyCommand("help")).toBe(false);
    });
  });

  describe("parseCommandResponse", () => {
    describe("clear command", () => {
      it("returns clear response type", () => {
        const result = parseCommandResponse("clear", "");
        expect(result).toEqual({ type: "clear" });
      });
    });

    describe("context command", () => {
      it("parses context with items and calculates totals", () => {
        // When items are present, totalTokens is calculated from items
        const response = `Context: 50000 of 200000 tokens
  file.ts: 30000 tokens
  system: 20000 tokens`;
        const result = parseCommandResponse("context", response);

        expect(result).not.toBeNull();
        expect(result?.type).toBe("context");
        if (result?.type === "context") {
          expect(result.data.totalTokens).toBe(50000);
          expect(result.data.maxTokens).toBe(200000);
          expect(result.data.usedPercentage).toBe(25);
          expect(result.data.items.length).toBe(2);
        }
      });

      it("falls back to simple token extraction when no items", () => {
        // When no items are parsed, falls back to simple pattern matching
        const response = "Using 15000 tokens";
        const result = parseCommandResponse("context", response);

        if (result?.type === "context") {
          expect(result.data.totalTokens).toBe(15000);
          expect(result.data.items.length).toBe(0);
        }
      });

      it("parses context items with tokens", () => {
        const response = `Context: 10000 of 200000 tokens
  system_prompt.md: 5000 tokens
  conversation: 3000 tokens
  file.ts (2000 tokens)`;
        const result = parseCommandResponse("context", response);

        expect(result).not.toBeNull();
        if (result?.type === "context") {
          expect(result.data.items.length).toBe(3);
          expect(result.data.items[0].name).toBe("system_prompt.md");
          expect(result.data.items[0].tokens).toBe(5000);
        }
      });

      it("determines item types correctly", () => {
        const response = `  src/file.ts: 1000 tokens
  /path/to/dir/: 2000 tokens
  system prompt: 500 tokens
  conversation history: 300 tokens`;
        const result = parseCommandResponse("context", response);

        if (result?.type === "context") {
          const items = result.data.items;
          expect(items.find((i) => i.name.includes("file.ts"))?.type).toBe("file");
          expect(items.find((i) => i.name.includes("dir/"))?.type).toBe("directory");
          expect(items.find((i) => i.name.includes("system"))?.type).toBe("system");
          expect(items.find((i) => i.name.includes("conversation"))?.type).toBe("conversation");
        }
      });
    });

    describe("cost command", () => {
      it("parses cost with dollar amount", () => {
        const response = "Session cost: $0.25";
        const result = parseCommandResponse("cost", response);

        expect(result).not.toBeNull();
        if (result?.type === "cost") {
          expect(result.data.sessionTotal).toBe(0.25);
        }
      });

      it("parses cost with token breakdown", () => {
        const response = `Cost: $1.50
Input tokens: 10,000
Output tokens: 5,000
Cache read tokens: 2,000
Cache write tokens: 1,000`;
        const result = parseCommandResponse("cost", response);

        if (result?.type === "cost") {
          expect(result.data.sessionTotal).toBe(1.50);
          expect(result.data.inputTokens).toBe(10000);
          expect(result.data.outputTokens).toBe(5000);
          expect(result.data.cacheReadTokens).toBe(2000);
          expect(result.data.cacheWriteTokens).toBe(1000);
        }
      });
    });

    describe("usage command", () => {
      it("parses usage with token counts", () => {
        const response = `Input tokens: 5,000
Output tokens: 2,500`;
        const result = parseCommandResponse("usage", response);

        if (result?.type === "usage") {
          expect(result.data.inputTokens).toBe(5000);
          expect(result.data.outputTokens).toBe(2500);
          expect(result.data.totalTokens).toBe(7500);
        }
      });

      it("parses usage with cache tokens", () => {
        const response = `Input: 1000
Output: 500
Cache read: 200
Cache write: 100`;
        const result = parseCommandResponse("usage", response);

        if (result?.type === "usage") {
          expect(result.data.cacheReadTokens).toBe(200);
          expect(result.data.cacheWriteTokens).toBe(100);
          expect(result.data.totalTokens).toBe(1800);
        }
      });

      it("parses usage with turns and duration", () => {
        const response = `Turns: 5
Duration: 1500ms`;
        const result = parseCommandResponse("usage", response);

        if (result?.type === "usage") {
          expect(result.data.turns).toBe(5);
          expect(result.data.apiDurationMs).toBe(1500);
        }
      });

      it("converts duration in seconds to milliseconds", () => {
        const response = "Duration: 2.5s";
        const result = parseCommandResponse("usage", response);

        if (result?.type === "usage") {
          expect(result.data.apiDurationMs).toBe(2500);
        }
      });
    });

    describe("status command", () => {
      it("parses status with model and cwd", () => {
        const response = `Model: claude-3-opus
CWD: /home/user/project`;
        const result = parseCommandResponse("status", response);

        if (result?.type === "status") {
          expect(result.data.model).toBe("claude-3-opus");
          expect(result.data.cwd).toBe("/home/user/project");
          expect(result.data.isActive).toBe(true);
        }
      });

      it("parses status with permission mode", () => {
        const response = `Model: claude-3-sonnet
Permission mode: auto`;
        const result = parseCommandResponse("status", response);

        if (result?.type === "status") {
          expect(result.data.permissionMode).toBe("auto");
        }
      });

      it("parses status with tools list", () => {
        const response = `Model: test
Tools: read, write, execute`;
        const result = parseCommandResponse("status", response);

        if (result?.type === "status") {
          expect(result.data.tools).toContain("read");
          expect(result.data.tools).toContain("write");
          expect(result.data.tools).toContain("execute");
        }
      });

      it("parses status with MCP servers", () => {
        const response = `Model: test
MCP servers: server1, server2`;
        const result = parseCommandResponse("status", response);

        if (result?.type === "status") {
          expect(result.data.mcpServers).toContain("server1");
          expect(result.data.mcpServers).toContain("server2");
        }
      });
    });

    describe("todos command", () => {
      it("parses checkbox-style todos", () => {
        const response = `- [ ] Task 1
- [x] Task 2
- [ ] Task 3`;
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos.length).toBe(3);
          expect(result.data.todos[0]).toEqual({ content: "Task 1", status: "pending" });
          expect(result.data.todos[1]).toEqual({ content: "Task 2", status: "completed" });
          expect(result.data.todos[2]).toEqual({ content: "Task 3", status: "pending" });
          expect(result.data.completedCount).toBe(1);
          expect(result.data.totalCount).toBe(3);
        }
      });

      it("parses status prefix todos", () => {
        const response = `pending: First task
in_progress: Second task
completed: Third task`;
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos[0].status).toBe("pending");
          expect(result.data.todos[1].status).toBe("in_progress");
          expect(result.data.todos[2].status).toBe("completed");
        }
      });

      it("parses numbered list todos", () => {
        const response = `1. Regular task
2. [completed] Done task
3. [in_progress] Working task`;
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos.length).toBe(3);
          expect(result.data.todos[0].status).toBe("pending");
          expect(result.data.todos[1].status).toBe("completed");
          expect(result.data.todos[2].status).toBe("in_progress");
        }
      });

      it("handles empty todo list", () => {
        const response = "";
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos).toEqual([]);
          expect(result.data.completedCount).toBe(0);
          expect(result.data.totalCount).toBe(0);
        }
      });

      it("handles uppercase X in checkboxes", () => {
        const response = "- [X] Completed task";
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos[0].status).toBe("completed");
        }
      });

      it("handles 'done' status prefix", () => {
        const response = "done: Finished task";
        const result = parseCommandResponse("todos", response);

        if (result?.type === "todos") {
          expect(result.data.todos[0].status).toBe("completed");
        }
      });
    });

    describe("unknown command", () => {
      it("returns null for unknown commands", () => {
        const result = parseCommandResponse("help" as any, "some response");
        expect(result).toBeNull();
      });
    });
  });
});
