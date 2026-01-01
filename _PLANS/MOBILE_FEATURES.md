# Mobile App Feature Plan: Remaining Work

**Decision:** Database persistence for all changes (not in-memory)

## Subscriptions CRUD ✅ DONE
**Goal:** Full subscription management from mobile with DB persistence

### Desktop Changes (`/src-tauri/src/mobile_api.rs`)
- [x] `GET /api/v1/subscriptions` - List all subscriptions
- [x] `GET /api/v1/subscriptions/:id` - Get single subscription
- [x] `POST /api/v1/subscriptions` - Create subscription
- [x] `PATCH /api/v1/subscriptions/:id` - Update subscription
- [x] `DELETE /api/v1/subscriptions/:id` - Delete subscription
- [x] `POST /api/v1/subscriptions/categories` - Create category
- [x] `PATCH /api/v1/subscriptions/categories/:id` - Update category
- [x] `DELETE /api/v1/subscriptions/categories/:id` - Delete category
- [x] WebSocket event: `SubscriptionUpdate` for real-time sync

### Mobile Changes
- [x] Add API methods to `/src/api/client.ts`
- [x] Add React Query hooks with optimistic updates
- [x] Update `/app/subscriptions.tsx` with full CRUD UI
  - [x] FAB button to add subscriptions
  - [x] Full modal form (name, URL, cost, currency, billing cycle, category, notes, active toggle)
  - [x] Edit via pencil icon or long press
  - [x] Delete with confirmation
  - [x] Summary bar (monthly/yearly totals, active count)
  - [x] Category grouping with collapsible sections

**Dependencies:** None

---

## Bookmarks CRUD ✅ DONE
**Goal:** Full bookmark management from mobile with DB persistence

### Desktop Changes (`/src-tauri/src/mobile_api.rs`)
- [x] `GET /api/v1/bookmarks` - List all bookmarks
- [x] `GET /api/v1/bookmarks/:id` - Get single bookmark
- [x] `POST /api/v1/bookmarks` - Create bookmark
- [x] `PATCH /api/v1/bookmarks/:id` - Update bookmark
- [x] `DELETE /api/v1/bookmarks/:id` - Delete bookmark
- [x] `POST /api/v1/bookmarks/collections` - Create collection
- [x] `PATCH /api/v1/bookmarks/collections/:id` - Update collection
- [x] `DELETE /api/v1/bookmarks/collections/:id` - Delete collection
- [x] WebSocket event: `BookmarkUpdate` for real-time sync

### Mobile Changes
- [x] Update `/app/bookmarks.tsx` screen with full CRUD
- [x] Bookmark list with collection organization
- [x] Create bookmark modal (title, URL, description, collection)
- [x] Edit bookmark modal
- [x] Delete bookmark with confirmation
- [x] Collection picker in create/edit modal
- [x] Search and filter bookmarks
- [x] WebSocket events for real-time updates
- [x] Add API methods to `/src/api/client.ts`
- [x] Add React Query hooks with optimistic updates

**Dependencies:** None

---

## KanBan Board CRUD ✅ DONE
**Goal:** Full kanban board management from mobile (called "The Board")

### Desktop Changes (`/src-tauri/src/mobile_api.rs`)
- [x] `GET /api/v1/kanban/:workspace_id` - List tasks for workspace
- [x] `POST /api/v1/kanban/:workspace_id/tasks` - Create task
- [x] `PATCH /api/v1/kanban/:workspace_id/tasks/:id` - Update task
- [x] `DELETE /api/v1/kanban/:workspace_id/tasks/:id` - Delete task
- [x] `POST /api/v1/kanban/:workspace_id/tasks/:id/move` - Move task between columns
- [x] WebSocket event: `KanbanUpdate` for real-time sync
- [x] Sync with desktop `kanbanStore.ts` via Tauri events

### Mobile Changes
- [x] Create `/app/board.tsx` screen
- [x] Add "The Board" to hamburger menu under Manage category
- [x] Workspace selector (if multiple workspaces)
- [x] Stacked column view (4 columns: Backlog, Doing, MVP, Polished)
- [x] Expandable columns with task counts
- [x] Task cards with priority indicators
- [x] Add task via FAB button with modal (title, description, priority)
- [x] Move task between columns via action buttons
- [x] Delete task with confirmation
- [x] WebSocket sync for real-time updates
- [x] Add API methods to `/src/api/client.ts`
- [x] Add React Query hooks with optimistic updates

**Dependencies:** None

---

# Remaining

- [ ] WebSocket events for `PreviewStatus` and `TunnelStatus`
- [ ] Full integration with live_preview.rs for actual server start/stop
- [ ] Full integration with tunnel.rs for actual tunnel management (use cloudlfared like we do on desktop to sendto desktop to to do tunnel)

# Polish
- [ ] Check code is good and ready to ship
- [ ] Make distribute plan with testflight (not putting on app store)
