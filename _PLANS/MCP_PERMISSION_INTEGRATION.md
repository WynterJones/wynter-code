# MCP Permission Prompt Integration

## Summary

Implement MCP permission prompt tool integration to enable:
1. **Manual Approve mode** - Intercepts ALL tool calls, shows approval modal via MCP
2. **Plan Mode as first-class UX** - Start in plan mode, then "Execute Plan" to run
3. **Rust-native MCP server** - Handles permission requests within Tauri

## Status

**Partially Implemented** - Core infrastructure exists, needs debugging/completion.

## Architecture Overview

```
+------------------+     stdio      +----------------------+
|   Claude CLI     | <-----------> |  MCP Permission      |
|  (child process) |     JSON-RPC  |  Server (Rust)       |
+------------------+               +----------------------+
         |                                   |
         | --permission-prompt-tool          | Tauri Events
         | mcp__wynter__approve_tool         |
         |                                   v
         |                         +----------------------+
         |                         |  PermissionApproval  |
         |                         |  Modal (React)       |
         +------------------------>+----------------------+
```

## Permission Modes

| Mode | Behavior | MCP Needed |
|------|----------|------------|
| `manual` | All tools require approval | Yes |
| `acceptEdits` | Auto-approve edits, reject bash | No |
| `bypassPermissions` | Auto-approve all | No |
| `plan` | Read-only, no execution | No |

**Manual Approve** uses `--permission-prompt-tool mcp__wynter__approve_tool` to intercept every tool call.

---

## Implementation Steps

### Phase 1: Rust MCP Permission Server

**File: `/src-tauri/src/mcp_permission_server.rs`** (EXISTS)

Creates an MCP server that:
1. Listens for JSON-RPC tool calls on stdin/stdout
2. Emits `mcp-permission-request` Tauri event to frontend
3. Waits for user response via `respond_to_permission` command
4. Returns `{"behavior": "allow/deny"}` to Claude

```rust
// Key structures
struct McpPermissionServer {
    pending_approvals: Mutex<HashMap<String, oneshot::Sender<PermissionResponse>>>,
}

struct PermissionRequest {
    id: String,
    tool_name: String,
    input: serde_json::Value,
    session_id: String,
}

// Tool response format
{ "behavior": "allow", "updatedInput": {...} }  // or
{ "behavior": "deny", "message": "User denied" }
```

**Tauri commands:**
- `respond_to_permission(request_id, approved, updated_input?)` - Frontend calls this after user decision

### Phase 2: Claude Process Integration

**File: `/src-tauri/src/claude_process.rs`** (MODIFIED)

1. Accept `manual` permission mode
2. When `manual` mode, add CLI flags:
   ```
   --permission-prompt-tool mcp__wynter__approve_tool
   ```
3. Set up MCP server config (via env or `--mcp-config`)
4. Coordinate MCP server lifecycle with Claude session

```rust
// In start_claude_session():
if mode == PermissionMode::Manual {
    args.push("--permission-prompt-tool".to_string());
    args.push("mcp__wynter__approve_tool".to_string());
    // Configure MCP server
}
```

### Phase 3: Frontend Integration

**File: `/src/types/session.ts`** (MODIFIED)
```typescript
export type PermissionMode = "manual" | "acceptEdits" | "bypassPermissions" | "plan";

export interface McpPermissionRequest {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  sessionId: string;
}
```

**File: `/src/services/claude.ts`** (MODIFIED)
- Event listener for `mcp-permission-request`
- `respondToPermission(requestId, approved)` method
- `onPermissionRequest` callback

**File: `/src/components/panels/panel-types/ClaudeOutputPanel.tsx`** (MODIFIED)
- Listen for `mcp-permission-request` events
- Show `PermissionApprovalModal` when request arrives
- Call `respondToPermission` on user decision

### Phase 4: Permission Mode Toggle

**File: `/src/components/session/PermissionModeToggle.tsx`** (MODIFIED)

```typescript
const modeOptions: ModeOption[] = [
  {
    value: "manual",
    icon: ShieldQuestion,
    label: "Manual",
    color: "text-accent-blue",
    description: "Approve each tool manually",
  },
  // ... existing modes
];
```

### Phase 5: Plan Mode UX Enhancement

**Add "Execute Plan" button when in plan mode:**

1. When `mode === "plan"`, show "Execute Plan" action button
2. Clicking it:
   - Shows confirmation with planned actions summary
   - Switches mode to `acceptEdits` (auto-approve edits)
   - Restarts session with new mode to execute

---

## Files Created/Modified

| File | Status |
|------|--------|
| `/src-tauri/src/mcp_permission_server.rs` | Created |
| `/scripts/mcp-permission-server.mjs` | Created |
| `/src-tauri/src/main.rs` | Modified |
| `/src-tauri/src/claude_process.rs` | Modified |
| `/src-tauri/src/commands/mod.rs` | Modified |
| `/src/types/session.ts` | Modified |
| `/src/services/claude.ts` | Modified |
| `/src/components/panels/panel-types/ClaudeOutputPanel.tsx` | Modified |
| `/src/components/session/PermissionModeToggle.tsx` | Modified |

---

## MCP Protocol Details

**Tool Name**: `mcp__wynter__approve_tool`

**Input (from Claude):**
```json
{
  "tool_name": "Bash",
  "input": { "command": "npm install" }
}
```

**Output (to Claude):**
```json
{ "behavior": "allow", "updatedInput": { "command": "npm install" } }
// or
{ "behavior": "deny", "message": "User denied this operation" }
```

---

## Known Issues

1. **Modal not appearing** - MCP permission requests are logged but modal doesn't show
   - Debug logging added to `/src/services/claude.ts`
   - Issue may be sessionId mismatch in callback lookup

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| MCP Server | **Rust-native in Tauri** - Single binary, direct state access |
| Plan Execute Mode | **Auto (acceptEdits)** - When executing plan, switch to acceptEdits |
| Permission Timeout | **No timeout** - Wait indefinitely for user response |

---

## Optional Enhancements (Post-MVP)

1. **"Allow Always" checkbox** - Remember approval for specific tools
2. **Notification hooks** - System notification when Claude is waiting
3. **Approval history** - Log all approval decisions
4. **Batch approval** - "Allow all reads" option for low-risk tools
