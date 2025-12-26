import type {
  LayoutTemplate,
  LayoutTemplateId,
  LayoutNode,
} from "@/types/panel";

/** Generate a unique node ID */
function nodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Create a panel node */
function panelNode(panelId: string): LayoutNode {
  return {
    id: nodeId(),
    type: "panel",
    panelId,
  };
}

/** Create a split node */
function splitNode(
  direction: "horizontal" | "vertical",
  ratio: number,
  left: LayoutNode,
  right: LayoutNode
): LayoutNode {
  return {
    id: nodeId(),
    type: "split",
    direction,
    splitRatio: ratio,
    children: [left, right],
  };
}

/** Create default single panel layout */
export function createDefaultLayout(panelIds: string[]): LayoutNode {
  return panelNode(panelIds[0]);
}

/**
 * Layout Templates
 *
 * Each template defines:
 * - Visual arrangement
 * - Default panel types
 * - Factory function to create the layout structure
 */
export const LAYOUT_TEMPLATES: Record<LayoutTemplateId, LayoutTemplate> = {
  /** Two panels side by side (horizontal split) */
  "split-h": {
    id: "split-h",
    name: "Split Horizontal",
    icon: "Columns2",
    description: "Two panels side by side",
    defaultPanelTypes: ["claude-output", "terminal"],
    createLayout: (panelIds) =>
      splitNode("horizontal", 0.5, panelNode(panelIds[0]), panelNode(panelIds[1])),
  },

  /** Two panels stacked (vertical split) */
  "split-v": {
    id: "split-v",
    name: "Split Vertical",
    icon: "Rows2",
    description: "Two panels stacked",
    defaultPanelTypes: ["claude-output", "terminal"],
    createLayout: (panelIds) =>
      splitNode("vertical", 0.6, panelNode(panelIds[0]), panelNode(panelIds[1])),
  },

  /** Three panels in columns */
  "triple-h": {
    id: "triple-h",
    name: "Triple Horizontal",
    icon: "Columns3",
    description: "Three equal columns",
    defaultPanelTypes: ["claude-output", "terminal", "file-viewer"],
    createLayout: (panelIds) =>
      splitNode(
        "horizontal",
        0.33,
        panelNode(panelIds[0]),
        splitNode("horizontal", 0.5, panelNode(panelIds[1]), panelNode(panelIds[2]))
      ),
  },

  /** Large left panel + 2 stacked right panels */
  "triple-left": {
    id: "triple-left",
    name: "Left Focus",
    icon: "PanelLeft",
    description: "Large left + 2 stacked right",
    defaultPanelTypes: ["claude-output", "terminal", "file-viewer"],
    createLayout: (panelIds) =>
      splitNode(
        "horizontal",
        0.6,
        panelNode(panelIds[0]),
        splitNode("vertical", 0.5, panelNode(panelIds[1]), panelNode(panelIds[2]))
      ),
  },

  /** 2 stacked left panels + large right panel */
  "triple-right": {
    id: "triple-right",
    name: "Right Focus",
    icon: "PanelRight",
    description: "2 stacked left + large right",
    defaultPanelTypes: ["terminal", "file-viewer", "claude-output"],
    createLayout: (panelIds) =>
      splitNode(
        "horizontal",
        0.4,
        splitNode("vertical", 0.5, panelNode(panelIds[0]), panelNode(panelIds[1])),
        panelNode(panelIds[2])
      ),
  },

  /** 2x2 grid of 4 panels */
  quad: {
    id: "quad",
    name: "Quad",
    icon: "LayoutGrid",
    description: "2x2 grid layout",
    defaultPanelTypes: ["claude-output", "terminal", "file-viewer", "browser-preview"],
    createLayout: (panelIds) =>
      splitNode(
        "vertical",
        0.5,
        splitNode("horizontal", 0.5, panelNode(panelIds[0]), panelNode(panelIds[1])),
        splitNode("horizontal", 0.5, panelNode(panelIds[2]), panelNode(panelIds[3]))
      ),
  },

  /** Code output on top (70%) + terminal on bottom (30%) */
  "code-terminal": {
    id: "code-terminal",
    name: "Code + Terminal",
    icon: "TerminalSquare",
    description: "Output on top, terminal below",
    defaultPanelTypes: ["claude-output", "terminal"],
    createLayout: (panelIds) =>
      splitNode("vertical", 0.7, panelNode(panelIds[0]), panelNode(panelIds[1])),
  },
};

/** Get all templates as an array for UI rendering */
export function getLayoutTemplateList(): LayoutTemplate[] {
  return Object.values(LAYOUT_TEMPLATES);
}

/** Get template by ID */
export function getLayoutTemplate(id: LayoutTemplateId): LayoutTemplate | undefined {
  return LAYOUT_TEMPLATES[id];
}
