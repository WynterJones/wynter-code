# Database Viewer Implementation Plan

## Overview
Add a full-screen Database Viewer popup accessible via a database icon in the header (next to the moon icon). Supports SQLite, PostgreSQL, MySQL, remote connections, and Supabase with full CRUD and SQL execution.

## Requirements
- **Header Icon**: Database icon next to moon icon in ProjectTabBar
- **Popup with Tabs**: Browser tab (tables + CRUD) and SQL Runner tab
- **Database Types**: SQLite files, PostgreSQL, MySQL (local and remote), Supabase
- **Features**: Full CRUD in data grid, basic SQL query execution with results

---

## Files to Create

### Rust Backend
| File | Purpose |
|------|---------|
| `src-tauri/src/database_viewer.rs` | Connection management, query execution, schema introspection, CRUD |

### Frontend
| File | Purpose |
|------|---------|
| `src/types/databaseViewer.ts` | TypeScript interfaces |
| `src/stores/databaseViewerStore.ts` | Zustand state management |
| `src/components/tools/database-viewer/DatabaseViewerPopup.tsx` | Main popup container |
| `src/components/tools/database-viewer/ConnectionManager.tsx` | Connection list/CRUD UI |
| `src/components/tools/database-viewer/ConnectionForm.tsx` | Add/edit connection modal |
| `src/components/tools/database-viewer/TableBrowser.tsx` | Table tree view |
| `src/components/tools/database-viewer/SchemaViewer.tsx` | Column/index display |
| `src/components/tools/database-viewer/DataGrid.tsx` | CRUD data table |
| `src/components/tools/database-viewer/SqlRunner.tsx` | SQL editor + execution |
| `src/components/tools/database-viewer/ResultsTable.tsx` | Query results |
| `src/components/tools/database-viewer/index.ts` | Exports |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add `sqlx` with sqlite/postgres/mysql features |
| `src-tauri/src/main.rs` | Register commands, add DatabaseManager state |
| `src/components/layout/ProjectTabBar.tsx` | Add Database icon + popup state (after line 694) |
| `src/components/tools/ToolsDropdown.tsx` | Add to TOOL_DEFINITIONS |

---

## Rust Commands

```rust
// Connection
db_test_connection(config) -> bool
db_connect(connection_id, config) -> ()
db_disconnect(connection_id) -> ()

// Schema
db_list_tables(connection_id) -> Vec<TableInfo>
db_get_table_schema(connection_id, table_name) -> TableSchema

// Query
db_execute_query(connection_id, query, params) -> QueryResult
db_fetch_rows(connection_id, table_name, limit, offset, filters, sort) -> FetchResult

// CRUD
db_insert_row(connection_id, table_name, data) -> InsertResult
db_update_row(connection_id, table_name, primary_key, data) -> u64
db_delete_row(connection_id, table_name, primary_key) -> u64
```

---

## Implementation Steps

### Phase 1: Foundation
1. **Cargo.toml**: Add `sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "postgres", "mysql", "tls-rustls"] }`
2. **database_viewer.rs**: Create module with DatabaseManager struct, connection pooling
3. **types/databaseViewer.ts**: Define ConnectionConfig, TableInfo, ColumnInfo, QueryResult interfaces
4. **databaseViewerStore.ts**: Zustand store with connections (persisted), active state, query state

### Phase 2: Core UI
5. **DatabaseViewerPopup.tsx**: Modal with tabs (Browser, SQL Runner), connection selector
6. **ProjectTabBar.tsx**: Add `Database` icon from lucide-react after Moon icon (line 694):
   ```tsx
   {/* Database Viewer */}
   <div className="border-l border-border px-2 h-full flex items-center">
     <Tooltip content="Database Viewer">
       <IconButton size="sm" onClick={() => setShowDatabaseViewer(true)}>
         <Database className="w-4 h-4" />
       </IconButton>
     </Tooltip>
   </div>
   ```
7. **ToolsDropdown.tsx**: Add Database Viewer to TOOL_DEFINITIONS

### Phase 3: Connection Management
8. **ConnectionManager.tsx**: List connections, add/edit/delete buttons
9. **ConnectionForm.tsx**: Form with fields based on database type (SQLite: file path, Postgres/MySQL: host, port, database, user, password, SSL)
10. **Rust**: Implement db_test_connection, db_connect, db_disconnect

### Phase 4: Table Browser
11. **Rust**: Implement db_list_tables, db_get_table_schema (handle dialect differences)
12. **TableBrowser.tsx**: Tree view of schemas/tables
13. **SchemaViewer.tsx**: Columns with types, keys, constraints

### Phase 5: Data Grid + CRUD
14. **Rust**: Implement db_fetch_rows with pagination/filters/sort
15. **DataGrid.tsx**: Paginated table, column sorting, inline editing
16. **Rust**: Implement db_insert_row, db_update_row, db_delete_row
17. Add row modal, delete confirmation, refresh on CRUD

### Phase 6: SQL Runner
18. **Rust**: Implement db_execute_query (handle SELECT vs INSERT/UPDATE/DELETE)
19. **SqlRunner.tsx**: Textarea/Monaco editor, execute button (Ctrl+Enter)
20. **ResultsTable.tsx**: Display query results with column headers

### Phase 7: Polish
21. Loading states, error handling, empty states
22. OverlayScrollbars for scrollable areas
23. Keyboard shortcuts (Escape to close, Ctrl+Enter to execute)

---

## UI Layout

```
DatabaseViewerPopup
+----------------------------------------------------------+
| [Connections v] [Browser] [SQL Runner]     [History] [X] |
+----------------------------------------------------------+
| Sidebar (optional)  |  Main Content                      |
| - Connection list   |  Browser: TableBrowser + DataGrid  |
| - Query history     |  SQL: Editor + ResultsTable        |
+----------------------------------------------------------+
| Status: Connected to local.db | Rows: 150 | Time: 12ms   |
+----------------------------------------------------------+
```

---

## Key Patterns to Follow

**Header icon** (ProjectTabBar.tsx:683-694):
- Wrap in `<div className="border-l border-border px-2 h-full flex items-center">`
- Use `<Tooltip>` + `<IconButton size="sm">`
- Icon: `<Database className="w-4 h-4" />`

**Popup** (reference ApiTesterPopup):
- Use `<Modal size="xl">` or custom full positioning
- Tabs in header, side panels for connections/history
- ScrollArea for content

**Zustand store** (reference apiTesterStore):
- Persist connections with `persist` middleware
- Separate runtime state (activeConnections, queryResults)

---

## Dependencies

**Cargo.toml addition:**
```toml
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "postgres", "mysql", "tls-rustls"] }
```

No new npm dependencies needed.
