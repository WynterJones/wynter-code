import type { PanelType, PanelTypeConfig } from "@/types/panel";

/**
 * Panel Type Registry
 *
 * Defines the configuration for each panel type including:
 * - Display metadata (name, icon, title)
 * - Behavior (can have multiple, requires protection)
 */
export const PANEL_TYPES: Record<PanelType, PanelTypeConfig> = {
  empty: {
    id: "empty",
    name: "Empty",
    icon: "Plus",
    defaultTitle: "New Panel",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "claude-output": {
    id: "claude-output",
    name: "Session GUI",
    icon: "MessageSquare",
    defaultTitle: "Session GUI",
    canHaveMultiple: false,
    requiresProtection: true, // Streaming responses need protection
  },

  terminal: {
    id: "terminal",
    name: "Terminal",
    icon: "Terminal",
    defaultTitle: "Terminal",
    canHaveMultiple: true,
    requiresProtection: true, // Running processes need protection
  },

  "file-browser": {
    id: "file-browser",
    name: "File Browser",
    icon: "FolderOpen",
    defaultTitle: "Files",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "file-viewer": {
    id: "file-viewer",
    name: "File Viewer",
    icon: "FileCode",
    defaultTitle: "File",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "markdown-viewer": {
    id: "markdown-viewer",
    name: "Markdown Viewer",
    icon: "FileText",
    defaultTitle: "Markdown",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "farmwork-stats": {
    id: "farmwork-stats",
    name: "Farmwork Stats",
    icon: "Tractor",
    defaultTitle: "Farmwork",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "browser-preview": {
    id: "browser-preview",
    name: "Browser Preview",
    icon: "Globe",
    defaultTitle: "Preview",
    canHaveMultiple: true,
    requiresProtection: false,
  },

  "youtube-embed": {
    id: "youtube-embed",
    name: "YouTube",
    icon: "Youtube",
    defaultTitle: "YouTube",
    canHaveMultiple: true,
    requiresProtection: false,
  },
};

/** Get all panel types as an array for UI rendering */
export function getPanelTypeList(): PanelTypeConfig[] {
  return Object.values(PANEL_TYPES);
}

/** Get panel type config by ID */
export function getPanelTypeConfig(type: PanelType): PanelTypeConfig {
  return PANEL_TYPES[type];
}

/** Get icon name for a panel type */
export function getPanelIcon(type: PanelType): string {
  return PANEL_TYPES[type]?.icon ?? "Square";
}

/** Get default title for a panel type */
export function getPanelDefaultTitle(type: PanelType): string {
  return PANEL_TYPES[type]?.defaultTitle ?? "Panel";
}

/** Check if panel type requires close protection */
export function requiresCloseProtection(type: PanelType): boolean {
  return PANEL_TYPES[type]?.requiresProtection ?? false;
}
