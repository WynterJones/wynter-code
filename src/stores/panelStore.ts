import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PanelLayoutState,
  PanelState,
  PanelType,
  LayoutNode,
  LayoutTemplateId,
} from "@/types/panel";
import { LAYOUT_TEMPLATES } from "@/components/panels/layoutTemplates";

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a default panel state */
function createDefaultPanel(type: PanelType): PanelState {
  return {
    id: generateId(),
    type,
    hasRunningProcess: false,
    isFocused: false,
  };
}

/** Default layout state for new projects */
function createDefaultLayoutState(): PanelLayoutState {
  const template = LAYOUT_TEMPLATES["split-h"];
  const panels: Record<string, PanelState> = {};
  const panelIds: string[] = [];

  template.defaultPanelTypes.forEach((type) => {
    const panel = createDefaultPanel(type);
    panels[panel.id] = panel;
    panelIds.push(panel.id);
  });

  return {
    layout: template.createLayout(panelIds),
    panels,
    activeTemplateId: "split-h",
    focusedPanelId: panelIds[0] || null,
  };
}

/** Create a layout key from project and optional session */
function getLayoutKey(projectId: string, sessionId?: string): string {
  return sessionId ? `${projectId}:${sessionId}` : projectId;
}

interface PanelStore {
  /** Per-project or per-session layout states */
  layouts: Map<string, PanelLayoutState>;

  /** Get layout state for a project/session (creates default if none exists) */
  getLayoutForProject: (projectId: string, sessionId?: string) => PanelLayoutState;

  /** Set layout template for a project/session */
  setLayoutTemplate: (projectId: string, templateId: LayoutTemplateId, sessionId?: string) => void;

  /** Update a specific panel */
  updatePanel: (projectId: string, panelId: string, updates: Partial<PanelState>, sessionId?: string) => void;

  /** Change panel type */
  changePanelType: (projectId: string, panelId: string, newType: PanelType, sessionId?: string) => void;

  /** Set focused panel */
  focusPanel: (projectId: string, panelId: string, sessionId?: string) => void;

  /** Set split ratio for a layout node */
  setSplitRatio: (projectId: string, nodeId: string, ratio: number, sessionId?: string) => void;

  /** Set process running state for a panel */
  setProcessRunning: (projectId: string, panelId: string, running: boolean, sessionId?: string) => void;

  /** Get a specific panel */
  getPanel: (projectId: string, panelId: string, sessionId?: string) => PanelState | undefined;

  /** Reset layout for a project/session */
  resetLayout: (projectId: string, sessionId?: string) => void;

  /** Reset all layouts */
  reset: () => void;
}

/** Recursively update a node in the layout tree */
function updateNodeInTree(
  node: LayoutNode,
  nodeId: string,
  updates: Partial<LayoutNode>
): LayoutNode {
  if (node.id === nodeId) {
    return { ...node, ...updates };
  }
  if (node.type === "split" && node.children) {
    return {
      ...node,
      children: [
        updateNodeInTree(node.children[0], nodeId, updates),
        updateNodeInTree(node.children[1], nodeId, updates),
      ],
    };
  }
  return node;
}

