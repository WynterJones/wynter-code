# Mobile Companion App for wynter-code

## Overview

Build a React Native (Expo) iOS mobile companion app that connects to the wynter-code desktop app over local WiFi. Enables mobile access to workspaces, beads issues, auto-build monitoring, and full chat sessions with tool control.

**Repository:** Separate repo (`wynter-code-mobile`)
**Starting Point:** Desktop API Server first

## Architecture

```
┌─────────────────┐         Local WiFi         ┌─────────────────┐
│  Mobile App     │◄──────────────────────────►│  Desktop App    │
│  (React Native) │   REST API + WebSocket     │  (Tauri)        │
└─────────────────┘                            └─────────────────┘
                         mDNS Discovery
                         QR Code Pairing
```

## Key Features

1. **Workspace/Project Browser** - View and switch between workspaces and projects
2. **Beads Issues** - Kanban board + list view with create/update/close
3. **Auto-Build Monitor** - Real-time worker status, queue, logs, controls
4. **Chat Sessions** - Full streaming chat with tool approval/rejection

---

## Part 1: Desktop API Server (Rust/Tauri)

### New Module: `src-tauri/src/mobile_api.rs`

**Dependencies to add to `src-tauri/Cargo.toml`:**
```toml
axum = { version = "0.7", features = ["ws"] }
tower-http = { version = "0.5", features = ["cors"] }
mdns-sd = "0.11"
```

### REST Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ping` | GET | Health check |
| `/api/v1/pair` | POST | Exchange pairing code for auth token |
| `/api/v1/workspaces` | GET | List workspaces |
| `/api/v1/workspaces/:id/projects` | GET | List projects in workspace |
| `/api/v1/projects/:id/beads` | GET | List issues |
| `/api/v1/projects/:id/beads` | POST | Create issue |
| `/api/v1/projects/:id/beads/:id` | PATCH | Update issue |
| `/api/v1/projects/:id/beads/:id/close` | POST | Close issue |
| `/api/v1/projects/:id/autobuild/status` | GET | Auto-build state |
| `/api/v1/projects/:id/autobuild/start` | POST | Start auto-build |
| `/api/v1/projects/:id/sessions` | GET | List chat sessions |
| `/api/v1/projects/:id/sessions/:id/messages` | GET | Get messages |

### WebSocket: `ws://[host]:[port]/api/v1/ws?token=[token]`

**Server → Client Events:**
- `state_sync` - Full state on connect
- `beads_update` - Issue CRUD events
- `autobuild_update` - Worker/queue/log changes
- `chat_stream` - Streaming text chunks
- `tool_call` - Tool pending approval
- `tool_result` - Tool completion

**Client → Server Commands:**
- `subscribe_project` - Subscribe to project updates
- `chat_send` - Send chat message
- `tool_approve` / `tool_reject` - Approve/reject tool calls

### mDNS Discovery

Service: `_wynter-code._tcp` with TXT records (version, deviceName, port)

### Pairing Flow

1. Desktop generates 6-digit code (5 min expiry)
2. Desktop shows QR: `wynter://pair?code=123456&host=192.168.1.x&port=8765`
3. Mobile scans QR or enters code
4. Mobile sends `POST /api/v1/pair` → receives auth token
5. Token stored in iOS Keychain

### Files to Create/Modify

- `src-tauri/src/mobile_api.rs` (new - ~800 lines)
- `src-tauri/src/main.rs` (register module + commands)
- `src-tauri/Cargo.toml` (add dependencies)
- `src/stores/mobileApiStore.ts` (new)
- `src/components/settings/MobileCompanionSettings.tsx` (new - QR display, paired devices)

---

## Part 2: Mobile App (React Native/Expo)

### Project Setup

```bash
npx create-expo-app wynter-code-mobile --template expo-template-blank-typescript
```

### Directory Structure

