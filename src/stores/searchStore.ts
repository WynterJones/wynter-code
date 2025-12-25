import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  SearchOptions,
  SearchResult,
  FileSearchResult,
  ReplaceResult,
} from "@/types";

interface SearchState {
  // Query state
  query: string;
  replaceText: string;
  showReplace: boolean;
  options: SearchOptions;

  // Results
  results: FileSearchResult[];
  totalMatches: number;
  totalFiles: number;
  searchTimeMs: number;
  isSearching: boolean;
  searchError: string | null;
  truncated: boolean;

  // Navigation
  currentMatchIndex: number;
  expandedFiles: Set<string>;

  // Actions
  setQuery: (query: string) => void;
  setReplaceText: (text: string) => void;
  toggleShowReplace: () => void;
  setOptions: (options: Partial<SearchOptions>) => void;
  search: (projectPath: string) => Promise<void>;
  replaceInFile: (
    projectPath: string,
    filePath: string
  ) => Promise<ReplaceResult>;
  replaceAll: (projectPath: string) => Promise<ReplaceResult>;
  clearResults: () => void;

  // Navigation actions
  navigateNext: () => void;
  navigatePrev: () => void;
  setCurrentMatchIndex: (index: number) => void;
  toggleFileExpanded: (filePath: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
}

const DEFAULT_OPTIONS: SearchOptions = {
  caseSensitive: false,
  regexMode: false,
  wholeWord: false,
  includeHidden: false,
  maxResults: 1000,
  contextLines: 1,
};

export const useSearchStore = create<SearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      query: "",
      replaceText: "",
      showReplace: false,
      options: DEFAULT_OPTIONS,
      results: [],
      totalMatches: 0,
      totalFiles: 0,
      searchTimeMs: 0,
      isSearching: false,
      searchError: null,
      truncated: false,
      currentMatchIndex: 0,
      expandedFiles: new Set<string>(),

      setQuery: (query: string) => set({ query }),

      setReplaceText: (text: string) => set({ replaceText: text }),

      toggleShowReplace: () =>
        set((state) => ({ showReplace: !state.showReplace })),

      setOptions: (options: Partial<SearchOptions>) =>
        set((state) => ({
          options: { ...state.options, ...options },
        })),

      search: async (projectPath: string) => {
        const { query, options } = get();

        if (!query.trim()) {
          set({
            results: [],
            totalMatches: 0,
            totalFiles: 0,
            searchTimeMs: 0,
            truncated: false,
            searchError: null,
          });
          return;
        }

        set({ isSearching: true, searchError: null });

        try {
          const result = await invoke<SearchResult>("grep_project", {
            projectPath,
            query,
            options,
          });

          // Auto-expand first 5 files by default
          const expandedFiles = new Set<string>();
          result.files.slice(0, 5).forEach((file) => {
            expandedFiles.add(file.filePath);
          });

          set({
            results: result.files,
            totalMatches: result.totalMatches,
            totalFiles: result.totalFiles,
            searchTimeMs: result.searchTimeMs,
            truncated: result.truncated,
            isSearching: false,
            currentMatchIndex: 0,
            expandedFiles,
          });
        } catch (error) {
          set({
            isSearching: false,
            searchError: error instanceof Error ? error.message : String(error),
            results: [],
            totalMatches: 0,
            totalFiles: 0,
          });
        }
      },

      replaceInFile: async (projectPath: string, filePath: string) => {
        const { query, replaceText, options } = get();

        const result = await invoke<ReplaceResult>("replace_in_files", {
          projectPath,
          search: query,
          replace: replaceText,
          filePaths: [filePath],
          options,
        });

        // Re-search to update results
        await get().search(projectPath);

        return result;
      },

      replaceAll: async (projectPath: string) => {
        const { query, replaceText, options, results } = get();

        const filePaths = results.map((r) => r.filePath);

        const result = await invoke<ReplaceResult>("replace_in_files", {
          projectPath,
          search: query,
          replace: replaceText,
          filePaths,
          options,
        });

        // Re-search to update results
        await get().search(projectPath);

        return result;
      },

      clearResults: () =>
        set({
          results: [],
          totalMatches: 0,
          totalFiles: 0,
          searchTimeMs: 0,
          truncated: false,
          searchError: null,
          currentMatchIndex: 0,
          expandedFiles: new Set<string>(),
        }),

      navigateNext: () => {
        const { currentMatchIndex, totalMatches } = get();
        if (totalMatches === 0) return;
        set({
          currentMatchIndex: (currentMatchIndex + 1) % totalMatches,
        });
      },

      navigatePrev: () => {
        const { currentMatchIndex, totalMatches } = get();
        if (totalMatches === 0) return;
        set({
          currentMatchIndex:
            currentMatchIndex === 0 ? totalMatches - 1 : currentMatchIndex - 1,
        });
      },

      setCurrentMatchIndex: (index: number) =>
        set({ currentMatchIndex: index }),

      toggleFileExpanded: (filePath: string) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFiles);
          if (newExpanded.has(filePath)) {
            newExpanded.delete(filePath);
          } else {
            newExpanded.add(filePath);
          }
          return { expandedFiles: newExpanded };
        }),

      expandAll: () =>
        set((state) => ({
          expandedFiles: new Set(state.results.map((r) => r.filePath)),
        })),

      collapseAll: () => set({ expandedFiles: new Set<string>() }),
    }),
    {
      name: "wynter-code-search",
      partialize: (state) => ({
        options: state.options,
        showReplace: state.showReplace,
      }),
    }
  )
);
