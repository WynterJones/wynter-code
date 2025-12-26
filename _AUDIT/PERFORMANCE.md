# Performance Audit

> Performance metrics and optimization tracking

**Last Updated:** 2025-12-26
**Score:** 7.0/10
**Status:** Reviewed - Multiple areas need attention

---

## How to get 10/10

1. All useEffect hooks have proper cleanup for subscriptions, intervals, and event listeners
2. Components rendering lists use React.memo where appropriate
3. Expensive computations are memoized with useMemo/useCallback
4. No inline object/function creation in JSX props
5. Large dependencies are code-split/lazy loaded
6. No memory leaks from uncleared intervals or subscriptions
7. Bundle size is optimized with tree-shaking
8. Heavy operations run off the main thread

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

### HIGH PRIORITY

#### 1. Missing useEffect Cleanup - Potential Memory Leaks

**Impact:** HIGH - Can cause memory leaks over time

Several components have setInterval/setTimeout without proper cleanup:

| File | Issue |
|------|-------|
| `/src/components/meditation/MeditationScreen.tsx:39` | setTimeout inside setInterval - may not be cleared on unmount |
| `/src/components/tools/farmwork-tycoon/game/TycoonGame.tsx:259,298,310,316` | Multiple setTimeout calls without tracking for cleanup |
| `/src/components/tools/farmwork-tycoon/game/particles/FarmParticleEmitter.ts:190` | setTimeout in class without lifecycle management |
| `/src/components/terminal/Terminal.tsx:392-398` | Multiple setTimeout calls - properly tracked but complex |

**Recommendation:** Use refs to track all timeout/interval IDs and clear them in cleanup functions.

#### 2. Event Listener Cleanup Patterns

**Impact:** MEDIUM - Memory leaks possible if components unmount/remount frequently

Most event listeners ARE properly cleaned up, but these patterns exist throughout the codebase:

```tsx
// Good pattern (used in most files):
useEffect(() => {
  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}, [handler]);
```

**Files with proper cleanup:** `/src/components/layout/AppShell.tsx`, `/src/components/meditation/MeditationScreen.tsx`, most popup components.

### MEDIUM PRIORITY

#### 3. Inline Object Creation in JSX

**Impact:** MEDIUM - Can cause unnecessary re-renders

| File | Line | Issue |
|------|------|-------|
| `/src/components/meditation/MeditationScreen.tsx:131-139` | Inline style objects in map | Creates new objects each render |
| `/src/components/files/FileTree.tsx:427-440` | Props object spread in map | Works but could be optimized |

**Recommendation:** Extract static style objects to constants or useMemo.

#### 4. Large Component Files

**Impact:** MEDIUM - Affects code maintainability and bundle splitting

| File | Lines | Issue |
|------|-------|-------|
| `/src/components/tools/ToolsDropdown.tsx` | 1200+ | Very large file with all tool definitions |
| `/src/components/tools/farmwork-tycoon/game/TycoonGame.tsx` | 577 | Complex game logic in single component |
| `/src/components/layout/MainContent.tsx` | 624 | Many responsibilities |

**Recommendation:** Split into smaller, focused components.

#### 5. JSON.parse/stringify in Render Path

**Impact:** MEDIUM - Can be expensive for large objects

| File | Usage |
|------|-------|
| `/src/components/output/PermissionApprovalModal.tsx:45,59` | JSON.parse/stringify for display |
| `/src/components/output/ActivityFeed.tsx:82,101-102,107` | Multiple JSON operations per render |
| `/src/stores/*.ts` | persist middleware uses JSON - acceptable for storage |

**Recommendation:** Memoize JSON operations where used for display.

### LOW PRIORITY

#### 6. useMemo/useCallback Coverage

**Impact:** LOW - Current usage is generally good

**Good patterns found:**
- `/src/components/tools/ToolsDropdown.tsx` - filteredTools, categories, navigableTools all memoized
- `/src/components/meditation/MeditationScreen.tsx` - stars, shootingStars, ambientColor memoized
- `/src/components/layout/MainContent.tsx` - pendingApprovalTool memoized
- Most callbacks wrapped in useCallback

**Areas for improvement:**
- Some handler functions in FileTree.tsx could benefit from useCallback
- Some components with frequent renders could use React.memo

#### 7. Bundle Size Considerations

**Impact:** LOW - Desktop app, not web critical

**Heavy dependencies:**
| Package | Size Impact | Notes |
|---------|-------------|-------|
| pixi.js | ~200KB | Required for game |
| @monaco-editor/react | ~2MB | Lazy loaded |
| recharts | ~100KB | Used for stats |
| lucide-react | Tree-shakeable | Good |
| zustand | ~2KB | Minimal |

**Recommendation:** Monitor bundle size with Vite's build analyzer.

---

## Good Practices Found

1. **Proper useEffect cleanup** - Most components properly clean up event listeners
2. **useMemo/useCallback usage** - Widely used for expensive computations
3. **Ref-based tracking** - TycoonGame uses refs to track instance state correctly
4. **Zustand for state** - Efficient state management with minimal re-renders
5. **ResizeObserver cleanup** - Terminal.tsx properly disconnects observers
6. **Cancellation tokens** - TycoonGame uses `cancelled` flag pattern for async cleanup
7. **OverlayScrollbars** - Performant scroll containers throughout

---

## Recommendations Summary

| Priority | Action | Effort |
|----------|--------|--------|
| HIGH | Audit setTimeout/setInterval cleanup in game code | Medium |
| MEDIUM | Extract inline styles to constants in MeditationScreen | Low |
| MEDIUM | Split ToolsDropdown into smaller files | Medium |
| LOW | Add React.memo to list item components (FileTreeNode) | Low |
| LOW | Memoize JSON operations in ActivityFeed | Low |

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-26 | Full performance audit - identified memory leak patterns, reviewed memoization, analyzed bundle |
| 2025-12-22 | Initial performance audit setup via Farmwork CLI |
