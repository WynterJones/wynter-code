export type DatabaseType = "sqlite" | "postgres" | "mysql";

export interface ConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  filePath?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  isSupabase?: boolean;
  projectRef?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  rowCount?: number;
  type: "table" | "view";
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue?: string;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowsAffected: number;
  executionTime: number;
}

export interface FetchResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  executionTime: number;
}

export interface Filter {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike";
  value: string;
}

export interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

export interface InsertResult {
  success: boolean;
  lastInsertId?: number;
}

export interface QueryHistoryEntry {
  id: string;
  connectionId: string;
  query: string;
  timestamp: number;
  success: boolean;
  error?: string;
  executionTime?: number;
}

export interface DetectedService {
  serviceType: "postgres" | "mysql";
  host: string;
  port: number;
  running: boolean;
  pid?: number;
  databases: string[];
}
