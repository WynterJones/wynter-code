import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import { handleError } from "@/lib/errorHandler";
import type {
  ConnectionConfig,
  TableInfo,
  TableSchema,
  QueryResult,
  FetchResult,
  Filter,
  SortConfig,
  QueryHistoryEntry,
  DetectedService,
  RelationshipGraph,
} from "@/types";

interface DatabaseViewerStore {
  connections: ConnectionConfig[];
  activeConnectionId: string | null;
  isConnected: Map<string, boolean>;
  detectedServices: DetectedService[];
  detectingServices: boolean;
  tables: TableInfo[];
  selectedTable: string | null;
  tableSchema: TableSchema | null;
  tableData: Record<string, unknown>[];
  tableDataLoading: boolean;
  pagination: { limit: number; offset: number; total: number };
  filters: Filter[];
  sort: SortConfig | null;
  currentQuery: string;
  queryResults: QueryResult | null;
  queryHistory: QueryHistoryEntry[];
  queryLoading: boolean;
  activeTab: "browser" | "graph" | "sql";
  sidePanel: "connections" | "history" | null;
  relationshipGraph: RelationshipGraph | null;
  relationshipsLoading: boolean;
  connectionsSidebarCollapsed: boolean;
  isLoading: boolean;
  error: string | null;

  addConnection: (config: Omit<ConnectionConfig, "id">) => string;
  updateConnection: (id: string, updates: Partial<ConnectionConfig>) => void;
  deleteConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;

  connect: (connectionId: string) => Promise<void>;
  disconnect: (connectionId: string) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<boolean>;
  detectServices: () => Promise<void>;
  createConnectionFromService: (service: DetectedService) => void;

  loadTables: () => Promise<void>;
  selectTable: (tableName: string | null) => Promise<void>;
  loadTableData: () => Promise<void>;
  setFilters: (filters: Filter[]) => void;
  setSort: (sort: SortConfig | null) => void;
  setPagination: (pagination: { limit?: number; offset?: number }) => void;

  insertRow: (data: Record<string, unknown>) => Promise<void>;
  updateRow: (primaryKey: Record<string, unknown>, data: Record<string, unknown>) => Promise<void>;
  deleteRow: (primaryKey: Record<string, unknown>) => Promise<void>;

  setQuery: (query: string) => void;
  executeQuery: () => Promise<void>;
  clearQueryResults: () => void;

  loadRelationships: () => Promise<void>;
  setActiveTab: (tab: "browser" | "graph" | "sql") => void;
  setSidePanel: (panel: "connections" | "history" | null) => void;
  toggleConnectionsSidebar: () => void;
  clearError: () => void;

  // Reset
  reset: () => void;
}

const MAX_HISTORY = 50;

