# Plugin System for Wynter Code

## Overview

Add an internal plugin architecture to enable dynamic tool registration and lazy loading. Existing 25+ tools become "built-in plugins" with manifests while maintaining backward compatibility. Third-party support deferred to future phase.

**Goal:** Decouple tools from ProjectTabBar's 1,200-line monolith without breaking anything.

**Scope Decisions:**
- Internal refactoring only (no third-party plugins initially)
- Plugins use existing 157 Tauri commands (no custom backend per plugin)
- Full plan for near-term implementation

---

## Current Pain Points

- **ProjectTabBar.tsx** has 20+ `useState` hooks for tool popups
- Switch statement (lines 464-574) handles all action keys
- All tool imports are static/hardcoded
- Adding a new tool requires modifying 4+ locations
- No isolation between tool state

---

## Plugin Manifest Schema

```typescript
// src/types/plugin.ts
interface PluginManifest {
  id: string;                    // "api-tester"
  name: string;                  // "API Tester"
  version: string;               // "1.0.0"
  description: string;
  icon: string;                  // Lucide icon name
  category: ToolCategory;
  type: "popup" | "panel" | "toolkit" | "background";

  permissions: PluginPermission[];  // What the plugin can access

  component: {
    path: string;               // "./ApiTesterPopup"
    lazy?: boolean;             // Default true
  };

  store?: {
    path: string;
    persist?: boolean;
    scope?: "global" | "project";
  };

  commands?: string[];          // Tauri commands needed
  subTools?: MiniToolDefinition[];  // For toolkits

  ui?: {
    showInToolbar?: boolean;
    showInCommandPalette?: boolean;
    customShortcut?: string;
  };
}
```

---

## Architecture

### Core Components

| Component | Purpose |
|-----------|---------|
| `PluginRegistry` | Central store for all plugins, handles registration/loading |
| `PluginContext` | API surface exposed to plugins (project, fs, tauri, ui) |
| `PluginLoader` | Dynamic import with caching |
| `PermissionManager` | Enforce permission boundaries |
| `usePlugin` hook | Load plugin component on demand |

### Plugin API Surface

Plugins get access to:
- **Project context** - Active project path, metadata
- **File system** - Read/write via existing Tauri commands
- **Tauri commands** - Invoke existing 157 commands (no custom commands)
- **UI utilities** - Notifications, modals, shared components
- **Isolated store** - Per-plugin Zustand state with persistence
- **Command palette** - Auto-registration from manifest

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/plugin.ts` | Type definitions for manifests, API |
| `src/plugins/registry/PluginRegistry.ts` | Core registry class |
| `src/plugins/registry/PluginContext.tsx` | React context with plugin API |
| `src/plugins/registry/PluginLoader.ts` | Dynamic component loading with caching |
| `src/plugins/registry/index.ts` | Public exports |
| `src/hooks/usePlugin.ts` | Hook for loading plugins |
| `src/plugins/manifests/*.json` | Auto-generated manifests for 25+ tools |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/ProjectTabBar.tsx` | Replace useState/switch with registry lookup |
| `src/components/tools/ToolsDropdown.tsx` | Pull from registry instead of TOOL_DEFINITIONS |
| `src/hooks/useCommandItems.tsx` | Register plugins in command palette |

---

## Implementation Phases

### Phase 1: Foundation
1. Create `src/types/plugin.ts` with PluginManifest, PluginPermission types
2. Implement `PluginRegistry` class (register, load, activate, getAll)
3. Create `PluginContext` with API surface
4. Build `usePlugin` hook for lazy loading

### Phase 2: Migration Infrastructure
1. Create `LegacyBridge` to wrap existing tools as plugins
2. Generate manifest.json for each built-in tool
3. Register all existing tools via LegacyBridge
4. No behavioral changes yet - pure compatibility layer

### Phase 3: ProjectTabBar Refactor
1. Replace 20+ useState hooks with `PluginStateManager`
2. Replace switch statement with registry.getPlugin(actionKey)
3. Use `<PluginHost pluginId={...} />` instead of individual popup imports
4. Test all existing tools work unchanged

### Phase 4: Pilot Full Migration
1. Migrate API Tester to full plugin structure
2. Migrate Database Viewer to full plugin structure
3. Migrate Dev Toolkit (with sub-tools) to full plugin structure
4. Document plugin development patterns

### Phase 5: Polish & Documentation
1. Add plugin developer documentation
2. Create plugin scaffolding script
3. Performance profiling (lazy load impact)
4. Clean up any remaining legacy code

### Phase 6: Third-Party Support (Future - Not This Plan)
Deferred to future iteration:
- Load plugins from user directory
- Permission UI dialogs
- Plugin hot reload
- Plugin marketplace

---

## File Structure After Migration

```
src/
├── plugins/
│   ├── registry/
│   │   ├── PluginRegistry.ts
│   │   ├── PluginContext.tsx
│   │   ├── PluginLoader.ts
│   │   └── index.ts
│   ├── built-in/
│   │   ├── api-tester/
│   │   │   ├── manifest.json
│   │   │   ├── ApiTesterPopup.tsx
│   │   │   └── store.ts
│   │   ├── database-viewer/
│   │   ├── dev-toolkit/
│   │   └── ... (25+ tools)
│   └── manifests/           # Generated manifests for all tools
├── types/
│   └── plugin.ts
└── hooks/
    └── usePlugin.ts
```

---

## Backward Compatibility

`LegacyBridge` wraps existing tools without modification:

```typescript
const legacyPlugins = [
  createLegacyPlugin("api-tester", ApiTesterPopup, {
    name: "API Tester",
    icon: "Send",
    category: "testing",
  }),
  // ... all 25+ tools
];
legacyPlugins.forEach(p => pluginRegistry.register(p));
```

Tools work exactly as before until individually migrated.

---

## Benefits

1. **Decoupled architecture** - ProjectTabBar no longer owns all tools
2. **Lazy loading** - Tools load on first use, not at startup
3. **Isolated state** - Each plugin manages its own state
4. **Extensibility** - Add tools without modifying core files
5. **Future-proof** - Third-party plugins become possible
6. **Better DX** - Adding new tool = create manifest + component

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing tools | LegacyBridge maintains 100% compatibility |
| Performance regression | Lazy loading + caching reduces memory |
| Security vulnerabilities | Permission system for all sensitive ops |
| Complexity increase | Gradual migration, tool by tool |
