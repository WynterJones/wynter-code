import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  faviconUrl?: string;
  collectionId: string | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
}

export type ViewMode = "list" | "grid";

interface BookmarkStore {
  // Data
  bookmarks: Bookmark[];
  collections: Collection[];

  // UI State
  selectedCollectionId: string | null;
  viewMode: ViewMode;
  searchQuery: string;

  // Actions - Bookmarks
  addBookmark: (bookmark: Omit<Bookmark, "id" | "createdAt" | "updatedAt" | "order">) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  deleteBookmark: (id: string) => void;
  moveBookmark: (bookmarkId: string, collectionId: string | null) => void;
  reorderBookmarks: (activeId: string, overId: string) => void;

  // Actions - Collections
  addCollection: (collection: Omit<Collection, "id" | "createdAt" | "order">) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string, moveBookmarksToUncategorized?: boolean) => void;
  reorderCollections: (orderedIds: string[]) => void;

  // Actions - UI
  setSelectedCollection: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;

  // Import/Export
  importBookmarks: (data: ImportData) => { imported: number; collectionsCreated: number };

  // Computed helpers
  getBookmarksByCollection: (collectionId: string | null) => Bookmark[];
  getBookmarkCount: (collectionId: string | null) => number;
  getFilteredBookmarks: () => Bookmark[];
}

// Simple import format
export interface ImportBookmark {
  url: string;
  title: string;
  description?: string;
  category?: string;
}

export interface ImportData {
  bookmarks: ImportBookmark[];
}

