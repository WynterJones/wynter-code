import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useWorkspaceStore } from "./workspaceStore";
import { useProjectStore } from "./projectStore";
import { useOverwatchStore } from "./overwatchStore";
import { useSubscriptionStore } from "./subscriptionStore";
import { useBookmarkStore } from "./bookmarkStore";
import { useKanbanStore } from "./kanbanStore";
import type { KanbanStatus, KanbanPriority } from "@/types/kanban";

// Helper to wait for all persisted stores to rehydrate
async function waitForStoreRehydration(): Promise<void> {
  const stores = [
    useWorkspaceStore,
    useProjectStore,
    useOverwatchStore,
    useSubscriptionStore,
    useBookmarkStore,
    useKanbanStore,
  ];

  await Promise.all(
    stores.map((store) => {
      // If already hydrated, resolve immediately
      if (store.persist.hasHydrated()) {
        return Promise.resolve();
      }
      // Otherwise wait for hydration to finish
      return new Promise<void>((resolve) => {
        const unsubscribe = store.persist.onFinishHydration(() => {
          unsubscribe();
          resolve();
        });
      });
    })
  );
}

// Track store subscriptions for cleanup
let storeUnsubscribers: (() => void)[] = [];

// Debounce helper to avoid excessive syncs
function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return ((...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

// Setup subscriptions to stores that should trigger mobile API sync
function setupStoreSubscriptions(syncFn: () => Promise<void>): void {
  // Clean up any existing subscriptions
  cleanupStoreSubscriptions();

  // Debounce sync to avoid rapid successive calls
  const debouncedSync = debounce(() => {
    syncFn().catch((e) => console.error("[mobileApiStore] Auto-sync failed:", e));
  }, 500);

  // Track previous values for change detection
  let prevWorkspaces = JSON.stringify(useWorkspaceStore.getState().workspaces);
  let prevProjects = JSON.stringify(useProjectStore.getState().projects);
  let prevOverwatch = JSON.stringify({
    services: useOverwatchStore.getState().services,
    serviceData: Array.from(useOverwatchStore.getState().serviceData.entries()),
  });
  let prevSubscriptions = JSON.stringify({
    subscriptions: useSubscriptionStore.getState().subscriptions,
    categories: useSubscriptionStore.getState().categories,
  });
  let prevBookmarks = JSON.stringify({
    bookmarks: useBookmarkStore.getState().bookmarks,
    collections: useBookmarkStore.getState().collections,
  });
  let prevKanban = JSON.stringify({
    boards: Array.from(useKanbanStore.getState().boards.entries()),
  });

  // Subscribe to workspace store changes
  storeUnsubscribers.push(
    useWorkspaceStore.subscribe((state) => {
      const current = JSON.stringify(state.workspaces);
      if (current !== prevWorkspaces) {
        prevWorkspaces = current;
        console.log("[mobileApiStore] Workspaces changed, syncing...");
        debouncedSync();
      }
    })
  );

  // Subscribe to project store changes
  storeUnsubscribers.push(
    useProjectStore.subscribe((state) => {
      const current = JSON.stringify(state.projects);
      if (current !== prevProjects) {
        prevProjects = current;
        console.log("[mobileApiStore] Projects changed, syncing...");
        debouncedSync();
      }
    })
  );

  // Subscribe to overwatch store changes
  storeUnsubscribers.push(
    useOverwatchStore.subscribe((state) => {
      const current = JSON.stringify({
        services: state.services,
        serviceData: Array.from(state.serviceData.entries()),
      });
      if (current !== prevOverwatch) {
        prevOverwatch = current;
        console.log("[mobileApiStore] Overwatch changed, syncing...");
        debouncedSync();
      }
    })
  );

  // Subscribe to subscription store changes
  storeUnsubscribers.push(
    useSubscriptionStore.subscribe((state) => {
      const current = JSON.stringify({
        subscriptions: state.subscriptions,
        categories: state.categories,
      });
      if (current !== prevSubscriptions) {
        prevSubscriptions = current;
        console.log("[mobileApiStore] Subscriptions changed, syncing...");
        debouncedSync();
      }
    })
  );

  // Subscribe to bookmark store changes
  storeUnsubscribers.push(
    useBookmarkStore.subscribe((state) => {
      const current = JSON.stringify({
        bookmarks: state.bookmarks,
        collections: state.collections,
      });
      if (current !== prevBookmarks) {
        prevBookmarks = current;
        console.log("[mobileApiStore] Bookmarks changed, syncing...");
        debouncedSync();
      }
    })
  );

  // Subscribe to kanban store changes
  storeUnsubscribers.push(
    useKanbanStore.subscribe((state) => {
      const current = JSON.stringify({
        boards: Array.from(state.boards.entries()),
      });
      if (current !== prevKanban) {
        prevKanban = current;
        console.log("[mobileApiStore] Kanban changed, syncing...");
        debouncedSync();
      }
    })
  );

  console.log("[mobileApiStore] Store subscriptions setup complete");
}

// Cleanup store subscriptions
function cleanupStoreSubscriptions(): void {
  storeUnsubscribers.forEach((unsub) => unsub());
  storeUnsubscribers = [];
}

// Types matching the Rust backend
export interface PairedDevice {
  device_id: string;
  device_name: string;
  paired_at: number;
  last_seen: number;
}

export interface PairingCode {
  code: string;
  expires_at: number;
  host: string;
  port: number;
}

export interface MobileApiInfo {
  running: boolean;
  port: number;
  host: string;
}

interface MobileApiStore {
  // State
  serverInfo: MobileApiInfo | null;
  pairedDevices: PairedDevice[];
  currentPairingCode: PairingCode | null;
  loading: boolean;
  error: string | null;
  preferredPort: number;
  autoStartServer: boolean;

  // Actions
  startServer: (port?: number) => Promise<void>;
  stopServer: () => Promise<void>;
  refreshServerInfo: () => Promise<void>;
  generatePairingCode: () => Promise<PairingCode | null>;
  revokeDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;
  setPreferredPort: (port: number) => void;
  setAutoStartServer: (value: boolean) => void;
  clearError: () => void;
  reset: () => void;
  syncWorkspaces: () => Promise<void>;
}

const DEFAULT_PORT = 8765;

export const useMobileApiStore = create<MobileApiStore>()(
  persist(
    (set, get) => ({
      serverInfo: null,
      pairedDevices: [],
      currentPairingCode: null,
      loading: false,
      error: null,
      preferredPort: DEFAULT_PORT,
      autoStartServer: false,

      startServer: async (port?: number) => {
        set({ loading: true, error: null });
        try {
          const actualPort = port ?? get().preferredPort;
          const info = await invoke<MobileApiInfo>("mobile_api_start", {
            port: actualPort,
          });
          set({ serverInfo: info, loading: false });
          console.log("[mobileApiStore] Server started, refreshing devices...");
          // Refresh devices list after starting
          await get().refreshDevices();
          // Wait for all stores to rehydrate before syncing
          console.log("[mobileApiStore] Waiting for store rehydration...");
          await waitForStoreRehydration();
          console.log("[mobileApiStore] Store rehydration complete, syncing workspaces...");
          // Sync workspace data to make it available via mobile API
          await get().syncWorkspaces();
          console.log("[mobileApiStore] Initial sync complete, setting up subscriptions...");
          // Subscribe to store changes to keep mobile API in sync
          setupStoreSubscriptions(get().syncWorkspaces);
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      stopServer: async () => {
        set({ loading: true, error: null });
        try {
          // Clean up store subscriptions
          cleanupStoreSubscriptions();
          await invoke("mobile_api_stop");
          set({
            serverInfo: null,
            currentPairingCode: null,
            loading: false,
          });
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      refreshServerInfo: async () => {
        try {
          const info = await invoke<MobileApiInfo | null>("mobile_api_info");
          set({ serverInfo: info });
        } catch (e) {
          console.error("Failed to refresh server info:", e);
        }
      },

      generatePairingCode: async () => {
        set({ loading: true, error: null });
        try {
          const code = await invoke<PairingCode>(
            "mobile_api_generate_pairing_code"
          );
          set({ currentPairingCode: code, loading: false });
          return code;
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
          return null;
        }
      },

      revokeDevice: async (deviceId: string) => {
        set({ loading: true, error: null });
        try {
          await invoke("mobile_api_revoke_device", { deviceId });
          set((state) => ({
            pairedDevices: state.pairedDevices.filter(
              (d) => d.device_id !== deviceId
            ),
            loading: false,
          }));
        } catch (e) {
          set({
            error: e instanceof Error ? e.message : String(e),
            loading: false,
          });
        }
      },

      refreshDevices: async () => {
        try {
          const devices = await invoke<PairedDevice[]>(
            "mobile_api_list_devices"
          );
          set({ pairedDevices: devices });
        } catch (e) {
          console.error("Failed to refresh devices:", e);
        }
      },

      setPreferredPort: (port: number) => {
        set({ preferredPort: port });
      },

      setAutoStartServer: (value: boolean) => {
        set({ autoStartServer: value });
      },

      clearError: () => {
        set({ error: null });
      },

      syncWorkspaces: async () => {
        try {
          // Debug: Check raw localStorage
          const rawWorkspaces = localStorage.getItem("wynter-code-workspaces");
          const rawProjects = localStorage.getItem("wynter-code-projects");
          console.log("[mobileApiStore] Raw localStorage:", {
            workspaces: rawWorkspaces ? JSON.parse(rawWorkspaces) : null,
            projects: rawProjects ? JSON.parse(rawProjects) : null,
          });

          // Debug: Check hydration state
          console.log("[mobileApiStore] Hydration state:", {
            workspaceHydrated: useWorkspaceStore.persist.hasHydrated(),
            projectHydrated: useProjectStore.persist.hasHydrated(),
          });

          // Get workspace and project data from their stores
          const workspaceState = useWorkspaceStore.getState();
          const projectState = useProjectStore.getState();
          const overwatchState = useOverwatchStore.getState();
          const subscriptionState = useSubscriptionStore.getState();
          const bookmarkState = useBookmarkStore.getState();
          const kanbanState = useKanbanStore.getState();

          // Refresh overwatch services if they have no data yet
          // This populates the serviceData Map with current status/metrics
          const servicesWithoutData = overwatchState.services.filter(
            (s) => s.provider !== "link" && s.enabled && !overwatchState.serviceData.has(s.id)
          );
          if (servicesWithoutData.length > 0) {
            console.log(`[mobileApiStore] Refreshing ${servicesWithoutData.length} overwatch services...`);
            await Promise.all(
              servicesWithoutData.map((s) => overwatchState.refreshService(s.id))
            );
            // Re-get overwatch state after refresh
            const refreshedOverwatchState = useOverwatchStore.getState();
            Object.assign(overwatchState, { serviceData: refreshedOverwatchState.serviceData });
          }

          console.log("[mobileApiStore] syncWorkspaces called, store states:", {
            workspaces: workspaceState.workspaces.length,
            projects: projectState.projects.length,
            workspaceData: workspaceState.workspaces,
            projectData: projectState.projects,
          });

          // Transform workspaces to the format expected by Rust
          const workspaces = workspaceState.workspaces.map((w) => ({
            id: w.id,
            name: w.name,
            color: w.color,
            project_ids: w.projectIds,
          }));

          // Transform projects to the format expected by Rust
          const projects = projectState.projects.map((p) => ({
            id: p.id,
            name: p.name,
            path: p.path,
            color: p.color || null,
          }));

          // Transform overwatch services
          const overwatch_services = overwatchState.services.map((s, index) => {
            const serviceData = overwatchState.serviceData.get(s.id);
            return {
              id: s.id,
              workspace_id: s.workspaceId,
              provider: s.provider,
              name: s.name,
              external_url: s.externalUrl || null,
              status: serviceData?.status || null,
              link_icon: s.linkIcon || null,
              link_color: s.linkColor || null,
              enabled: s.enabled,
              sort_order: s.sortOrder ?? index,
              metrics: serviceData?.metrics ? JSON.parse(JSON.stringify(serviceData.metrics)) : null,
              last_updated: serviceData?.lastUpdated || null,
              error: serviceData?.error || null,
            };
          });

          // Transform subscriptions
          const subscriptions = subscriptionState.subscriptions.map((s, index) => ({
            id: s.id,
            workspace_id: s.workspaceId,
            name: s.name,
            url: s.url,
            favicon_url: s.faviconUrl,
            monthly_cost: s.monthlyCost,
            billing_cycle: s.billingCycle,
            currency: s.currency,
            category_id: s.categoryId,
            notes: s.notes,
            is_active: s.isActive,
            sort_order: s.sortOrder ?? index,
          }));

          // Transform subscription categories
          const subscription_categories = subscriptionState.categories.map((c, index) => ({
            id: c.id,
            workspace_id: c.workspaceId,
            name: c.name,
            color: c.color,
            sort_order: c.sortOrder ?? index,
          }));

          // Transform bookmarks
          const bookmarks = bookmarkState.bookmarks.map((b, index) => ({
            id: b.id,
            url: b.url,
            title: b.title,
            description: b.description || null,
            favicon_url: b.faviconUrl || null,
            collection_id: b.collectionId,
            order: b.order ?? index,
          }));

          // Transform bookmark collections
          const bookmark_collections = bookmarkState.collections.map((c, index) => ({
            id: c.id,
            name: c.name,
            icon: c.icon || null,
            color: c.color || null,
            order: c.order ?? index,
          }));

          // Transform kanban boards
          const kanban_boards = Array.from(kanbanState.boards.entries()).map(([workspaceId, board]) => ({
            workspace_id: workspaceId,
            tasks: board.tasks.map((t, index) => ({
              id: t.id,
              title: t.title,
              description: t.description || null,
              status: t.status,
              priority: t.priority ?? 2,
              created_at: t.createdAt ?? Date.now(),
              updated_at: t.updatedAt ?? Date.now(),
              order: t.order ?? index,
              locked: t.locked || false,
            })),
          }));

          // Sync all data to Rust backend
          // Note: Tauri converts snake_case Rust params to camelCase for JS
          await invoke("mobile_api_sync_all_data", {
            workspaces,
            projects,
            overwatchServices: overwatch_services,
            subscriptions,
            subscriptionCategories: subscription_categories,
            bookmarks,
            bookmarkCollections: bookmark_collections,
            kanbanBoards: kanban_boards,
          });
          console.log(
            `[mobileApiStore] Synced ${workspaces.length} workspaces, ${projects.length} projects, ` +
            `${overwatch_services.length} services, ${subscriptions.length} subscriptions, ${bookmarks.length} bookmarks, ` +
            `${kanban_boards.length} kanban boards`
          );
        } catch (e) {
          console.error("[mobileApiStore] Failed to sync data:", e);
        }
      },

      reset: () => {
        set({
          serverInfo: null,
          pairedDevices: [],
          currentPairingCode: null,
          loading: false,
          error: null,
          preferredPort: DEFAULT_PORT,
          autoStartServer: false,
        });
      },
    }),
    {
      name: "wynter-code-mobile-api",
      partialize: (state) => ({
        preferredPort: state.preferredPort,
        autoStartServer: state.autoStartServer,
      }),
    }
  )
);

// Helper to generate QR code data URL
export function generateQRCodeUrl(pairingCode: PairingCode): string {
  return `wynter://pair?code=${pairingCode.code}&host=${pairingCode.host}&port=${pairingCode.port}`;
}

// Helper to format pairing code for display (with dashes)
export function formatPairingCode(code: string): string {
  if (code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

// Helper to format time ago
export function formatTimeAgo(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

// Track mobile CRUD event listeners for cleanup
let mobileEventUnlisteners: UnlistenFn[] = [];

// Mobile CRUD event types
interface MobileCreateWorkspaceEvent {
  id: string;
  name: string;
  color: string;
}

interface MobileUpdateWorkspaceEvent {
  id: string;
  name?: string;
  color?: string;
}

interface MobileDeleteWorkspaceEvent {
  id: string;
}

interface MobileCreateProjectEvent {
  id: string;
  name: string;
  path: string;
  color?: string;
  workspace_id: string;
}

interface MobileUpdateProjectEvent {
  id: string;
  name?: string;
  color?: string;
}

interface MobileDeleteProjectEvent {
  id: string;
}

// Subscription CRUD event types
interface MobileCreateSubscriptionEvent {
  id: string;
  workspace_id: string;
  name: string;
  url?: string;
  favicon_url?: string;
  monthly_cost: number;
  billing_cycle: string;
  currency: string;
  category_id?: string;
  notes?: string;
  is_active: boolean;
  sort_order: number;
}

interface MobileUpdateSubscriptionEvent {
  id: string;
  name?: string;
  url?: string;
  favicon_url?: string;
  monthly_cost?: number;
  billing_cycle?: string;
  currency?: string;
  category_id?: string;
  notes?: string;
  is_active?: boolean;
  sort_order?: number;
}

interface MobileDeleteSubscriptionEvent {
  id: string;
}

// Subscription Category CRUD event types
interface MobileCreateSubscriptionCategoryEvent {
  id: string;
  workspace_id: string;
  name: string;
  color?: string;
  sort_order: number;
}

interface MobileUpdateSubscriptionCategoryEvent {
  id: string;
  name?: string;
  color?: string;
  sort_order?: number;
}

interface MobileDeleteSubscriptionCategoryEvent {
  id: string;
}

// Kanban CRUD event types
interface MobileKanbanCreateEvent {
  workspace_id: string;
  id: string;
  title: string;
  description?: string;
  priority: number;
}

interface MobileKanbanUpdateEvent {
  workspace_id: string;
  task_id: string;
  title?: string;
  description?: string;
  priority?: number;
  locked?: boolean;
}

interface MobileKanbanDeleteEvent {
  workspace_id: string;
  task_id: string;
}

interface MobileKanbanMoveEvent {
  workspace_id: string;
  task_id: string;
  status: string;
  order?: number;
}

// Bookmark CRUD event types
interface MobileBookmarkCreateEvent {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon_url?: string;
  collection_id?: string;
  order: number;
}

interface MobileBookmarkUpdateEvent {
  id: string;
  url?: string;
  title?: string;
  description?: string;
  favicon_url?: string;
  collection_id?: string;
  order?: number;
}

interface MobileBookmarkDeleteEvent {
  id: string;
}

// Bookmark Collection CRUD event types
interface MobileBookmarkCollectionCreateEvent {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
}

interface MobileBookmarkCollectionUpdateEvent {
  id: string;
  name?: string;
  icon?: string;
  color?: string;
  order?: number;
}

interface MobileBookmarkCollectionDeleteEvent {
  id: string;
}

// Setup listeners for mobile CRUD events from Rust backend
async function setupMobileCrudListeners(): Promise<void> {
  // Clean up existing listeners
  await cleanupMobileCrudListeners();

  console.log("[mobileApiStore] Setting up mobile CRUD event listeners...");

  // Workspace create
  mobileEventUnlisteners.push(
    await listen<MobileCreateWorkspaceEvent>("mobile-workspace-create", (event) => {
      console.log("[mobileApiStore] Received mobile-workspace-create:", event.payload);
      const workspaceStore = useWorkspaceStore.getState();
      // Use the store's addWorkspace but with the provided ID
      workspaceStore.addWorkspaceWithId(event.payload.id, event.payload.name, event.payload.color);
    })
  );

  // Workspace update
  mobileEventUnlisteners.push(
    await listen<MobileUpdateWorkspaceEvent>("mobile-workspace-update", (event) => {
      console.log("[mobileApiStore] Received mobile-workspace-update:", event.payload);
      const workspaceStore = useWorkspaceStore.getState();
      const updates: { name?: string; color?: string } = {};
      if (event.payload.name) updates.name = event.payload.name;
      if (event.payload.color) updates.color = event.payload.color;
      workspaceStore.updateWorkspace(event.payload.id, updates);
    })
  );

  // Workspace delete
  mobileEventUnlisteners.push(
    await listen<MobileDeleteWorkspaceEvent>("mobile-workspace-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-workspace-delete:", event.payload);
      const workspaceStore = useWorkspaceStore.getState();
      workspaceStore.removeWorkspace(event.payload.id);
    })
  );

  // Project create
  mobileEventUnlisteners.push(
    await listen<MobileCreateProjectEvent>("mobile-project-create", (event) => {
      console.log("[mobileApiStore] Received mobile-project-create:", event.payload);
      const projectStore = useProjectStore.getState();
      const workspaceStore = useWorkspaceStore.getState();

      // Add project with the provided ID
      projectStore.addProjectWithId(event.payload.id, event.payload.path, event.payload.name, event.payload.color);

      // Add project to workspace
      workspaceStore.addProjectToWorkspace(event.payload.workspace_id, event.payload.id);
    })
  );

  // Project update
  mobileEventUnlisteners.push(
    await listen<MobileUpdateProjectEvent>("mobile-project-update", (event) => {
      console.log("[mobileApiStore] Received mobile-project-update:", event.payload);
      const projectStore = useProjectStore.getState();
      if (event.payload.name) {
        projectStore.updateProjectName(event.payload.id, event.payload.name);
      }
      if (event.payload.color) {
        projectStore.updateProjectColor(event.payload.id, event.payload.color);
      }
    })
  );

  // Project delete
  mobileEventUnlisteners.push(
    await listen<MobileDeleteProjectEvent>("mobile-project-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-project-delete:", event.payload);
      const projectStore = useProjectStore.getState();
      projectStore.removeProject(event.payload.id);
    })
  );

  // Subscription create
  mobileEventUnlisteners.push(
    await listen<MobileCreateSubscriptionEvent>("mobile-subscription-create", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-create:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      subscriptionStore.addSubscriptionWithId(event.payload.id, {
        workspaceId: event.payload.workspace_id,
        name: event.payload.name,
        url: event.payload.url ?? null,
        faviconUrl: event.payload.favicon_url ?? null,
        monthlyCost: event.payload.monthly_cost,
        billingCycle: event.payload.billing_cycle as "monthly" | "yearly" | "quarterly" | "weekly" | "one-time",
        currency: event.payload.currency as "USD" | "EUR" | "GBP" | "CAD" | "AUD",
        categoryId: event.payload.category_id ?? null,
        notes: event.payload.notes ?? null,
        isActive: event.payload.is_active,
        sortOrder: event.payload.sort_order,
      });
    })
  );

  // Subscription update
  mobileEventUnlisteners.push(
    await listen<MobileUpdateSubscriptionEvent>("mobile-subscription-update", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-update:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      const updates: Partial<{
        name: string;
        url: string | null;
        faviconUrl: string | null;
        monthlyCost: number;
        billingCycle: "monthly" | "yearly" | "quarterly" | "weekly" | "one-time";
        currency: "USD" | "EUR" | "GBP" | "CAD" | "AUD";
        categoryId: string | null;
        notes: string | null;
        isActive: boolean;
        sortOrder: number;
      }> = {};
      if (event.payload.name !== undefined) updates.name = event.payload.name;
      if (event.payload.url !== undefined) updates.url = event.payload.url ?? null;
      if (event.payload.favicon_url !== undefined) updates.faviconUrl = event.payload.favicon_url ?? null;
      if (event.payload.monthly_cost !== undefined) updates.monthlyCost = event.payload.monthly_cost;
      if (event.payload.billing_cycle !== undefined) updates.billingCycle = event.payload.billing_cycle as "monthly" | "yearly" | "quarterly" | "weekly" | "one-time";
      if (event.payload.currency !== undefined) updates.currency = event.payload.currency as "USD" | "EUR" | "GBP" | "CAD" | "AUD";
      if (event.payload.category_id !== undefined) updates.categoryId = event.payload.category_id ?? null;
      if (event.payload.notes !== undefined) updates.notes = event.payload.notes ?? null;
      if (event.payload.is_active !== undefined) updates.isActive = event.payload.is_active;
      if (event.payload.sort_order !== undefined) updates.sortOrder = event.payload.sort_order;
      subscriptionStore.updateSubscription(event.payload.id, updates);
    })
  );

  // Subscription delete
  mobileEventUnlisteners.push(
    await listen<MobileDeleteSubscriptionEvent>("mobile-subscription-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-delete:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      subscriptionStore.deleteSubscription(event.payload.id);
    })
  );

  // Subscription category create
  mobileEventUnlisteners.push(
    await listen<MobileCreateSubscriptionCategoryEvent>("mobile-subscription-category-create", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-category-create:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      subscriptionStore.addCategoryWithId(event.payload.id, {
        workspaceId: event.payload.workspace_id,
        name: event.payload.name,
        color: event.payload.color ?? null,
        sortOrder: event.payload.sort_order,
      });
    })
  );

  // Subscription category update
  mobileEventUnlisteners.push(
    await listen<MobileUpdateSubscriptionCategoryEvent>("mobile-subscription-category-update", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-category-update:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      const updates: Partial<{ name: string; color: string | null; sortOrder: number }> = {};
      if (event.payload.name !== undefined) updates.name = event.payload.name;
      if (event.payload.color !== undefined) updates.color = event.payload.color ?? null;
      if (event.payload.sort_order !== undefined) updates.sortOrder = event.payload.sort_order;
      subscriptionStore.updateCategory(event.payload.id, updates);
    })
  );

  // Subscription category delete
  mobileEventUnlisteners.push(
    await listen<MobileDeleteSubscriptionCategoryEvent>("mobile-subscription-category-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-subscription-category-delete:", event.payload);
      const subscriptionStore = useSubscriptionStore.getState();
      subscriptionStore.deleteCategory(event.payload.id);
    })
  );

  // Kanban create
  mobileEventUnlisteners.push(
    await listen<MobileKanbanCreateEvent>("mobile-kanban-create", (event) => {
      console.log("[mobileApiStore] Received mobile-kanban-create:", event.payload);
      const kanbanStore = useKanbanStore.getState();
      kanbanStore.createTaskWithId(
        event.payload.workspace_id,
        event.payload.id,
        event.payload.title,
        event.payload.priority as KanbanPriority,
        event.payload.description
      );
    })
  );

  // Kanban update
  mobileEventUnlisteners.push(
    await listen<MobileKanbanUpdateEvent>("mobile-kanban-update", (event) => {
      console.log("[mobileApiStore] Received mobile-kanban-update:", event.payload);
      const kanbanStore = useKanbanStore.getState();
      const updates: Partial<{ title: string; description: string; priority: KanbanPriority; locked: boolean }> = {};
      if (event.payload.title !== undefined) updates.title = event.payload.title;
      if (event.payload.description !== undefined) updates.description = event.payload.description;
      if (event.payload.priority !== undefined) updates.priority = event.payload.priority as KanbanPriority;
      if (event.payload.locked !== undefined) updates.locked = event.payload.locked;
      kanbanStore.updateTask(event.payload.workspace_id, event.payload.task_id, updates);
    })
  );

  // Kanban delete
  mobileEventUnlisteners.push(
    await listen<MobileKanbanDeleteEvent>("mobile-kanban-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-kanban-delete:", event.payload);
      const kanbanStore = useKanbanStore.getState();
      kanbanStore.deleteTask(event.payload.workspace_id, event.payload.task_id);
    })
  );

  // Kanban move
  mobileEventUnlisteners.push(
    await listen<MobileKanbanMoveEvent>("mobile-kanban-move", (event) => {
      console.log("[mobileApiStore] Received mobile-kanban-move:", event.payload);
      const kanbanStore = useKanbanStore.getState();
      kanbanStore.moveTask(
        event.payload.workspace_id,
        event.payload.task_id,
        event.payload.status as KanbanStatus,
        event.payload.order
      );
    })
  );

  // Bookmark create
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkCreateEvent>("mobile-bookmark-create", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-create:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      bookmarkStore.addBookmarkWithId(event.payload.id, {
        url: event.payload.url,
        title: event.payload.title,
        description: event.payload.description,
        faviconUrl: event.payload.favicon_url,
        collectionId: event.payload.collection_id ?? null,
        order: event.payload.order,
      });
    })
  );

  // Bookmark update
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkUpdateEvent>("mobile-bookmark-update", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-update:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      const updates: Partial<{
        url: string;
        title: string;
        description: string;
        faviconUrl: string;
        collectionId: string | null;
        order: number;
      }> = {};
      if (event.payload.url !== undefined) updates.url = event.payload.url;
      if (event.payload.title !== undefined) updates.title = event.payload.title;
      if (event.payload.description !== undefined) updates.description = event.payload.description;
      if (event.payload.favicon_url !== undefined) updates.faviconUrl = event.payload.favicon_url;
      if (event.payload.collection_id !== undefined) updates.collectionId = event.payload.collection_id ?? null;
      if (event.payload.order !== undefined) updates.order = event.payload.order;
      bookmarkStore.updateBookmark(event.payload.id, updates);
    })
  );

  // Bookmark delete
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkDeleteEvent>("mobile-bookmark-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-delete:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      bookmarkStore.deleteBookmark(event.payload.id);
    })
  );

  // Bookmark collection create
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkCollectionCreateEvent>("mobile-bookmark-collection-create", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-collection-create:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      bookmarkStore.addCollectionWithId(event.payload.id, {
        name: event.payload.name,
        icon: event.payload.icon,
        color: event.payload.color,
        order: event.payload.order,
      });
    })
  );

  // Bookmark collection update
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkCollectionUpdateEvent>("mobile-bookmark-collection-update", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-collection-update:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      const updates: Partial<{ name: string; icon: string; color: string; order: number }> = {};
      if (event.payload.name !== undefined) updates.name = event.payload.name;
      if (event.payload.icon !== undefined) updates.icon = event.payload.icon;
      if (event.payload.color !== undefined) updates.color = event.payload.color;
      if (event.payload.order !== undefined) updates.order = event.payload.order;
      bookmarkStore.updateCollection(event.payload.id, updates);
    })
  );

  // Bookmark collection delete
  mobileEventUnlisteners.push(
    await listen<MobileBookmarkCollectionDeleteEvent>("mobile-bookmark-collection-delete", (event) => {
      console.log("[mobileApiStore] Received mobile-bookmark-collection-delete:", event.payload);
      const bookmarkStore = useBookmarkStore.getState();
      bookmarkStore.deleteCollection(event.payload.id);
    })
  );

  console.log("[mobileApiStore] Mobile CRUD event listeners setup complete");
}

