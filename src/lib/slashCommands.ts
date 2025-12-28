import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";
import type { SlashCommand } from "@/types/slashCommand";

/**
 * Built-in Claude CLI slash commands (40+)
 * These are hardcoded as they're stable CLI commands
 */
export const BUILTIN_COMMANDS: SlashCommand[] = [
  // Session Management
  { name: "clear", description: "Clear conversation history", source: "builtin" },
  {
    name: "compact",
    description: "Compact conversation to save context",
    source: "builtin",
    argumentHint: "[instructions]",
  },
  { name: "exit", description: "Exit the session", source: "builtin" },
  {
    name: "resume",
    description: "Resume a previous session",
    source: "builtin",
    argumentHint: "[session]",
  },
  {
    name: "rename",
    description: "Rename current session",
    source: "builtin",
    argumentHint: "<name>",
  },
  { name: "rewind", description: "Rewind to earlier point", source: "builtin" },

  // Context & Files
  {
    name: "add-dir",
    description: "Add directory to context",
    source: "builtin",
    argumentHint: "[path]",
  },
  { name: "context", description: "Show current context usage", source: "builtin" },

  // Configuration
  { name: "config", description: "View/edit configuration", source: "builtin" },
  { name: "model", description: "Change the model", source: "builtin" },
  { name: "permissions", description: "View permission settings", source: "builtin" },
  {
    name: "output-style",
    description: "Change output format",
    source: "builtin",
    argumentHint: "[style]",
  },
  { name: "privacy-settings", description: "View privacy settings", source: "builtin" },

  // Tools & Extensions
  { name: "mcp", description: "Manage MCP servers", source: "builtin" },
  { name: "plugin", description: "Manage plugins", source: "builtin" },
  { name: "hooks", description: "View/manage hooks", source: "builtin" },
  { name: "agents", description: "List available agents", source: "builtin" },

  // Development
  { name: "init", description: "Initialize project config", source: "builtin" },
  { name: "ide", description: "IDE integration settings", source: "builtin" },
  { name: "terminal-setup", description: "Terminal configuration", source: "builtin" },
  { name: "sandbox", description: "Sandboxed execution mode", source: "builtin" },

  // Diagnostics
  { name: "doctor", description: "Run diagnostics", source: "builtin" },
  { name: "status", description: "Show session status", source: "builtin" },
  { name: "statusline", description: "Toggle status line", source: "builtin" },
  { name: "cost", description: "Show usage costs", source: "builtin" },
  { name: "usage", description: "Show token usage", source: "builtin" },
  { name: "stats", description: "Show session statistics", source: "builtin" },

  // Reviews & Analysis
  { name: "review", description: "Review code changes", source: "builtin" },
  { name: "pr-comments", description: "Review PR comments", source: "builtin" },
  { name: "security-review", description: "Security analysis", source: "builtin" },
  { name: "bug", description: "Report a bug", source: "builtin" },

  // Tasks & Todos
  { name: "todos", description: "View/manage todos", source: "builtin" },
  { name: "bashes", description: "View bash tasks", source: "builtin" },

  // Account & Auth
  { name: "login", description: "Log in to account", source: "builtin" },
  { name: "logout", description: "Log out of account", source: "builtin" },
  { name: "install-github-app", description: "Install GitHub app", source: "builtin" },

  // Info & Help
  { name: "help", description: "Show help", source: "builtin" },
  { name: "memory", description: "View memory/context", source: "builtin" },
  { name: "release-notes", description: "Show release notes", source: "builtin" },
  {
    name: "export",
    description: "Export conversation",
    source: "builtin",
    argumentHint: "[filename]",
  },

  // Mode flags
  { name: "vim", description: "Vim keybindings mode", source: "builtin" },
];

/**
 * Extract YAML frontmatter from markdown content
 */
function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result: Record<string, string> = {};

  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      // Remove surrounding quotes if present
      result[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return result;
}

/**
 * Scan a directory for custom command files
 */
async function scanDirectory(
  dirPath: string,
  source: "project" | "personal"
): Promise<SlashCommand[]> {
  try {
    const files = await invoke<string[]>("list_directory_files", {
      path: dirPath,
      extension: "md",
    });

    const commands: SlashCommand[] = [];
    for (const file of files) {
      try {
        // Read just the first 20 lines for frontmatter
        const content = await invoke<string>("read_file_head", {
          path: file,
          lines: 20,
        });

        // Extract name from filename (e.g., "push.md" -> "push")
        const name = file.split("/").pop()?.replace(".md", "") || "";

        // Parse YAML frontmatter for description
        const frontmatter = extractFrontmatter(content);

        commands.push({
          name,
          description: frontmatter.description || `Custom command: ${name}`,
          source,
          filePath: file,
          argumentHint: frontmatter["argument-hint"],
        });
      } catch {
        // Skip files that can't be read
      }
    }
    return commands;
  } catch {
    return []; // Directory doesn't exist or isn't readable
  }
}

/**
 * Scan .claude/commands/ directories for custom commands
 * @param projectPath - Current project path
 * @returns Array of custom SlashCommands
 */
export async function scanCustomCommands(projectPath: string): Promise<SlashCommand[]> {
  const commands: SlashCommand[] = [];

  // 1. Scan project commands: {projectPath}/.claude/commands/*.md
  const projectCommands = await scanDirectory(`${projectPath}/.claude/commands`, "project");
  commands.push(...projectCommands);

  // 2. Scan personal commands: ~/.claude/commands/*.md
  try {
    const home = await homeDir();
    const personalCommands = await scanDirectory(`${home}.claude/commands`, "personal");
    commands.push(...personalCommands);
  } catch {
    // Personal commands directory may not exist
  }

  return commands;
}

/**
 * Get all available commands (built-in + custom)
 * @param projectPath - Current project path for custom command scanning
 */
export async function getAllCommands(projectPath: string): Promise<SlashCommand[]> {
  const customCommands = await scanCustomCommands(projectPath);
  return [...BUILTIN_COMMANDS, ...customCommands];
}
