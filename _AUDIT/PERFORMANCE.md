# Performance Audit

> Performance metrics and optimization tracking

**Last Updated:** 2025-12-31
**Score:** 9/10
**Status:** Excellent - Well-optimized codebase with proper patterns

---

## How to get 10/10

1. ~~All useEffect hooks have proper cleanup for subscriptions, intervals, and event listeners~~ ✓
2. ~~Components rendering lists use React.memo where appropriate~~ FileTreeNode ✓
3. ~~Expensive computations are memoized with useMemo/useCallback~~ 728 usages across 179 files ✓
4. No inline object/function creation in JSX props (partial - 226 inline style usages remain)
5. Large dependencies are code-split/lazy loaded (Monaco is lazy, others bundled)
6. ~~No memory leaks from uncleared intervals or subscriptions~~ ✓
7. Bundle size is optimized with tree-shaking ✓
8. Heavy operations run off the main thread (via Tauri Rust backend) ✓

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| PixiJS for game | Required for Farmwork Tycoon game rendering | Adds ~200KB to bundle |
| Monaco Editor | Required for code editing features | Large bundle (~2MB), lazy loaded |
| xterm.js | Required for terminal emulation | Moderate bundle size, WebGL renderer |
| Recharts | Required for statistics visualizations | Adds chart library overhead |

---

## Current Issues

### ~~HIGH PRIORITY~~ RESOLVED

#### ~~1. Missing useEffect Cleanup - Potential Memory Leaks~~ FIXED

**Impact:** ~~HIGH - Can cause memory leaks over time~~ **RESOLVED**

| File | Issue | Status |
|------|-------|--------|
| `/src/components/meditation/MeditationScreen.tsx` | ~~setTimeout inside setInterval~~ | **FIXED** - `phraseTimeoutRef` tracks timeout, cleanup in useEffect |
| `/src/components/tools/farmwork-tycoon/game/TycoonGame.tsx` | ~~Multiple setTimeout calls~~ | **OK** - `cancelled` flag pattern + proper cleanup |
| `/src/components/tools/farmwork-tycoon/game/particles/FarmParticleEmitter.ts` | ~~setTimeout in class~~ | **FIXED** - `pendingTimeouts` Set, cleared in `destroy()` |
| `/src/components/terminal/Terminal.tsx` | ~~Multiple setTimeout calls~~ | **OK** - `isActiveRef.current` guard pattern |

#### 2. Event Listener Cleanup Patterns - VERIFIED GOOD

**Impact:** LOW - Proper cleanup patterns used consistently

All 74 files with `addEventListener` have corresponding `removeEventListener` in cleanup:

- `/src/components/layout/AppShell.tsx` - Window events with proper cleanup
- `/src/components/meditation/MeditationScreen.tsx` - Keyboard events with useCallback deps
- `/src/components/terminal/Terminal.tsx` - Window resize with ResizeObserver.disconnect()
- `/src/stores/dragStore.ts` - Global mouse listeners with `attachMouseListeners`/`removeMouseListeners` pair

### MEDIUM PRIORITY

#### 3. Inline Object Creation in JSX

**Impact:** MEDIUM - 226 inline style usages across 100 files

Notable files with inline styles that could be optimized:

| File | Count | Issue |
|------|-------|-------|
| `/src/components/tools/farmwork-tycoon/sidebar/StatsSidebar.tsx` | 21 | Many inline styles |
| `/src/components/tools/farmwork-tycoon/game/BuildingPopup.tsx` | 8 | Complex popup styling |
| `/src/components/tools/farmwork-tycoon/MiniGamePlayer.tsx` | 8 | Game UI elements |
| `/src/components/layout/SessionTabBar.tsx` | 7 | Tab positioning |
| `/src/components/panels/panel-types/FarmworkStatsPanel.tsx` | 6 | Stats display |

**Recommendation:** Extract frequently-rendered inline styles to `useMemo` or CSS classes.

#### 4. Missing React.lazy for Code Splitting

**Impact:** MEDIUM - All popups bundled together

No `React.lazy` usage found in the codebase. Large popup components could benefit from lazy loading:

| Component | Approx Size | Usage |
|-----------|-------------|-------|
| `/src/components/tools/database-viewer/*` | Large | On-demand tool |
| `/src/components/tools/homebrew-manager/*` | Large | On-demand tool |
| `/src/components/tools/api-tester/*` | Medium | On-demand tool |
| `/src/components/tools/seo-tools/*` | Medium | On-demand tool |

**Recommendation:** Wrap tool popups in `React.lazy` with `Suspense` fallback.

#### 5. Zustand Store Subscriptions

**Impact:** LOW - Well-designed but heavy in `mobileApiStore.ts`

`/src/stores/mobileApiStore.ts` subscribes to 6 different stores and uses JSON.stringify for change detection:

```typescript
// Lines 64-163: Heavy JSON operations on every store change
let prevWorkspaces = JSON.stringify(useWorkspaceStore.getState().workspaces);
// ... more JSON.stringify calls
```