// Cleanup mobile CRUD event listeners
async function cleanupMobileCrudListeners(): Promise<void> {
  for (const unlisten of mobileEventUnlisteners) {
    unlisten();
  }
  mobileEventUnlisteners = [];
}

// Initialize mobile API on app startup
// This handles auto-start and re-syncing if server was already running
export async function initializeMobileApi(): Promise<void> {
  const store = useMobileApiStore.getState();

  console.log("[mobileApiStore] Initializing mobile API...");

  // First check if server is already running
  await store.refreshServerInfo();

  const { serverInfo, autoStartServer } = useMobileApiStore.getState();
  console.log("[mobileApiStore] Server status:", { serverInfo, autoStartServer });

  // Always set up mobile CRUD listeners when initializing
  await setupMobileCrudListeners();

  if (serverInfo?.running) {
    // Server is already running, make sure data is synced
    console.log("[mobileApiStore] Server already running, syncing data...");
    await waitForStoreRehydration();
    await store.syncWorkspaces();
    setupStoreSubscriptions(store.syncWorkspaces);
  } else if (autoStartServer) {
    // Auto-start is enabled, start the server
    console.log("[mobileApiStore] Auto-starting server...");
    await store.startServer();
  } else {
    console.log("[mobileApiStore] Server not running and auto-start disabled, skipping sync");
  }
}
