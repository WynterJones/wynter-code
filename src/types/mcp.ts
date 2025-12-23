export type McpScope = "global" | "project" | "project-local";

export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  scope: McpScope;
  isEnabled: boolean;
  projectPath?: string;
}

export interface McpServerInput {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  scope: McpScope;
  projectPath?: string;
}
