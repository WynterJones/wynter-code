# API Testing Tool Plan

A Postman-like API tester popup with tabbed sessions, history, and webhook receiver.

## Overview

- **Modal Size**: `xl` (max-w-5xl) for complex UI
- **Body Editor**: Monaco Editor for JSON/raw with syntax highlighting
- **Collections**: Simple history only (auto-saved, searchable)
- **Webhooks**: Included from start using `tiny_http`

---

## File Structure

```
src/
  components/tools/api-tester/
    ApiTesterPopup.tsx       # Main modal container
    RequestBuilder.tsx       # Method, URL, send button
    RequestTabs.tsx          # Tabbed interface with @dnd-kit
    HeadersEditor.tsx        # Key-value headers
    BodyEditor.tsx           # Monaco editor wrapper
    AuthEditor.tsx           # Bearer/Basic/API Key
    QueryParamsEditor.tsx    # Query params key-value
    ResponseViewer.tsx       # Status, headers, body display
    HistoryPanel.tsx         # Left sidebar with search
    WebhookPanel.tsx         # Webhook server controls + log
    KeyValueRow.tsx          # Reusable row component
    index.ts
  stores/
    apiTesterStore.ts        # Zustand with persistence
  types/
    apiTester.ts             # TypeScript interfaces

src-tauri/src/
    api_tester.rs            # HTTP client + webhook server
```

---

## Types (`src/types/apiTester.ts`)

```typescript
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
export type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface ApiAuth {
  type: AuthType;
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
}

export interface ApiRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  queryParams: KeyValuePair[];
  body: { type: BodyType; content: string; };
  auth: ApiAuth;
  createdAt: number;
  updatedAt: number;
}

export interface ApiResponse {
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  responseTime: number;
  timestamp: number;
}

export interface RequestTab {
  id: string;
  requestId: string;
  name: string;
  isDirty: boolean;
}

export interface HistoryEntry {
  id: string;
  request: ApiRequest;
  response?: ApiResponse;
  timestamp: number;
}

export interface WebhookServer {
  id: string;
  port: number;
  path: string;
  isRunning: boolean;
}

export interface WebhookRequest {
  id: string;
  serverId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}
```

---

## Store (`src/stores/apiTesterStore.ts`)

Key state (per-project using Map pattern from sessionStore):
- `tabs: Map<projectId, RequestTab[]>`
- `activeTabId: Map<projectId, string>`
- `requests: Map<requestId, ApiRequest>`
- `responses: Map<requestId, ApiResponse>`
- `history: HistoryEntry[]` (last 100, global)
- `webhookServers: WebhookServer[]`
- `webhookRequests: Map<serverId, WebhookRequest[]>`

Persistence: localStorage key `wynter-code-api-tester`

---

## Backend Commands (`src-tauri/src/api_tester.rs`)

```rust
// HTTP Request (using reqwest crate)
#[tauri::command]
async fn send_http_request(payload: HttpRequestPayload) -> Result<HttpResponsePayload, String>;

// Webhook Server (using tiny_http)
#[tauri::command]
async fn start_webhook_server(window: Window, port: u16, path: String) -> Result<String, String>;

#[tauri::command]
async fn stop_webhook_server(server_id: String) -> Result<(), String>;

#[tauri::command]
fn list_webhook_servers() -> Result<Vec<WebhookServerInfo>, String>;
```

Event emitted on incoming webhook: `"webhook-request"` with WebhookEvent payload.

---

## UI Layout

```
+-------------------------------------------------------------------------+
| API Tester                                                    [X] Close |
+-------------------------------------------------------------------------+
| [History] [Webhook]                              [Env: Production v]    |
+-------------------------------------------------------------------------+
| Sidebar  | [Tab 1 x] [Tab 2 x] [+]                                      |
|          +--------------------------------------------------------------+
| Search   | [GET v] [https://api.example.com/endpoint    ] [Send]        |
| ________ +--------------------------------------------------------------+
|          | [Params] [Headers] [Auth] [Body]                             |
| Recent   +--------------------------------------------------------------+
| requests | Key-Value Editor / Monaco Editor (based on active tab)       |
| list     |                                                              |
|          +--------------------------------------------------------------+
|          | Response                              200 OK  150ms  1.2 KB  |
|          | [Body] [Headers]                                             |
|          | +----------------------------------------------------------+ |
|          | | { "data": [...] }                                        | |
|          | +----------------------------------------------------------+ |
+-------------------------------------------------------------------------+
```

---

## Implementation Phases

### Phase 1: Core Foundation
1. Create `src/types/apiTester.ts` with all interfaces
2. Create `src/stores/apiTesterStore.ts` with Map persistence
3. Create `ApiTesterPopup.tsx` modal shell
4. Create `RequestBuilder.tsx` (method dropdown, URL input, send button)
5. Create `KeyValueRow.tsx` reusable component
6. Create `HeadersEditor.tsx` and `QueryParamsEditor.tsx`

### Phase 2: Backend + Response
1. Add `reqwest` to Cargo.toml
2. Create `src-tauri/src/api_tester.rs` with `send_http_request`
3. Register in `main.rs` invoke_handler
4. Create `ResponseViewer.tsx` with status, time, headers, body tabs
5. Wire up send button to backend

### Phase 3: Body & Auth
1. Install `@monaco-editor/react`
2. Create `BodyEditor.tsx` with Monaco + body type selector
3. Create `AuthEditor.tsx` with Bearer/Basic/API Key forms
4. Apply auth to outgoing requests

### Phase 4: Tabs & History
1. Create `RequestTabs.tsx` with @dnd-kit drag-reorder
2. Implement tab create/close/rename/switch
3. Create `HistoryPanel.tsx` sidebar with search
4. Auto-save requests to history on send
5. Click history item → load into new tab

### Phase 5: Webhook Receiver
1. Create `WebhookManager` in Rust using `tiny_http`
2. Implement `start_webhook_server`, `stop_webhook_server`
3. Emit `webhook-request` events to frontend
4. Create `WebhookPanel.tsx` with start/stop controls
5. Display incoming requests in real-time list

### Phase 6: Polish
1. Add keyboard shortcuts (Ctrl+Enter send, Ctrl+N new tab)
2. Integrate with `envStore` for `{{variable}}` substitution
3. Register in `ToolsDropdown.tsx` and `ProjectTabBar.tsx`
4. Add command palette integration
5. Add copy response / copy as cURL buttons

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tools/ToolsDropdown.tsx` | Add to TOOL_DEFINITIONS |
| `src/components/tools/index.ts` | Export ApiTesterPopup |
| `src/components/layout/ProjectTabBar.tsx` | Add state + handler + render popup |
| `src-tauri/src/main.rs` | Add api_tester module + commands |
| `src-tauri/Cargo.toml` | Add `reqwest` dependency |
| `package.json` | Add `@monaco-editor/react` |

---

## Critical Reference Files

- `src/components/tools/env-manager/EnvManagerPopup.tsx` - Modal structure pattern
- `src/stores/sessionStore.ts` - Map serialization pattern
- `src-tauri/src/live_preview.rs` - tiny_http server + events pattern
- `src/components/tools/ToolsDropdown.tsx` - Tool registration