```
wynter-code-mobile/
├── app/                          # Expo Router
│   ├── (tabs)/
│   │   ├── index.tsx             # Workspaces/Projects
│   │   ├── issues.tsx            # Beads Kanban + List
│   │   ├── autobuild.tsx         # Auto-Build Monitor
│   │   └── chat.tsx              # Chat Sessions
│   ├── pairing.tsx               # QR Scanner + Code Entry
│   └── _layout.tsx
├── src/
│   ├── api/
│   │   ├── client.ts             # REST client
│   │   ├── websocket.ts          # WebSocket handler
│   │   └── discovery.ts          # mDNS discovery
│   ├── stores/
│   │   ├── connectionStore.ts    # Connection + auth state
│   │   ├── projectStore.ts
│   │   ├── beadsStore.ts
│   │   ├── autoBuildStore.ts
│   │   └── chatStore.ts
│   └── components/
│       ├── KanbanBoard.tsx
│       ├── IssueCard.tsx
│       ├── AutoBuildWorker.tsx
│       ├── ChatMessage.tsx
│       └── ToolCallCard.tsx
└── app.json
```

### Key Dependencies

```json
{
  "expo-camera": "~14.x",
  "expo-barcode-scanner": "~12.x",
  "expo-secure-store": "~12.x",
  "@react-navigation/native": "^6.x",
  "@tanstack/react-query": "^5.x",
  "zustand": "^4.x",
  "react-native-zeroconf": "^0.13.x"
}
```

### Mobile Screens

1. **Pairing** - QR scanner, manual code entry, desktop discovery list
2. **Projects** - Workspace list with nested projects, tap to select
3. **Issues** - Segmented control: Kanban | List, pull-to-refresh, FAB to create
4. **Auto-Build** - Worker cards, queue list, log stream, Start/Pause/Stop
5. **Chat** - Session list, streaming messages, tool approval cards

---

## Part 3: Implementation Phases

### Phase 1: Desktop API Server (5-7 days)

1. Create `mobile_api.rs` with axum server
2. Implement REST endpoints (workspaces, projects, beads)
3. Add WebSocket with state broadcasting
4. Implement mDNS registration
5. Build pairing flow with QR generation
6. Add desktop UI for managing paired devices

**Deliverable:** Desktop can serve API on local network, show QR code

### Phase 2: Mobile Foundation (3-4 days)

1. Set up Expo project with navigation
2. Implement connection store + SecureStore
3. Build QR scanner screen
4. Add mDNS discovery
5. Complete pairing flow

**Deliverable:** Mobile can discover and pair with desktop

### Phase 3: Projects & Beads (4-5 days)

1. Build REST client with React Query
2. Create projects list with workspace grouping
3. Implement kanban board (drag-and-drop optional)
4. Add issue detail sheet
5. Implement create/update/close actions

**Deliverable:** Full beads management on mobile

### Phase 4: Auto-Build Monitor (3-4 days)

1. Implement WebSocket handler
2. Build auto-build store with real-time updates
3. Create worker status cards
4. Add log stream view
5. Implement Start/Pause/Stop controls

**Deliverable:** Monitor and control auto-build from mobile

### Phase 5: Chat Sessions (5-6 days)

1. Add chat store with streaming support
2. Build message list with streaming display
3. Create tool call approval UI
4. Implement simplified diff viewer
5. Add session management

**Deliverable:** Full chat with tool control from mobile

### Phase 6: Polish (2-3 days)

1. Offline caching
2. Error handling + retry logic
3. Haptic feedback
4. Battery optimization
5. Development build for sideloading

---

## Distribution

### Sideloading (No App Store)

```bash
npx expo prebuild --platform ios
cd ios && pod install
# Open in Xcode, build to connected device
# Trust developer in iOS Settings > General > VPN & Device Management
```

### TestFlight (Optional, requires $99/year Apple Developer)

Build IPA and distribute via TestFlight for easier sharing

---

## Security

- API server binds to local interfaces only (not 0.0.0.0)
- Time-limited pairing codes (5 min)
- JWT-style tokens with expiry
- Token in iOS Keychain
- Device revocation support
- All traffic on local network only

---

## Critical Reference Files

| File | Purpose |
|------|---------|
| `src-tauri/src/beads.rs` | Beads IPC commands to expose via API |
| `src/stores/beadsStore.ts` | Beads state patterns for mobile |
| `src/stores/autoBuildStore.ts` | Auto-build state structure |
| `src/services/claude.ts` | Streaming + tool call patterns |
| `src/types/beads.ts` | Type definitions to share |
| `src/types/autoBuild.ts` | Auto-build types to share |
