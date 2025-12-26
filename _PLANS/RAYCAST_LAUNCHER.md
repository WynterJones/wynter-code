# Raycast Clone Implementation Plan

## Overview

Create a Raycast-style global launcher with:
- Separate floating window activated by global hotkey (Cmd+Space)
- Unified search across tools, projects, sessions, macOS apps, and files
- Full Actions panel (Cmd+K) with context-specific actions per item
- Matching app theme (dark, JetBrains Mono, Catppuccin colors)

---

## Architecture

```
src/
  components/
    launcher/
      LauncherWindow.tsx         # Main component for floating window
      LauncherSearchInput.tsx    # Search input with Tab mode indicator
      LauncherResultsList.tsx    # Grouped results with keyboard nav
      LauncherResultItem.tsx     # Individual result row
      LauncherActionsPanel.tsx   # Cmd+K actions slide-in panel
      LauncherFooter.tsx         # Bottom action bar with shortcuts
      index.ts

  hooks/
    useLauncherSearch.ts         # Unified fuzzy search hook
    useMacOSApps.ts              # macOS app indexing via invoke
    useRecentFiles.ts            # Recent files via invoke
    useLauncherActions.ts        # Per-item action definitions

  stores/
    launcherStore.ts             # Zustand state (query, selection, actions panel)

  types/
    launcher.ts                  # LauncherItem, LauncherAction types

src-tauri/
  src/
    launcher.rs                  # Window management + system commands
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src-tauri/src/launcher.rs` | Rust: window toggle, macOS app search, file search |
| `src/components/launcher/LauncherWindow.tsx` | Main launcher UI |
| `src/components/launcher/LauncherSearchInput.tsx` | Search input |
| `src/components/launcher/LauncherResultsList.tsx` | Grouped results |
| `src/components/launcher/LauncherResultItem.tsx` | Result row |
| `src/components/launcher/LauncherActionsPanel.tsx` | Actions panel |
| `src/components/launcher/LauncherFooter.tsx` | Action bar |
| `src/components/launcher/index.ts` | Exports |
| `src/hooks/useLauncherSearch.ts` | Unified search |
| `src/hooks/useMacOSApps.ts` | macOS apps hook |
| `src/hooks/useRecentFiles.ts` | Recent files hook |
| `src/hooks/useLauncherActions.ts` | Actions per type |
| `src/stores/launcherStore.ts` | Zustand store |
| `src/types/launcher.ts` | Type definitions |

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add `tauri-plugin-global-shortcut = "2"` |
| `src-tauri/src/main.rs` | Register launcher module, global shortcut, invoke handlers |
| `src/App.tsx` | Add "launcher" window type routing |

---

## Rust Commands (launcher.rs)

| Command | Purpose |
|---------|---------|
| `toggle_launcher_window` | Show/hide launcher |
| `hide_launcher_window` | Hide on blur/escape |
| `search_macos_apps(query)` | Search via mdfind |
| `get_recent_files(limit)` | Recent files via mdfind |
| `search_files(query, path)` | File search |
| `open_application(path)` | Launch app |
| `reveal_in_finder(path)` | Open in Finder |

---

## Implementation Steps

### Phase 1: Window Foundation
1. Add `tauri-plugin-global-shortcut = "2"` to Cargo.toml
2. Create `launcher.rs` with window management:
   - `toggle_launcher_window` using WebviewWindowBuilder
   - Window: 600x450, borderless, transparent, always_on_top, centered
3. Register module in `main.rs` with invoke handlers
4. Add global hotkey (Cmd+Space) registration in setup
5. Add "/launcher" route in `App.tsx`
6. Create minimal `LauncherWindow.tsx`

### Phase 2: Core Search UI
7. Create `src/types/launcher.ts` with types:
   - `LauncherItem` (id, type, title, subtitle, icon, category, actions)
   - `LauncherAction` (id, title, icon, shortcut, onExecute)
