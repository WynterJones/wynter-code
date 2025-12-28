export interface SlashCommand {
  name: string; // e.g., "clear", "help"
  description: string;
  source: "builtin" | "project" | "personal";
  filePath?: string; // For custom commands
  argumentHint?: string; // e.g., "[file path]"
}