export const useDatabaseViewerStore = create<DatabaseViewerStore>()(
  persist(
    (set, get) => ({
      connections: [],
      activeConnectionId: null,
      isConnected: new Map(),
      detectedServices: [],
      detectingServices: false,
      tables: [],
      selectedTable: null,
      tableSchema: null,
      tableData: [],
      tableDataLoading: false,
      pagination: { limit: 50, offset: 0, total: 0 },
      filters: [],
      sort: null,
      currentQuery: "",
      queryResults: null,
      queryHistory: [],
      queryLoading: false,
      activeTab: "browser",
      sidePanel: "connections",
      relationshipGraph: null,
      relationshipsLoading: false,
      connectionsSidebarCollapsed: false,
      isLoading: false,
      error: null,

      addConnection: (config) => {
        const id = crypto.randomUUID();
        const newConnection: ConnectionConfig = { ...config, id };
        set((state) => ({
          connections: [...state.connections, newConnection],
        }));
        return id;
      },

      updateConnection: (id, updates) => {
        set((state) => ({
          connections: state.connections.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteConnection: (id) => {
        const state = get();
        if (state.isConnected.get(id)) {
          get().disconnect(id);
        }
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
          activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
        }));
      },

      setActiveConnection: (id) => {
        set({ activeConnectionId: id });
      },

      connect: async (connectionId) => {
        const state = get();
        const config = state.connections.find((c) => c.id === connectionId);
        if (!config) throw new Error("Connection not found");

        set({ isLoading: true, error: null });
        try {
          await invoke("db_connect", { connectionId, config });
          const newConnected = new Map(state.isConnected);
          newConnected.set(connectionId, true);
          set({
            isConnected: newConnected,
            activeConnectionId: connectionId,
            isLoading: false,
          });
          await get().loadTables();
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.connect") });
          throw error;
        }
      },

      disconnect: async (connectionId) => {
        const state = get();
        try {
          await invoke("db_disconnect", { connectionId });
        } catch (error) {
          // Ignore disconnect errors
        }
        const newConnected = new Map(state.isConnected);
        newConnected.delete(connectionId);
        set({
          isConnected: newConnected,
          tables: state.activeConnectionId === connectionId ? [] : state.tables,
          selectedTable: state.activeConnectionId === connectionId ? null : state.selectedTable,
          tableSchema: state.activeConnectionId === connectionId ? null : state.tableSchema,
          tableData: state.activeConnectionId === connectionId ? [] : state.tableData,
          activeConnectionId: state.activeConnectionId === connectionId ? null : state.activeConnectionId,
        });
      },

      testConnection: async (config) => {
        set({ isLoading: true, error: null });
        try {
          const result = await invoke<boolean>("db_test_connection", { config });
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.testConnection") });
          return false;
        }
      },

      detectServices: async () => {
        set({ detectingServices: true, error: null });
        try {
          const services = await invoke<DetectedService[]>("db_detect_services");
          set({ detectedServices: services, detectingServices: false });
        } catch (error) {
          set({ detectingServices: false, error: handleError(error, "DatabaseViewerStore.detectServices") });
        }
      },

      createConnectionFromService: (service) => {
        const name = service.serviceType === "postgres"
          ? "Local PostgreSQL"
          : "Local MySQL";

        const existingNames = get().connections.map(c => c.name);
        let finalName = name;
        let counter = 1;
        while (existingNames.includes(finalName)) {
          finalName = `${name} (${counter})`;
          counter++;
        }

        get().addConnection({
          name: finalName,
          type: service.serviceType,
          host: service.host,
          port: service.port,
          database: "",
          username: service.serviceType === "postgres" ? "postgres" : "root",
          password: "",
          ssl: false,
        });
      },

      loadTables: async () => {
        const state = get();
        if (!state.activeConnectionId || !state.isConnected.get(state.activeConnectionId)) {
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const tables = await invoke<TableInfo[]>("db_list_tables", {
            connectionId: state.activeConnectionId,
          });
          set({ tables, isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.loadTables") });
        }
      },

      selectTable: async (tableName) => {
        const state = get();
        if (!tableName) {
          set({ selectedTable: null, tableSchema: null, tableData: [] });
          return;
        }
        if (!state.activeConnectionId) return;

        set({ selectedTable: tableName, isLoading: true, error: null });
        try {
          const schema = await invoke<TableSchema>("db_get_table_schema", {
            connectionId: state.activeConnectionId,
            tableName,
          });
          set({
            tableSchema: schema,
            pagination: { ...state.pagination, offset: 0, total: 0 },
            filters: [],
            sort: null,
          });
          await get().loadTableData();
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.selectTable") });
        }
      },

      loadTableData: async () => {
        const state = get();
        if (!state.activeConnectionId || !state.selectedTable) return;

        set({ tableDataLoading: true, error: null });
        try {
          const result = await invoke<FetchResult>("db_fetch_rows", {
            connectionId: state.activeConnectionId,
            tableName: state.selectedTable,
            limit: state.pagination.limit,
            offset: state.pagination.offset,
            filters: state.filters.length > 0 ? state.filters : null,
            sort: state.sort,
          });
          set({
            tableData: result.rows,
            pagination: { ...state.pagination, total: result.totalCount },
            tableDataLoading: false,
            isLoading: false,
          });
        } catch (error) {
          set({ tableDataLoading: false, isLoading: false, error: handleError(error, "DatabaseViewerStore.loadTableData") });
        }
      },

      setFilters: (filters) => {
        set({ filters, pagination: { ...get().pagination, offset: 0 } });
        get().loadTableData();
      },

      setSort: (sort) => {
        set({ sort });
        get().loadTableData();
      },

      setPagination: (updates) => {
        set((state) => ({
          pagination: { ...state.pagination, ...updates },
        }));
        get().loadTableData();
      },

      insertRow: async (data) => {
        const state = get();
        if (!state.activeConnectionId || !state.selectedTable) return;

        set({ isLoading: true, error: null });
        try {
          await invoke("db_insert_row", {
            connectionId: state.activeConnectionId,
            tableName: state.selectedTable,
            data,
          });
          await get().loadTableData();
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.insertRow") });
          throw error;
        }
      },

      updateRow: async (primaryKey, data) => {
        const state = get();
        if (!state.activeConnectionId || !state.selectedTable) return;

        set({ isLoading: true, error: null });
        try {
          await invoke("db_update_row", {
            connectionId: state.activeConnectionId,
            tableName: state.selectedTable,
            primaryKey,
            data,
          });
          await get().loadTableData();
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.updateRow") });
          throw error;
        }
      },

      deleteRow: async (primaryKey) => {
        const state = get();
        if (!state.activeConnectionId || !state.selectedTable) return;

        set({ isLoading: true, error: null });
        try {
          await invoke("db_delete_row", {
            connectionId: state.activeConnectionId,
            tableName: state.selectedTable,
            primaryKey,
          });
          await get().loadTableData();
        } catch (error) {
          set({ isLoading: false, error: handleError(error, "DatabaseViewerStore.deleteRow") });
          throw error;
        }
      },

      setQuery: (query) => {
        set({ currentQuery: query });
      },

      executeQuery: async () => {
        const state = get();
        if (!state.activeConnectionId || !state.currentQuery.trim()) return;

        const historyEntry: QueryHistoryEntry = {
          id: crypto.randomUUID(),
          connectionId: state.activeConnectionId,
          query: state.currentQuery,
          timestamp: Date.now(),
          success: false,
        };

        set({ queryLoading: true, error: null });
        try {
          const result = await invoke<QueryResult>("db_execute_query", {
            connectionId: state.activeConnectionId,
            query: state.currentQuery,
          });
          historyEntry.success = true;
          historyEntry.executionTime = result.executionTime;
          set((state) => ({
            queryResults: result,
            queryLoading: false,
            queryHistory: [historyEntry, ...state.queryHistory].slice(0, MAX_HISTORY),
          }));
        } catch (error) {
          const message = handleError(error, "DatabaseViewerStore.executeQuery");
          historyEntry.error = message;
          set((state) => ({
            queryLoading: false,
            error: message,
            queryHistory: [historyEntry, ...state.queryHistory].slice(0, MAX_HISTORY),
          }));
        }
      },

      clearQueryResults: () => {
        set({ queryResults: null });
      },

      loadRelationships: async () => {
        const state = get();
        if (!state.activeConnectionId || !state.isConnected.get(state.activeConnectionId)) {
          return;
        }
        set({ relationshipsLoading: true, error: null });
        try {
          const graph = await invoke<RelationshipGraph>("db_get_relationships", {
            connectionId: state.activeConnectionId,
          });
          set({ relationshipGraph: graph, relationshipsLoading: false });
        } catch (error) {
          set({ relationshipsLoading: false, error: handleError(error, "DatabaseViewerStore.loadRelationships") });
        }
      },

      setActiveTab: (tab) => {
        set({ activeTab: tab });
      },

      setSidePanel: (panel) => {
        set({ sidePanel: panel });
      },

      toggleConnectionsSidebar: () => {
        set((state) => ({ connectionsSidebarCollapsed: !state.connectionsSidebarCollapsed }));
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          connections: [],
          activeConnectionId: null,
          isConnected: new Map(),
          detectedServices: [],
          detectingServices: false,
          tables: [],
          selectedTable: null,
          tableSchema: null,
          tableData: [],
          tableDataLoading: false,
          pagination: { limit: 50, offset: 0, total: 0 },
          filters: [],
          sort: null,
          currentQuery: "",
          queryResults: null,
          queryHistory: [],
          queryLoading: false,
          activeTab: "browser",
          sidePanel: "connections",
          relationshipGraph: null,
          relationshipsLoading: false,
          connectionsSidebarCollapsed: false,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: "database-viewer-storage",
      partialize: (state) => ({
        connections: state.connections,
        queryHistory: state.queryHistory,
      }),
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
    }
  )
);
