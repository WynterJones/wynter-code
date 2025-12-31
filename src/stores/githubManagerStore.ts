import { create } from "zustand";
import { persist } from "zustand/middleware";
import { githubService } from "@/services/github";
import { handleError } from "@/lib/errorHandler";
import type {
  GhAuthStatus,
  GhRepo,
  GhOrg,
  GhSearchRepo,
  GitHubTab,
  GhRepoDetails,
  GhRepoContent,
} from "@/types/github";

interface GitHubManagerStore {
  // Auth state
  authStatus: GhAuthStatus | null;
  authLoading: boolean;

  // UI state
  activeTab: GitHubTab;
  selectedRepo: GhRepo | null;
  showConnectWorkflow: boolean;
  showRepoDetail: boolean;

  // Data
  myRepos: GhRepo[];
  starredRepos: GhRepo[];
  orgs: GhOrg[];
  orgRepos: Record<string, GhRepo[]>;
  selectedOrg: string | null;
  searchResults: GhSearchRepo[];
  searchQuery: string;

  // Repo detail state
  repoDetails: GhRepoDetails | null;
  repoContents: GhRepoContent[];
  currentPath: string;
  fileContent: string | null;
  selectedFile: string | null;

  // Loading states
  myReposLoading: boolean;
  starredReposLoading: boolean;
  orgsLoading: boolean;
  orgReposLoading: boolean;
  searchLoading: boolean;
  createLoading: boolean;
  repoDetailsLoading: boolean;
  repoContentsLoading: boolean;
  fileContentLoading: boolean;
  editLoading: boolean;
  deleteLoading: boolean;

  // Error state
  error: string | null;

  // Actions - Auth
  checkAuth: () => Promise<void>;
  openAuth: () => Promise<void>;

  // Actions - Repos
  loadMyRepos: () => Promise<void>;
  loadStarredRepos: () => Promise<void>;
  loadOrgs: () => Promise<void>;
  loadOrgRepos: (org: string) => Promise<void>;
  searchRepos: (query: string) => Promise<void>;

  // Actions - Create
  createAndConnectRepo: (options: {
    name: string;
    description?: string;
    isPrivate: boolean;
    sourcePath: string;
    push: boolean;
  }) => Promise<{ success: boolean; error?: string; repoUrl?: string }>;