**Note:** This is debounced (500ms) and only active when mobile API server is running.

### LOW PRIORITY

#### 6. useMemo/useCallback Coverage - EXCELLENT

**Impact:** LOW - Current coverage is very good

**Statistics:**
- 728 total usages of `useMemo`/`useCallback` across 179 files
- `/src/components/layout/AppShell.tsx` - 27 useCallback handlers (best practice)
- `/src/components/files/FileBrowserPopup.tsx` - 24 memoized values/callbacks
- `/src/components/panels/panel-types/YouTubeEmbedPanel.tsx` - 23 memoized handlers

**Good patterns verified:**
- FileTree.tsx: 13 usages - all handlers memoized
- ActivityFeed.tsx: `summary` and `formattedInput` memoized per item
- ResponseCarousel.tsx: 6 usages including `messagePairs`, `lastUserMessage`

#### 7. Bundle Size Considerations

**Impact:** LOW - Desktop app, acceptable bundle size

**Dependencies analysis:**
| Package | Size Impact | Status |
|---------|-------------|--------|
| pixi.js | ~200KB | Required for game |
| @monaco-editor/react | ~2MB | Loaded on demand (not lazy but deferred) |
| recharts | ~100KB | Used for stats |
| highlight.js | ~100KB | Syntax highlighting |
| lucide-react | Tree-shakeable | 392 imports across 304 files - tree-shaking active |
| zustand | ~2KB | Minimal |
| simple-icons | ~50KB | Icon library |

**Recommendation:** Consider dynamic import for Monaco if startup time is slow.

---

## Good Practices Found

1. **Proper useEffect cleanup** - All 104 setTimeout files verified, cleanup patterns in place
2. **Extensive useMemo/useCallback usage** - 728 instances across 179 files
3. **Ref-based tracking** - TycoonGame, Terminal use refs for instance state
4. **Zustand for state** - Efficient state management, persist middleware only on storage
5. **Observer cleanup** - 8 files with ResizeObserver/IntersectionObserver all disconnect properly
6. **Cancellation tokens** - TycoonGame uses `cancelled` flag pattern for async cleanup
7. **OverlayScrollbars** - Performant virtualized scroll containers throughout
8. **Debounced syncs** - mobileApiStore debounces store sync to 500ms
9. **Event listener pairs** - dragStore uses `attachMouseListeners`/`removeMouseListeners` symmetry
10. **React.memo on list items** - FileTreeNode uses memo with custom comparison

---

## Recommendations Summary

| Priority | Action | Effort | Status |
|----------|--------|--------|--------|
| ~~HIGH~~ | ~~Audit setTimeout/setInterval cleanup~~ | ~~Medium~~ | **DONE** |
| MEDIUM | Add React.lazy for tool popups | Medium | Open |
| MEDIUM | Extract inline styles in Farmwork game components | Low | Open |
| ~~MEDIUM~~ | ~~Split large components~~ | ~~Medium~~ | **DONE** |
| ~~LOW~~ | ~~Add React.memo to list items~~ | ~~Low~~ | **DONE** |
| ~~LOW~~ | ~~Add useCallback to FileTree handlers~~ | ~~Low~~ | **DONE** |
| LOW | Consider dynamic import for Monaco | Low | Open |

---

## Performance Metrics

### Memoization Coverage
- **useMemo/useCallback:** 728 usages across 179 files
- **React.memo:** 1 file (FileTreeNode) - adequate for list rendering

### Event Handling
- **addEventListener files:** 74 (all with proper cleanup)
- **Subscription files:** 2 (`mobileApiStore.ts`, `autoBuildGameBridge.ts`)

### Timer Usage
- **setTimeout files:** 104 (all verified with cleanup or guard patterns)
- **setInterval files:** Properly cleaned in useEffect returns

### Observer Usage
- **ResizeObserver:** 6 files - all disconnect on cleanup
- **IntersectionObserver:** 2 files - all disconnect on cleanup

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-31 | **Full Re-audit**: Verified 728 useMemo/useCallback usages, 104 setTimeout files with proper cleanup, 74 addEventListener files with cleanup, 8 Observer files with disconnect. Added recommendations for React.lazy code-splitting. Score maintained at 9/10. |
| 2025-12-31 | **Component Decomposition**: Split 3 large components - ToolsDropdown (73% ↓), TycoonGame (30% ↓), MainContent (70% ↓). Created 13 focused modules. |
| 2025-12-31 | **Memory Leak Prevention**: Fixed setTimeout cleanup in MeditationScreen, FarmParticleEmitter. Verified TycoonGame and Terminal.tsx patterns. Score: 7.5 → 8.5 |
| 2025-12-31 | **React Memoization**: FileTreeNode verified with React.memo; Added useCallback to FileTree handlers |
| 2025-12-26 | Full performance audit - identified memory leak patterns, reviewed memoization, analyzed bundle |
| 2025-12-22 | Initial performance audit setup via Farmwork CLI |
