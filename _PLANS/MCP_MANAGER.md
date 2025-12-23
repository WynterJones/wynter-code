# MCP Manager Popup

> View and create MCP servers from a unified UI popup

## Overview

Build an `McpManagerPopup` component that allows users to:
1. View all MCP servers configured on the system (global + project-specific)
2. See which MCPs are currently enabled/active
3. Create new MCP server configurations from the UI
4. Edit, delete, and toggle MCP servers

## MCP Configuration Locations

| Location | Path | Contains |
|----------|------|----------|
| Global MCPs | `~/.claude.json` → `mcpServers` | System-wide MCP servers |
| Project MCPs (central) | `~/.claude.json` → `projects[path].mcpServers` | Per-project in central config |
| Project MCPs (local) | `<project>/.mcp.json` | Project-local MCP config file |
| Active Permissions | `~/.claude/settings.json` → `permissions.allow[]` | Entries like `mcp__name__*` |

**MCP Server Structure:**
```json
{
  "command": "npx",
  "args": ["-y", "package-name"],
  "env": { "API_KEY": "..." }
}
```

---

## Implementation Plan

### Phase 1: Rust Backend

**File: `src-tauri/src/commands/mod.rs`**

Add 5 new commands:

1. `get_mcp_servers(project_path: Option<String>)` → `Vec<McpServer>`
   - Read `~/.claude.json` for global and project MCPs
   - Read `<project>/.mcp.json` if exists (project-local config)
   - Read `~/.claude/settings.json` to determine enabled state
   - Return combined list with scope and enabled status

2. `save_mcp_server(server: McpServerInput)` → `Result<(), String>`
   - Add/update server in appropriate location:
     - `global` → `~/.claude.json` mcpServers
     - `project` → `~/.claude.json` projects[path].mcpServers
     - `project-local` → `<project>/.mcp.json`
   - Write back to appropriate file

3. `delete_mcp_server(name, scope, project_path)` → `Result<(), String>`
   - Remove from `~/.claude.json`
   - Remove from permissions in settings.json

4. `toggle_mcp_server(name, enabled)` → `Result<(), String>`
   - Add/remove `mcp__name__*` from `permissions.allow[]`

5. `validate_mcp_command(command)` → `Result<bool, String>`
   - Check if command exists in PATH

**File: `src-tauri/src/main.rs`**
- Register all 5 commands in `invoke_handler`

---

### Phase 2: TypeScript Types & Store

**New File: `src/types/mcp.ts`**
```typescript
export interface McpServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  scope: "global" | "project" | "project-local";
  isEnabled: boolean;
  projectPath?: string;
}
```

**New File: `src/stores/mcpStore.ts`**
- Zustand store with: `isPopupOpen`, `servers`, `isLoading`, `activeScope`
- Actions: `loadServers`, `saveServer`, `deleteServer`, `toggleServer`

---

### Phase 3: UI Components

**New Directory: `src/components/tools/mcp-manager/`**

| Component | Purpose |
|-----------|---------|
| `McpManagerPopup.tsx` | Main modal with tabs (Global/Project), server list, add button |
| `McpServerRow.tsx` | Row with toggle, name, command preview, hover actions |
| `McpServerForm.tsx` | Add/Edit modal with name, command, args, env vars |
| `McpEnvEditor.tsx` | Dynamic key-value editor for environment variables |
| `index.ts` | Barrel export |

**UI Pattern (follows EnvManagerPopup):**
- Modal size="lg", height 600px
- Tabs for Global vs Project scope
- OverlayScrollbarsComponent for list
- Hover-revealed action buttons (Edit, Delete)
- Toggle switch for enable/disable
- Masked sensitive env vars (API_KEY, SECRET, TOKEN patterns)

---

### Phase 4: Integration

**File: `src/components/tools/ToolsDropdown.tsx`**

Add to TOOL_DEFINITIONS:
```typescript
{
  id: "mcp-manager",
  name: "MCP Servers",
  description: "Manage Model Context Protocol servers",
  icon: Blocks, // from lucide-react
  actionKey: "openMcpManager",
  category: "utilities",
}
```

---

## Critical Files

| File | Action |
|------|--------|
| `src-tauri/src/commands/mod.rs` | Add 5 Rust commands |
| `src-tauri/src/main.rs` | Register commands |
| `src/types/mcp.ts` | New - TypeScript interfaces |
| `src/stores/mcpStore.ts` | New - Zustand store |
| `src/components/tools/mcp-manager/McpManagerPopup.tsx` | New - Main popup |
| `src/components/tools/mcp-manager/McpServerRow.tsx` | New - List row |
| `src/components/tools/mcp-manager/McpServerForm.tsx` | New - Add/edit form |
| `src/components/tools/mcp-manager/McpEnvEditor.tsx` | New - Env var editor |
| `src/components/tools/ToolsDropdown.tsx` | Add tool definition |

## Reference Patterns

- `src/components/tools/env-manager/EnvManagerPopup.tsx` - Popup structure, tabs
- `src/components/tools/env-manager/EnvAddForm.tsx` - Form modal pattern
- `src/components/tools/env-manager/EnvVariableRow.tsx` - Row with hover actions
- `src/components/ui/Modal.tsx` - Base modal wrapper

---

## Security Notes

- Mask env vars matching: `*_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`
- Create `.bak` before modifying config files
- Validate JSON before writing
- Warn (don't block) if command not found
