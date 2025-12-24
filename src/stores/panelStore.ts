import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  PanelLayoutState,
  PanelState,
  PanelType,
  LayoutNode,
  LayoutTemplateId,
} from "@/types/panel";
import { LAYOUT_TEMPLATES, createDefaultLayout } from "@/components/panels/layoutTemplates";

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
  const panel = createDefaultPanel("claude-output");
  return {
    layout: createDefaultLayout([panel.id]),
    panels: { [panel.id]: panel },
    activeTemplateId: "single",
    focusedPanelId: panel.id,
  };
}

interface PanelStore {
  /** Per-project layout states */
  layouts: Map<string, PanelLayoutState>;

  /** Get layout state for a project (creates default if none exists) */
  getLayoutForProject: (projectId: string) => PanelLayoutState;

  /** Set layout template for a project */
  setLayoutTemplate: (projectId: string, templateId: LayoutTemplateId) => void;

  /** Update a specific panel */
  updatePanel: (projectId: string, panelId: string, updates: Partial<PanelState>) => void;

  /** Change panel type */
  changePanelType: (projectId: string, panelId: string, newType: PanelType) => void;

  /** Set focused panel */
  focusPanel: (projectId: string, panelId: string) => void;

  /** Set split ratio for a layout node */
  setSplitRatio: (projectId: string, nodeId: string, ratio: number) => void;

  /** Set process running state for a panel */
  setProcessRunning: (projectId: string, panelId: string, running: boolean) => void;

  /** Get a specific panel */
  getPanel: (projectId: string, panelId: string) => PanelState | undefined;

  /** Reset layout for a project */
  resetLayout: (projectId: string) => void;

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

      getLayoutForProject: (projectId: string) => {
        const layout = get().layouts.get(projectId);
        if (layout) return layout;

        // Create default layout for new project
        const defaultLayout = createDefaultLayoutState();
        set((state) => {
          const layouts = new Map(state.layouts);
          layouts.set(projectId, defaultLayout);
          return { layouts };
        });
        return defaultLayout;
      },

      setLayoutTemplate: (projectId: string, templateId: LayoutTemplateId) => {
        const template = LAYOUT_TEMPLATES[templateId];
        if (!template) return;

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

          layouts.set(projectId, {
            layout,
            panels,
            activeTemplateId: templateId,
            focusedPanelId: panelIds[0] || null,
          });

          return { layouts };
        });
      },

      updatePanel: (projectId: string, panelId: string, updates: Partial<PanelState>) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(projectId);
          if (!current || !current.panels[panelId]) return state;

          layouts.set(projectId, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: { ...current.panels[panelId], ...updates },
            },
          });

          return { layouts };
        });
      },

      changePanelType: (projectId: string, panelId: string, newType: PanelType) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(projectId);
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

          layouts.set(projectId, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: updatedPanel,
            },
          });

          return { layouts };
        });
      },

      focusPanel: (projectId: string, panelId: string) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(projectId);
          if (!current) return state;

          // Update isFocused for all panels
          const panels = { ...current.panels };
          Object.keys(panels).forEach((id) => {
            panels[id] = { ...panels[id], isFocused: id === panelId };
          });

          layouts.set(projectId, {
            ...current,
            panels,
            focusedPanelId: panelId,
          });

          return { layouts };
        });
      },

      setSplitRatio: (projectId: string, nodeId: string, ratio: number) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(projectId);
          if (!current) return state;

          const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));
          const updatedLayout = updateNodeInTree(current.layout, nodeId, {
            splitRatio: clampedRatio,
          });

          layouts.set(projectId, {
            ...current,
            layout: updatedLayout,
          });

          return { layouts };
        });
      },

      setProcessRunning: (projectId: string, panelId: string, running: boolean) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          const current = layouts.get(projectId);
          if (!current || !current.panels[panelId]) return state;

          layouts.set(projectId, {
            ...current,
            panels: {
              ...current.panels,
              [panelId]: { ...current.panels[panelId], hasRunningProcess: running },
            },
          });

          return { layouts };
        });
      },

      getPanel: (projectId: string, panelId: string) => {
        const layout = get().layouts.get(projectId);
        return layout?.panels[panelId];
      },

      resetLayout: (projectId: string) => {
        set((state) => {
          const layouts = new Map(state.layouts);
          layouts.set(projectId, createDefaultLayoutState());
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
