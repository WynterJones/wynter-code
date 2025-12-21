import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ClaudeModel } from "@/types";

export type EditorTheme =
  | "one-dark"
  | "dracula"
  | "vs-dark"
  | "github-dark"
  | "monokai";

export type MarkdownViewMode = "edit" | "split" | "preview";

export const EDITOR_THEMES: { id: EditorTheme; name: string }[] = [
  { id: "one-dark", name: "One Dark" },
  { id: "dracula", name: "Dracula" },
  { id: "vs-dark", name: "VS Code Dark" },
  { id: "github-dark", name: "GitHub Dark" },
  { id: "monokai", name: "Monokai" },
];

interface SettingsStore {
  defaultModel: ClaudeModel;
  sidebarWidth: number;
  theme: "dark";
  fontSize: number;
  editorTheme: EditorTheme;
  editorFontSize: number;
  editorWordWrap: boolean;
  editorMinimap: boolean;
  markdownDefaultView: MarkdownViewMode;

  setDefaultModel: (model: ClaudeModel) => void;
  setSidebarWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setEditorTheme: (theme: EditorTheme) => void;
  setEditorFontSize: (size: number) => void;
  setEditorWordWrap: (wrap: boolean) => void;
  setEditorMinimap: (show: boolean) => void;
  setMarkdownDefaultView: (mode: MarkdownViewMode) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      defaultModel: "claude-sonnet-4-20250514",
      sidebarWidth: 256,
      theme: "dark",
      fontSize: 14,
      editorTheme: "github-dark",
      editorFontSize: 14,
      editorWordWrap: true,
      editorMinimap: true,
      markdownDefaultView: "preview",

      setDefaultModel: (model: ClaudeModel) => {
        set({ defaultModel: model });
      },

      setSidebarWidth: (width: number) => {
        set({ sidebarWidth: width });
      },

      setFontSize: (size: number) => {
        set({ fontSize: size });
      },

      setEditorTheme: (editorTheme: EditorTheme) => {
        set({ editorTheme });
      },

      setEditorFontSize: (editorFontSize: number) => {
        set({ editorFontSize });
      },

      setEditorWordWrap: (editorWordWrap: boolean) => {
        set({ editorWordWrap });
      },

      setEditorMinimap: (editorMinimap: boolean) => {
        set({ editorMinimap });
      },

      setMarkdownDefaultView: (markdownDefaultView: MarkdownViewMode) => {
        set({ markdownDefaultView });
      },
    }),
    {
      name: "wynter-code-settings",
    }
  )
);