  // Actions - Repo Detail
  viewRepo: (owner: string, repo: string) => Promise<void>;
  loadRepoContents: (owner: string, repo: string, path?: string) => Promise<void>;
  loadFileContent: (owner: string, repo: string, path: string) => Promise<void>;
  editRepo: (
    owner: string,
    repo: string,
    options: {
      description?: string;
      visibility?: "public" | "private";
      homepage?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  deleteRepo: (owner: string, repo: string) => Promise<{ success: boolean; error?: string }>;

  // UI actions
  setActiveTab: (tab: GitHubTab) => void;
  setSelectedRepo: (repo: GhRepo | null) => void;
  setSelectedOrg: (org: string | null) => void;
  setShowConnectWorkflow: (show: boolean) => void;
  setShowRepoDetail: (show: boolean) => void;
  setCurrentPath: (path: string) => void;
  setSelectedFile: (file: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useGitHubManagerStore = create<GitHubManagerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      authStatus: null,
      authLoading: false,
      activeTab: "my-repos",
      selectedRepo: null,
      showConnectWorkflow: false,
      showRepoDetail: false,
      myRepos: [],
      starredRepos: [],
      orgs: [],
      orgRepos: {},
      selectedOrg: null,
      searchResults: [],
      searchQuery: "",
      // Repo detail state
      repoDetails: null,
      repoContents: [],
      currentPath: "",
      fileContent: null,
      selectedFile: null,
      // Loading states
      myReposLoading: false,
      starredReposLoading: false,
      orgsLoading: false,
      orgReposLoading: false,
      searchLoading: false,
      createLoading: false,
      repoDetailsLoading: false,
      repoContentsLoading: false,
      fileContentLoading: false,
      editLoading: false,
      deleteLoading: false,
      error: null,

      // Check auth status
      checkAuth: async () => {
        set({ authLoading: true, error: null });
        try {
          const status = await githubService.checkAuth();
          set({ authStatus: status, authLoading: false });
        } catch (error) {
          const message = handleError(error, "GitHubManagerStore.checkAuth");
          set({
            authLoading: false,
            error: message,
            authStatus: { isAuthenticated: false, error: message },
          });
        }
      },

      // Open browser for authentication
      openAuth: async () => {
        try {
          await githubService.openAuth();
          // After auth, check status again
          await get().checkAuth();
        } catch (error) {
          set({ error: handleError(error, "GitHubManagerStore.openAuth") });
        }
      },

      // Load user's repos
      loadMyRepos: async () => {
        set({ myReposLoading: true, error: null });
        try {
          const repos = await githubService.listMyRepos();
          set({ myRepos: repos, myReposLoading: false });
        } catch (error) {
          set({ myReposLoading: false, error: handleError(error, "GitHubManagerStore.loadMyRepos") });
        }
      },

      // Load starred repos
      loadStarredRepos: async () => {
        set({ starredReposLoading: true, error: null });
        try {
          const repos = await githubService.listStarredRepos();
          set({ starredRepos: repos, starredReposLoading: false });
        } catch (error) {
          set({ starredReposLoading: false, error: handleError(error, "GitHubManagerStore.loadStarredRepos") });
        }
      },

      // Load orgs
      loadOrgs: async () => {
        set({ orgsLoading: true, error: null });
        try {
          const orgs = await githubService.listOrgs();
          set({ orgs, orgsLoading: false });
        } catch (error) {
          set({ orgsLoading: false, error: handleError(error, "GitHubManagerStore.loadOrgs") });
        }
      },

      // Load org repos
      loadOrgRepos: async (org: string) => {
        set({ orgReposLoading: true, error: null, selectedOrg: org });
        try {
          const repos = await githubService.listOrgRepos(org);
          set((state) => ({
            orgRepos: { ...state.orgRepos, [org]: repos },
            orgReposLoading: false,
          }));
        } catch (error) {
          set({ orgReposLoading: false, error: handleError(error, "GitHubManagerStore.loadOrgRepos") });
        }
      },

      // Search repos
      searchRepos: async (query: string) => {
        if (!query.trim()) {
          set({ searchResults: [], searchQuery: "" });
          return;
        }

        set({ searchLoading: true, error: null, searchQuery: query });
        try {
          const results = await githubService.searchRepos(query);
          set({ searchResults: results, searchLoading: false });
        } catch (error) {
          set({ searchLoading: false, error: handleError(error, "GitHubManagerStore.searchRepos") });
        }
      },

      // Create and connect repo
      createAndConnectRepo: async (options) => {
        set({ createLoading: true, error: null });
        try {
          const result = await githubService.createRepo({
            name: options.name,
            description: options.description,
            isPrivate: options.isPrivate,
            sourcePath: options.sourcePath,
            push: options.push,
          });

          set({ createLoading: false });

          if (result.success) {
            // Refresh my repos after creation
            get().loadMyRepos();
            return { success: true, repoUrl: result.repoUrl };
          } else {
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ createLoading: false });
          return { success: false, error: handleError(error, "GitHubManagerStore.createAndConnectRepo") };
        }
      },

      // View repo details
      viewRepo: async (owner: string, repo: string) => {
        set({
          repoDetailsLoading: true,
          error: null,
          showRepoDetail: true,
          repoDetails: null,
          repoContents: [],
          currentPath: "",
          fileContent: null,
          selectedFile: null,
        });
        try {
          const [details, contents] = await Promise.all([
            githubService.viewRepo(owner, repo),
            githubService.getRepoContents(owner, repo),
          ]);
          set({
            repoDetails: details,
            repoContents: contents,
            repoDetailsLoading: false,
          });
        } catch (error) {
          set({ repoDetailsLoading: false, error: handleError(error, "GitHubManagerStore.viewRepo") });
        }
      },

      // Load repo contents at a path
      loadRepoContents: async (owner: string, repo: string, path?: string) => {
        set({ repoContentsLoading: true, error: null, currentPath: path || "" });
        try {
          const contents = await githubService.getRepoContents(owner, repo, path);
          set({ repoContents: contents, repoContentsLoading: false });
        } catch (error) {
          set({ repoContentsLoading: false, error: handleError(error, "GitHubManagerStore.loadRepoContents") });
        }
      },

      // Load file content
      loadFileContent: async (owner: string, repo: string, path: string) => {
        set({ fileContentLoading: true, error: null, selectedFile: path });
        try {
          const content = await githubService.getFileContent(owner, repo, path);
          set({ fileContent: content, fileContentLoading: false });
        } catch (error) {
          set({ fileContentLoading: false, error: handleError(error, "GitHubManagerStore.loadFileContent") });
        }
      },

      // Edit repo
      editRepo: async (owner, repo, options) => {
        set({ editLoading: true, error: null });
        try {
          const result = await githubService.editRepo(owner, repo, options);
          set({ editLoading: false });
          if (result.success) {
            // Refresh repo details
            get().viewRepo(owner, repo);
            // Refresh my repos
            get().loadMyRepos();
            return { success: true };
          } else {
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ editLoading: false });
          return { success: false, error: handleError(error, "GitHubManagerStore.editRepo") };
        }
      },

      // Delete repo
      deleteRepo: async (owner, repo) => {
        set({ deleteLoading: true, error: null });
        try {
          const result = await githubService.deleteRepo(owner, repo);
          set({ deleteLoading: false });
          if (result.success) {
            // Close detail view and refresh
            set({ showRepoDetail: false, selectedRepo: null });
            get().loadMyRepos();
            return { success: true };
          } else {
            return { success: false, error: result.error };
          }
        } catch (error) {
          set({ deleteLoading: false });
          return { success: false, error: handleError(error, "GitHubManagerStore.deleteRepo") };
        }
      },

      // UI actions
      setActiveTab: (tab: GitHubTab) => set({ activeTab: tab }),
      setSelectedRepo: (repo: GhRepo | null) => set({ selectedRepo: repo }),
      setSelectedOrg: (org: string | null) => set({ selectedOrg: org }),
      setShowConnectWorkflow: (show: boolean) =>
        set({ showConnectWorkflow: show }),
      setShowRepoDetail: (show: boolean) =>
        set({
          showRepoDetail: show,
          ...(show
            ? {}
            : {
                repoDetails: null,
                repoContents: [],
                currentPath: "",
                fileContent: null,
                selectedFile: null,
              }),
        }),
      setCurrentPath: (path: string) => set({ currentPath: path }),
      setSelectedFile: (file: string | null) =>
        set({ selectedFile: file, fileContent: null }),
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      clearError: () => set({ error: null }),
      reset: () =>
        set({
          selectedRepo: null,
          showConnectWorkflow: false,
          showRepoDetail: false,
          repoDetails: null,
          repoContents: [],
          currentPath: "",
          fileContent: null,
          selectedFile: null,
          searchResults: [],
          searchQuery: "",
          error: null,
        }),
    }),
    {
      name: "github-manager-storage",
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    }
  )
);
