import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  ApiRequest,
  ApiResponse,
  RequestTab,
  HistoryEntry,
  WebhookServer,
  WebhookRequest,
  KeyValuePair,
} from "@/types";
import { createEmptyRequest } from "@/types";

interface ApiTesterStore {
  // Tabs (per-project)
  tabs: Map<string, RequestTab[]>;
  activeTabId: Map<string, string>;

  // Requests and responses
  requests: Map<string, ApiRequest>;
  responses: Map<string, ApiResponse>;

  // History (global, last 100)
  history: HistoryEntry[];

  // Webhooks
  webhookServers: WebhookServer[];
  webhookRequests: Map<string, WebhookRequest[]>;

  // UI State
  isLoading: Map<string, boolean>;

  // Tab actions
  createTab: (projectId: string) => string;
  closeTab: (projectId: string, tabId: string) => void;
  setActiveTab: (projectId: string, tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  reorderTabs: (projectId: string, tabs: RequestTab[]) => void;
  getTabsForProject: (projectId: string) => RequestTab[];
  getActiveTab: (projectId: string) => RequestTab | undefined;

  // Request actions
  getRequest: (requestId: string) => ApiRequest | undefined;
  updateRequest: (requestId: string, updates: Partial<ApiRequest>) => void;
  updateRequestUrl: (requestId: string, url: string) => void;
  updateRequestMethod: (requestId: string, method: ApiRequest["method"]) => void;
  updateRequestHeaders: (requestId: string, headers: KeyValuePair[]) => void;
  updateRequestQueryParams: (requestId: string, queryParams: KeyValuePair[]) => void;
  updateRequestBody: (requestId: string, body: ApiRequest["body"]) => void;
  updateRequestAuth: (requestId: string, auth: ApiRequest["auth"]) => void;
  markTabDirty: (projectId: string, tabId: string, isDirty: boolean) => void;

  // Response actions
  setResponse: (requestId: string, response: ApiResponse) => void;
  getResponse: (requestId: string) => ApiResponse | undefined;
  clearResponse: (requestId: string) => void;

  // Loading state
  setLoading: (requestId: string, loading: boolean) => void;
  isRequestLoading: (requestId: string) => boolean;

  // History actions
  addToHistory: (request: ApiRequest, response?: ApiResponse) => void;
  clearHistory: () => void;
  loadFromHistory: (projectId: string, historyId: string) => void;

  // Webhook actions
  addWebhookServer: (server: WebhookServer) => void;
  removeWebhookServer: (serverId: string) => void;
  updateWebhookServer: (serverId: string, updates: Partial<WebhookServer>) => void;
  addWebhookRequest: (serverId: string, request: WebhookRequest) => void;
  clearWebhookRequests: (serverId: string) => void;
  getWebhookRequests: (serverId: string) => WebhookRequest[];

  // Reset
  reset: () => void;
}

const MAX_HISTORY = 100;

export const useApiTesterStore = create<ApiTesterStore>()(
  persist(
    (set, get) => ({
      tabs: new Map(),
      activeTabId: new Map(),
      requests: new Map(),
      responses: new Map(),
      history: [],
      webhookServers: [],
      webhookRequests: new Map(),
      isLoading: new Map(),

      // Tab actions
      createTab: (projectId: string) => {
        const request = createEmptyRequest();
        const tab: RequestTab = {
          id: crypto.randomUUID(),
          requestId: request.id,
          name: "Untitled",
          isDirty: false,
        };

        set((state) => {
          const newTabs = new Map(state.tabs);
          const projectTabs = newTabs.get(projectId) || [];
          newTabs.set(projectId, [...projectTabs, tab]);

          const newActiveTabId = new Map(state.activeTabId);
          newActiveTabId.set(projectId, tab.id);

          const newRequests = new Map(state.requests);
          newRequests.set(request.id, request);

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            requests: newRequests,
          };
        });

        return tab.id;
      },

      closeTab: (projectId: string, tabId: string) => {
        set((state) => {
          const newTabs = new Map(state.tabs);
          const projectTabs = (newTabs.get(projectId) || []).filter(
            (t) => t.id !== tabId
          );
          newTabs.set(projectId, projectTabs);

          const newActiveTabId = new Map(state.activeTabId);
          if (state.activeTabId.get(projectId) === tabId) {
            newActiveTabId.set(projectId, projectTabs[projectTabs.length - 1]?.id || "");
          }

          // Clean up request and response
          const closedTab = state.tabs.get(projectId)?.find((t) => t.id === tabId);
          const newRequests = new Map(state.requests);
          const newResponses = new Map(state.responses);
          if (closedTab) {
            newRequests.delete(closedTab.requestId);
            newResponses.delete(closedTab.requestId);
          }

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            requests: newRequests,
            responses: newResponses,
          };
        });
      },

      setActiveTab: (projectId: string, tabId: string) => {
        set((state) => {
          const newActiveTabId = new Map(state.activeTabId);
          newActiveTabId.set(projectId, tabId);
          return { activeTabId: newActiveTabId };
        });
      },

      renameTab: (tabId: string, name: string) => {
        set((state) => {
          const newTabs = new Map(state.tabs);
          for (const [projectId, tabs] of newTabs) {
            const updatedTabs = tabs.map((t) =>
              t.id === tabId ? { ...t, name } : t
            );
            newTabs.set(projectId, updatedTabs);
          }
          return { tabs: newTabs };
        });
      },

      reorderTabs: (projectId: string, tabs: RequestTab[]) => {
        set((state) => {
          const newTabs = new Map(state.tabs);
          newTabs.set(projectId, tabs);
          return { tabs: newTabs };
        });
      },

      getTabsForProject: (projectId: string) => {
        return get().tabs.get(projectId) || [];
      },

      getActiveTab: (projectId: string) => {
        const tabs = get().tabs.get(projectId) || [];
        const activeId = get().activeTabId.get(projectId);
        return tabs.find((t) => t.id === activeId);
      },

      // Request actions
      getRequest: (requestId: string) => {
        return get().requests.get(requestId);
      },

      updateRequest: (requestId: string, updates: Partial<ApiRequest>) => {
        set((state) => {
          const newRequests = new Map(state.requests);
          const existing = newRequests.get(requestId);
          if (existing) {
            newRequests.set(requestId, {
              ...existing,
              ...updates,
              updatedAt: Date.now(),
            });
          }
          return { requests: newRequests };
        });
      },

      updateRequestUrl: (requestId: string, url: string) => {
        get().updateRequest(requestId, { url });
      },

      updateRequestMethod: (requestId: string, method: ApiRequest["method"]) => {
        get().updateRequest(requestId, { method });
      },

      updateRequestHeaders: (requestId: string, headers: KeyValuePair[]) => {
        get().updateRequest(requestId, { headers });
      },

      updateRequestQueryParams: (requestId: string, queryParams: KeyValuePair[]) => {
        get().updateRequest(requestId, { queryParams });
      },

      updateRequestBody: (requestId: string, body: ApiRequest["body"]) => {
        get().updateRequest(requestId, { body });
      },

      updateRequestAuth: (requestId: string, auth: ApiRequest["auth"]) => {
        get().updateRequest(requestId, { auth });
      },

      markTabDirty: (projectId: string, tabId: string, isDirty: boolean) => {
        set((state) => {
          const newTabs = new Map(state.tabs);
          const projectTabs = newTabs.get(projectId) || [];
          const updatedTabs = projectTabs.map((t) =>
            t.id === tabId ? { ...t, isDirty } : t
          );
          newTabs.set(projectId, updatedTabs);
          return { tabs: newTabs };
        });
      },

      // Response actions
      setResponse: (requestId: string, response: ApiResponse) => {
        set((state) => {
          const newResponses = new Map(state.responses);
          newResponses.set(requestId, response);
          return { responses: newResponses };
        });
      },

      getResponse: (requestId: string) => {
        return get().responses.get(requestId);
      },

      clearResponse: (requestId: string) => {
        set((state) => {
          const newResponses = new Map(state.responses);
          newResponses.delete(requestId);
          return { responses: newResponses };
        });
      },

      // Loading state
      setLoading: (requestId: string, loading: boolean) => {
        set((state) => {
          const newLoading = new Map(state.isLoading);
          if (loading) {
            newLoading.set(requestId, true);
          } else {
            newLoading.delete(requestId);
          }
          return { isLoading: newLoading };
        });
      },

      isRequestLoading: (requestId: string) => {
        return get().isLoading.get(requestId) || false;
      },

      // History actions
      addToHistory: (request: ApiRequest, response?: ApiResponse) => {
        set((state) => {
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            request: { ...request },
            response: response ? { ...response } : undefined,
            timestamp: Date.now(),
          };

          const newHistory = [entry, ...state.history].slice(0, MAX_HISTORY);
          return { history: newHistory };
        });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      loadFromHistory: (projectId: string, historyId: string) => {
        const entry = get().history.find((h) => h.id === historyId);
        if (!entry) return;

        const newRequest = {
          ...entry.request,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        const tab: RequestTab = {
          id: crypto.randomUUID(),
          requestId: newRequest.id,
          name: newRequest.name || `${newRequest.method} ${new URL(newRequest.url).pathname}`,
          isDirty: false,
        };

        set((state) => {
          const newTabs = new Map(state.tabs);
          const projectTabs = newTabs.get(projectId) || [];
          newTabs.set(projectId, [...projectTabs, tab]);

          const newActiveTabId = new Map(state.activeTabId);
          newActiveTabId.set(projectId, tab.id);

          const newRequests = new Map(state.requests);
          newRequests.set(newRequest.id, newRequest);

          return {
            tabs: newTabs,
            activeTabId: newActiveTabId,
            requests: newRequests,
          };
        });
      },

      // Webhook actions
      addWebhookServer: (server: WebhookServer) => {
        set((state) => ({
          webhookServers: [...state.webhookServers, server],
        }));
      },

      removeWebhookServer: (serverId: string) => {
        set((state) => {
          const newWebhookRequests = new Map(state.webhookRequests);
          newWebhookRequests.delete(serverId);
          return {
            webhookServers: state.webhookServers.filter((s) => s.id !== serverId),
            webhookRequests: newWebhookRequests,
          };
        });
      },

      updateWebhookServer: (serverId: string, updates: Partial<WebhookServer>) => {
        set((state) => ({
          webhookServers: state.webhookServers.map((s) =>
            s.id === serverId ? { ...s, ...updates } : s
          ),
        }));
      },

      addWebhookRequest: (serverId: string, request: WebhookRequest) => {
        set((state) => {
          const newWebhookRequests = new Map(state.webhookRequests);
          const existing = newWebhookRequests.get(serverId) || [];
          newWebhookRequests.set(serverId, [request, ...existing].slice(0, 50));
          return { webhookRequests: newWebhookRequests };
        });
      },

      clearWebhookRequests: (serverId: string) => {
        set((state) => {
          const newWebhookRequests = new Map(state.webhookRequests);
          newWebhookRequests.set(serverId, []);
          return { webhookRequests: newWebhookRequests };
        });
      },

      getWebhookRequests: (serverId: string) => {
        return get().webhookRequests.get(serverId) || [];
      },

      reset: () => {
        set({
          tabs: new Map(),
          activeTabId: new Map(),
          requests: new Map(),
          responses: new Map(),
          history: [],
          webhookServers: [],
          webhookRequests: new Map(),
          isLoading: new Map(),
        });
      },
    }),
    {
      name: "wynter-code-api-tester",
      partialize: (state) => ({
        tabs: Array.from(state.tabs.entries()),
        activeTabId: Array.from(state.activeTabId.entries()),
        requests: Array.from(state.requests.entries()),
        history: state.history,
        webhookServers: state.webhookServers.map((s) => ({ ...s, isRunning: false })),
      }),
      merge: (persisted: unknown, current) => {
        const data = persisted as {
          tabs?: [string, RequestTab[]][];
          activeTabId?: [string, string][];
          requests?: [string, ApiRequest][];
          history?: HistoryEntry[];
          webhookServers?: WebhookServer[];
        } | null;

        return {
          ...current,
          tabs: new Map(data?.tabs || []),
          activeTabId: new Map(data?.activeTabId || []),
          requests: new Map(data?.requests || []) as Map<string, ApiRequest>,
          history: data?.history || [],
          webhookServers: data?.webhookServers?.map((s) => ({ ...s, isRunning: false })) || [],
          responses: new Map(),
          webhookRequests: new Map(),
          isLoading: new Map(),
        };
      },
    }
  )
);
