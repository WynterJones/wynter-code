# Overwatch - Workspace Service Monitoring

## Overview
Per-workspace monitoring of external production services with read-only stats displayed in a grid of cards. Focus on visibility, not full API coverage.

**Services**: Railway, Plausible, Netlify, Sentry
**Integration**: Read-only stats (no write actions)
**Layout**: Grid of cards showing all services at once

---

## File Structure

```
src/
  types/overwatch.ts                    # Type definitions
  stores/overwatchStore.ts              # Zustand store (workspace-scoped)
  components/tools/overwatch/
    index.ts                            # Exports
    OverwatchPopup.tsx                  # Main modal popup
    ServiceCard.tsx                     # Base card component
    ServiceConfigModal.tsx              # Add/edit service dialog
    RailwayCard.tsx                     # Railway-specific metrics
    PlausibleCard.tsx                   # Plausible analytics card
    NetlifyCard.tsx                     # Netlify deploy status
    SentryCard.tsx                      # Sentry error metrics
    StatusIndicator.tsx                 # Status dot (green/yellow/red)

src-tauri/src/
  overwatch.rs                          # Rust backend for API calls
```

---

## Key Types

```typescript
type ServiceProvider = "railway" | "plausible" | "netlify" | "sentry";
type ConnectionMode = "link" | "api";  // link-only or full API integration
type ServiceStatus = "healthy" | "degraded" | "down" | "unknown" | "loading";

interface ServiceConfig {
  id: string;
  workspaceId: string;
  provider: ServiceProvider;
  name: string;
  connectionMode: ConnectionMode;
  externalUrl?: string;       // Dashboard link
  apiKeyId?: string;          // Reference to envStore global variable
  projectId?: string;         // Provider-specific identifier
  enabled: boolean;
  sortOrder: number;
}
```

---

## Store Design (workspace-scoped like subscriptionStore)

```typescript
interface OverwatchStore {
  services: ServiceConfig[];                    // Persisted configs
  serviceData: Map<string, ServiceData>;        // Runtime metrics

  // CRUD
  addService(workspaceId, input): string;
  updateService(id, updates): void;
  deleteService(id): void;

  // Queries
  getServicesForWorkspace(workspaceId): ServiceConfig[];

  // Fetching
  refreshService(serviceId): Promise<void>;
  refreshAllServices(workspaceId): Promise<void>;
}
```

---

## Rust Backend Commands

```rust
#[tauri::command]
async fn overwatch_railway_status(api_key: String, project_id: String) -> Result<...>;

#[tauri::command]
async fn overwatch_plausible_stats(api_key: String, site_id: String) -> Result<...>;

#[tauri::command]
async fn overwatch_netlify_status(api_key: String, org: String, project: String) -> Result<...>;

#[tauri::command]
async fn overwatch_sentry_stats(api_key: String, org: String, project: String) -> Result<...>;
```

---

## UI Card Layout

```
+------------------------------------------+
| [Icon]  Service Name           [Menu]    |
| [Status Dot]  healthy                    |
|------------------------------------------|
| Metric 1           Metric 2              |
| 1,234 visitors     98.5% uptime          |
|------------------------------------------|
| Last updated: 2 min ago  [Refresh] [->]  |
+------------------------------------------+
```

---

## Credential Flow

1. User adds API key via Environment Variables tool (envStore)
2. In Overwatch config, user selects key from dropdown
3. Store keeps `apiKeyId` reference only (not actual key)
4. At fetch time, resolve actual value from envStore

---

## Implementation Phases

### Phase 1: Foundation
1. Create `src/types/overwatch.ts`
2. Create `src/stores/overwatchStore.ts`
3. Create `src-tauri/src/overwatch.rs` with placeholder commands
4. Register in `main.rs`

### Phase 2: UI Shell
1. Create `OverwatchPopup.tsx` with Modal
2. Create `ServiceCard.tsx` base component
3. Create `ServiceConfigModal.tsx`
4. Create `StatusIndicator.tsx`
5. Add to ToolsDropdown + ProjectTabBar

### Phase 3: Railway Integration
1. Implement Rust command (GraphQL API)
2. Create `RailwayCard.tsx`

### Phase 4: Plausible Integration
1. Implement Rust command (REST API)
2. Create `PlausibleCard.tsx` with visitor stats

### Phase 5: Netlify Integration
1. Implement Rust command
2. Create `NetlifyCard.tsx` with build status

### Phase 6: Sentry Integration
1. Implement Rust command
2. Create `SentryCard.tsx` with error metrics

### Phase 7: Polish
1. Auto-refresh toggle + interval
2. Error handling & loading states
3. Empty state design
4. Responsive grid

---

## Files to Modify

- `src/components/tools/ToolsDropdown.tsx` - Add tool definition
- `src/components/layout/ProjectTabBar.tsx` - Add state + render popup
- `src-tauri/src/main.rs` - Register Rust commands
- `src-tauri/src/lib.rs` - Add module

---

## API Endpoints

| Service   | API                                          |
|-----------|----------------------------------------------|
| Railway   | `https://backboard.railway.app/graphql/v2`   |
| Plausible | `https://plausible.io/api/v1/stats/aggregate`|
| Netlify   | `https://api.netlify.com/api/v1/sites/{id}`  |
| Sentry    | `https://sentry.io/api/0/projects/{org}/{p}/`|