8. Create `launcherStore.ts` (query, selectedIndex, actionsPanelOpen)
9. Build `LauncherSearchInput.tsx` with autofocus
10. Build `LauncherResultsList.tsx` with category grouping
11. Build `LauncherResultItem.tsx` matching Raycast style:
    - Icon | Title | Subtitle | Type badge
    - Selected state with accent background
12. Build `LauncherFooter.tsx` with action hints

### Phase 3: Search Integration
13. Create `useLauncherSearch.ts`:
    - Import TOOL_DEFINITIONS from ToolsDropdown
    - Get projects from useProjectStore
    - Get sessions from useSessionStore
    - Fuzzy match algorithm (prefix > contains > fuzzy)
14. Add keyboard navigation:
    - Arrow up/down: navigate
    - Enter: execute default action
    - Escape: close launcher
    - Tab: cycle search modes

### Phase 4: macOS Apps
15. Implement `search_macos_apps` in Rust:
    - Use mdfind with `kMDItemContentTypeTree == 'com.apple.application-bundle'`
    - Search /Applications, /System/Applications, ~/Applications
16. Create `useMacOSApps.ts` hook
17. Handle app icons (convert .icns path to asset protocol URL)
18. Implement `open_application` command

### Phase 5: File Search
19. Implement `get_recent_files` in Rust:
    - mdfind with `kMDItemLastUsedDate >= $time.today(-7)`
20. Implement `search_files` in Rust
21. Create `useRecentFiles.ts` hook
22. Add recency/frequency tracking in launcherStore (persist to localStorage)

### Phase 6: Actions Panel
23. Create `useLauncherActions.ts` with per-type actions:
    - Tools: Open, Pin to Sidebar
    - Apps: Open, Reveal in Finder, Get Info
    - Files: Open, Reveal, Copy Path, Open With
    - Projects: Switch, Open Terminal, Reveal
    - Sessions: Switch, Duplicate, Rename
24. Build `LauncherActionsPanel.tsx`:
    - Slide-in from right on Cmd+K
    - Arrow navigation within panel
    - Execute action on Enter
25. Wire up Cmd+K toggle in keyboard handler

### Phase 7: Polish
26. Add blur-to-close behavior (listen to window blur event)
27. Add smooth animations (Tailwind transitions)
28. Add loading states for async searches
29. Test and fix edge cases

---

## UI Specifications (Matching Theme)

```css
/* Window */
bg-bg-secondary (#0f0f18)
border border-border (#2a2a3a)
rounded-xl
shadow-2xl

/* Search Input */
px-4 py-3 border-b border-border
text-sm font-mono text-text-primary
placeholder:text-text-secondary

/* Result Item */
px-3 py-2.5 rounded-lg
hover:bg-bg-hover (#252535)
selected: bg-accent/20 text-accent (#cba6f7)

/* Category Header */
text-xs uppercase tracking-wider text-text-secondary

/* Footer */
bg-bg-tertiary/50 border-t border-border
kbd: bg-bg-hover text-text-secondary text-xs
```

---

## Key Patterns (from codebase)

### Floating Window Pattern (webcam_window.rs:50-71)
```rust
WebviewWindowBuilder::new(&app, LABEL, tauri::WebviewUrl::App("/launcher".into()))
    .title("")
    .inner_size(600.0, 450.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .center()
    .build()
```

### Window Type Routing (App.tsx:17-28)
```tsx
if (path === "/launcher") {
  setWindowType("launcher");
}
// Then render: if (windowType === "launcher") return <LauncherWindow />;
```

### Existing Tool Integration
- Import `TOOL_DEFINITIONS` from `@/components/tools/ToolsDropdown`
- Dispatch actions via: `window.dispatchEvent(new CustomEvent("command-palette-tool", { detail: { action } }))`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cmd+Space conflicts with Spotlight | Make hotkey configurable in settings |
| mdfind permission issues | Handle errors gracefully, show permission prompt |
| App icon format (.icns) | Use Tauri asset protocol or convert on-demand |
| Performance with many results | Debounce search, limit results to 50 |