export const usePanelStore = create<PanelStore>()(
  persist(
    (set, get) => ({
      layouts: new Map(),

      getLayoutForProject: (projectId: string, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        const layout = get().layouts.get(key);
        if (layout) return layout;

        // Create default layout for new project/session
        const defaultLayout = createDefaultLayoutState();
        set((state) => {
          const layouts = new Map(state.layouts);
          layouts.set(key, defaultLayout);
          return { layouts };
        });
        return defaultLayout;
      },

      setLayoutTemplate: (projectId: string, templateId: LayoutTemplateId, sessionId?: string) => {
        const template = LAYOUT_TEMPLATES[templateId];
        if (!template) return;

        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);

          // Create panels for each position in the template
          const panels: Record<string, PanelState> = {};
          const panelIds: string[] = [];

          template.defaultPanelTypes.forEach((type) => {
            const panel = createDefaultPanel(type);
            panels[panel.id] = panel;
            panelIds.push(panel.id);
          });

          // Create the layout structure
          const layout = template.createLayout(panelIds);

          layouts.set(key, {
            layout,
            panels,
            activeTemplateId: templateId,
            focusedPanelId: panelIds[0] || null,
          });

          return { layouts };
        });
      },

      updatePanel: (projectId: string, panelId: string, updates: Partial<PanelState>, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(key);
          if (!current || !current.panels[panelId]) return state;

          layouts.set(key, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: { ...current.panels[panelId], ...updates },
            },
          });

          return { layouts };
        });
      },

      changePanelType: (projectId: string, panelId: string, newType: PanelType, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(key);
          if (!current || !current.panels[panelId]) return state;

          // Reset type-specific state when changing types
          const updatedPanel: PanelState = {
            ...current.panels[panelId],
            type: newType,
            terminalPtyId: undefined,
            sessionId: undefined,
            filePath: undefined,
            browserUrl: undefined,
            hasRunningProcess: false,
          };

          layouts.set(key, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: updatedPanel,
            },
          });

          return { layouts };
        });
      },

      focusPanel: (projectId: string, panelId: string, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(key);
          if (!current) return state;

          // Update isFocused for all panels
          const panels = { ...current.panels };
          Object.keys(panels).forEach((id) => {
            panels[id] = { ...panels[id], isFocused: id === panelId };
          });

          layouts.set(key, {
            ...current,
            panels,
            focusedPanelId: panelId,
          });

          return { layouts };
        });
      },

      setSplitRatio: (projectId: string, nodeId: string, ratio: number, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(key);
          if (!current) return state;

          const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));
          const updatedLayout = updateNodeInTree(current.layout, nodeId, {
            splitRatio: clampedRatio,
          });

          layouts.set(key, {
            ...current,
            layout: updatedLayout,
          });

          return { layouts };
        });
      },

      setProcessRunning: (projectId: string, panelId: string, running: boolean, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(key);
          if (!current || !current.panels[panelId]) return state;

          layouts.set(key, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: { ...current.panels[panelId], hasRunningProcess: running },
            },
          });

          return { layouts };
        });
      },

      getPanel: (projectId: string, panelId: string, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        const layout = get().layouts.get(key);
        return layout?.panels[panelId];
      },

      resetLayout: (projectId: string, sessionId?: string) => {
        const key = getLayoutKey(projectId, sessionId);
        set((state) => {
          const layouts = new Map(state.layouts);
          layouts.set(key, createDefaultLayoutState());
          return { layouts };
        });
      },

      reset: () => {
        set({ layouts: new Map() });
      },
    }),
    {
      name: "panel-layout-storage",
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);

          // Restore layouts as Map, clear ephemeral state
          const layouts = new Map(
            (parsed.state.layouts || []).map(
              ([id, layoutState]: [string, PanelLayoutState]) => {
                // Clear process running state on load
                const panels = { ...layoutState.panels };
                Object.keys(panels).forEach((panelId) => {
                  panels[panelId] = {
                    ...panels[panelId],
                    hasRunningProcess: false,
                    terminalPtyId: undefined, // PTY IDs are ephemeral
                  };
                });
                return [id, { ...layoutState, panels }];
              }
            )
          );

          return {
            ...parsed,
            state: {
              ...parsed.state,
              layouts,
            },
          };
        },
        setItem: (name, value) => {
          // Serialize layouts, excluding ephemeral PTY IDs
          const layouts = Array.from(value.state.layouts.entries()).map(
            ([id, layoutState]: [string, PanelLayoutState]) => {
              const panels = { ...layoutState.panels };
              Object.keys(panels).forEach((panelId) => {
                panels[panelId] = {
                  ...panels[panelId],
                  terminalPtyId: undefined,
                  hasRunningProcess: false,
                };
              });
              return [id, { ...layoutState, panels }];
            }
          );

          const serialized = {
            ...value,
            state: {
              ...value.state,
              layouts,
            },
          };
          localStorage.setItem(name, JSON.stringify(serialized));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
