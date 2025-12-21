import { create } from "zustand";

interface MarkdownFile {
  name: string;
  path: string;
  folder: string;
}

interface DocsCache {
  docs: MarkdownFile[];
  scannedAt: number;
}

interface DocsStore {
  cache: Record<string, DocsCache>;

  getDocs: (projectPath: string) => DocsCache | null;
  setDocs: (projectPath: string, docs: MarkdownFile[]) => void;
  clearDocs: (projectPath: string) => void;
}

export const useDocsStore = create<DocsStore>((set, get) => ({
  cache: {},

  getDocs: (projectPath: string) => {
    return get().cache[projectPath] || null;
  },

  setDocs: (projectPath: string, docs: MarkdownFile[]) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [projectPath]: {
          docs,
          scannedAt: Date.now(),
        },
      },
    }));
  },

  clearDocs: (projectPath: string) => {
    set((state) => {
      const { [projectPath]: _, ...rest } = state.cache;
      return { cache: rest };
    });
  },
}));
