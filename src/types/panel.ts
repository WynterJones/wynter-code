/**
 * Multi-Panel Layout System Types
 *
 * Supports flexible panel layouts with horizontal/vertical splits.
 * Uses a binary tree structure where each split has exactly 2 children.
 */

/** Available panel content types */
export type PanelType =
  | "empty"
  | "claude-output"
  | "terminal"
  | "file-viewer"
  | "browser-preview";

/** Split direction for layout nodes */
export type SplitDirection = "horizontal" | "vertical";

/** Predefined layout template identifiers */
export type LayoutTemplateId =
  | "single"
  | "split-h"
  | "split-v"
  | "triple-h"
  | "triple-left"
  | "triple-right"
  | "quad"
  | "code-terminal";

/**
 * Binary tree node for layout structure.
 * Either a split (with 2 children) or a panel (leaf node).
 */
export interface LayoutNode {
  /** Unique identifier for this node */
  id: string;

  /** Node type - split has children, panel is a leaf */
  type: "split" | "panel";

  /** Split direction (only for split nodes) */
  direction?: SplitDirection;

  /** Split position ratio 0-1 (only for split nodes) */
  splitRatio?: number;

  /** Child nodes (only for split nodes, always exactly 2) */
  children?: [LayoutNode, LayoutNode];

  /** Panel ID reference (only for panel nodes) */
  panelId?: string;
}

/**
 * Individual panel instance state.
 * Each panel has its own independent session/terminal.
 */
export interface PanelState {
  /** Unique panel identifier */
  id: string;

  /** What type of content this panel displays */
  type: PanelType;

  /** Terminal PTY ID (for terminal panels) */
  terminalPtyId?: string;

  /** Session ID (for claude-output panels) */
  sessionId?: string;

  /** File path (for file-viewer panels) */
  filePath?: string;

  /** Browser URL (for browser-preview panels) */
  browserUrl?: string;

  /** Whether this panel has an active running process */
  hasRunningProcess: boolean;

  /** Whether this panel is currently focused */
  isFocused: boolean;

  /** Custom title override */
  title?: string;
}

/**
 * Complete layout state for a project.
 * Includes the layout tree and all panel instances.
 */
export interface PanelLayoutState {
  /** Root of the layout tree */
  layout: LayoutNode;

  /** All panel instances by ID */
  panels: Record<string, PanelState>;

  /** Currently active template */
  activeTemplateId: LayoutTemplateId;

  /** Currently focused panel ID */
  focusedPanelId: string | null;
}

/**
 * Layout template definition.
 * Users select from these predefined layouts.
 */
export interface LayoutTemplate {
  /** Unique template identifier */
  id: LayoutTemplateId;

  /** Display name */
  name: string;

  /** Lucide icon name */
  icon: string;

  /** Brief description */
  description: string;

  /** Default panel types for each position */
  defaultPanelTypes: PanelType[];

  /** Factory function to create the layout structure */
  createLayout: (panelIds: string[]) => LayoutNode;
}

/**
 * Panel type configuration.
 * Defines how each panel type behaves.
 */
export interface PanelTypeConfig {
  /** Panel type identifier */
  id: PanelType;

  /** Display name */
  name: string;

  /** Lucide icon name */
  icon: string;

  /** Default panel title */
  defaultTitle: string;

  /** Whether multiple instances are allowed */
  canHaveMultiple: boolean;

  /** Whether this type needs close confirmation */
  requiresProtection: boolean;
}

/**
 * Props passed to panel content components.
 */
export interface PanelContentProps {
  /** Panel instance ID */
  panelId: string;

  /** Project ID */
  projectId: string;

  /** Project path */
  projectPath: string;

  /** Panel state */
  panel: PanelState;

  /** Whether this panel is focused */
  isFocused: boolean;

  /** Callback when process state changes */
  onProcessStateChange: (running: boolean) => void;

  /** Callback to update panel state */
  onPanelUpdate: (updates: Partial<PanelState>) => void;
}

/**
 * Result of checking if a panel is safe to close.
 */
export interface PanelCloseCheck {
  /** Whether it's safe to close */
  safe: boolean;

  /** Reason why it's not safe (if applicable) */
  reason?: string;
}
