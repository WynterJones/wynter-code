// Claude Code Manager types
export type ClaudeFileType = "command" | "skill" | "subagent";
export type ClaudeFileScope = "user" | "project";

export interface ClaudeFileFrontmatter {
  name?: string;
  description?: string;
  tools?: string;
  model?: string;
  permissionMode?: string;
  skills?: string;
  [key: string]: string | undefined;
}

export interface ClaudeFile {
  name: string;
  path: string;
  scope: ClaudeFileScope;
  type: ClaudeFileType;
  frontmatter: ClaudeFileFrontmatter;
  content: string;
  rawContent: string;
}

export interface ClaudeSettings {
  permissions?: {
    allow?: string[];
    ask?: string[];
    deny?: string[];
    additionalDirectories?: string[];
    defaultMode?: string;
  };
  env?: Record<string, string>;
  attribution?: {
    commit?: string;
    pr?: string;
  };
  model?: string;
  alwaysThinkingEnabled?: boolean;
  hooks?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}

export interface ClaudeVersionInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  lastChecked: number | null;
}