export const useBookmarkStore = create<BookmarkStore>()(
  persist(
    (set, get) => ({
      // Initial state
      bookmarks: [],
      collections: [],
      selectedCollectionId: null,
      viewMode: "list",
      searchQuery: "",

      // Bookmark actions
      addBookmark: (bookmark) => {
        const { bookmarks } = get();
        const maxOrder = bookmarks.length > 0
          ? Math.max(...bookmarks.map((b) => b.order ?? 0))
          : -1;

        const newBookmark: Bookmark = {
          ...bookmark,
          id: uuidv4(),
          order: maxOrder + 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          bookmarks: [...state.bookmarks, newBookmark],
        }));
      },

      updateBookmark: (id, updates) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: Date.now() } : b
          ),
        }));
      },

      deleteBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      moveBookmark: (bookmarkId, collectionId) => {
        set((state) => ({
          bookmarks: state.bookmarks.map((b) =>
            b.id === bookmarkId
              ? { ...b, collectionId, updatedAt: Date.now() }
              : b
          ),
        }));
      },

      reorderBookmarks: (activeId, overId) => {
        set((state) => {
          const oldIndex = state.bookmarks.findIndex((b) => b.id === activeId);
          const newIndex = state.bookmarks.findIndex((b) => b.id === overId);

          if (oldIndex === -1 || newIndex === -1) return state;

          const newBookmarks = [...state.bookmarks];
          const [movedItem] = newBookmarks.splice(oldIndex, 1);
          newBookmarks.splice(newIndex, 0, movedItem);

          // Update order values
          return {
            bookmarks: newBookmarks.map((b, index) => ({
              ...b,
              order: index,
            })),
          };
        });
      },

      // Collection actions
      addCollection: (collection) => {
        const { collections } = get();
        const maxOrder = collections.length > 0
          ? Math.max(...collections.map((c) => c.order))
          : -1;

        const newCollection: Collection = {
          ...collection,
          id: uuidv4(),
          order: maxOrder + 1,
          createdAt: Date.now(),
        };
        set((state) => ({
          collections: [...state.collections, newCollection],
        }));
      },

      updateCollection: (id, updates) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCollection: (id, moveBookmarksToUncategorized = true) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          bookmarks: moveBookmarksToUncategorized
            ? state.bookmarks.map((b) =>
                b.collectionId === id ? { ...b, collectionId: null } : b
              )
            : state.bookmarks.filter((b) => b.collectionId !== id),
          selectedCollectionId:
            state.selectedCollectionId === id ? null : state.selectedCollectionId,
        }));
      },

      reorderCollections: (orderedIds) => {
        set((state) => ({
          collections: state.collections.map((c) => ({
            ...c,
            order: orderedIds.indexOf(c.id),
          })),
        }));
      },

      // UI actions
      setSelectedCollection: (id) => {
        set({ selectedCollectionId: id });
      },

      setViewMode: (mode) => {
        set({ viewMode: mode });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      // Import bookmarks
      importBookmarks: (data) => {
        const { bookmarks, collections } = get();
        const categoryMap = new Map<string, string>();
        let collectionsCreated = 0;

        // Build map of existing collections by name (case-insensitive)
        collections.forEach((c) => {
          categoryMap.set(c.name.toLowerCase(), c.id);
        });

        const newCollections: Collection[] = [];
        const newBookmarks: Bookmark[] = [];

        let maxCollectionOrder = collections.length > 0
          ? Math.max(...collections.map((c) => c.order))
          : -1;

        let maxBookmarkOrder = bookmarks.length > 0
          ? Math.max(...bookmarks.map((b) => b.order ?? 0))
          : -1;

        // Process each bookmark
        data.bookmarks.forEach((item) => {
          let collectionId: string | null = null;

          // Handle category - create if doesn't exist
          if (item.category && item.category.trim()) {
            const categoryKey = item.category.trim().toLowerCase();

            if (categoryMap.has(categoryKey)) {
              collectionId = categoryMap.get(categoryKey)!;
            } else {
              // Create new collection
              const newCollection: Collection = {
                id: uuidv4(),
                name: item.category.trim(),
                order: ++maxCollectionOrder,
                createdAt: Date.now(),
              };
              newCollections.push(newCollection);
              categoryMap.set(categoryKey, newCollection.id);
              collectionId = newCollection.id;
              collectionsCreated++;
            }
          }

          // Create bookmark
          const newBookmark: Bookmark = {
            id: uuidv4(),
            url: item.url,
            title: item.title,
            description: item.description,
            collectionId,
            order: ++maxBookmarkOrder,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          newBookmarks.push(newBookmark);
        });

        // Update store
        set((state) => ({
          collections: [...state.collections, ...newCollections],
          bookmarks: [...state.bookmarks, ...newBookmarks],
        }));

        return {
          imported: newBookmarks.length,
          collectionsCreated,
        };
      },

      // Computed helpers
      getBookmarksByCollection: (collectionId) => {
        const { bookmarks } = get();
        if (collectionId === null) {
          return bookmarks;
        }
        if (collectionId === "uncategorized") {
          return bookmarks.filter((b) => b.collectionId === null);
        }
        return bookmarks.filter((b) => b.collectionId === collectionId);
      },

      getBookmarkCount: (collectionId) => {
        const { bookmarks } = get();
        if (collectionId === null) {
          return bookmarks.length;
        }
        if (collectionId === "uncategorized") {
          return bookmarks.filter((b) => b.collectionId === null).length;
        }
        return bookmarks.filter((b) => b.collectionId === collectionId).length;
      },

      getFilteredBookmarks: () => {
        const { bookmarks, selectedCollectionId, searchQuery } = get();
        let filtered = bookmarks;

        // Filter by collection
        if (selectedCollectionId === "uncategorized") {
          filtered = filtered.filter((b) => b.collectionId === null);
        } else if (selectedCollectionId !== null) {
          filtered = filtered.filter((b) => b.collectionId === selectedCollectionId);
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (b) =>
              b.title.toLowerCase().includes(query) ||
              b.url.toLowerCase().includes(query) ||
              (b.description && b.description.toLowerCase().includes(query))
          );
        }

        // Sort by order
        return filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      },
    }),
    {
      name: "wynter-code-bookmarks",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        collections: state.collections,
        viewMode: state.viewMode,
        selectedCollectionId: state.selectedCollectionId,
      }),
    }
  )
);
