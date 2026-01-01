# Code Quality Audit

> Code quality and standards tracking

**Last Updated:** 2025-12-31
**Score:** 8.5/10
**Status:** FAIR - Several areas need attention

---

## How to get 10/10

- [x] Zero TODO/FIXME/HACK comments remaining
- [x] No `@ts-ignore` usage
- [ ] **1 `as any` usage remaining** (sessionStore.ts:687 - migration code)
- [x] All functions under 1000 lines
- [ ] **DRY violations found** (error message pattern, copy timeout pattern)
- [ ] **Inconsistent error handling** (50+ `catch (e)` patterns still exist)
- [ ] **Magic number 2000ms** used 24+ times for copy timeouts
- [ ] **Console.log statements** still present in mobileApiStore.ts (55+)

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| Legacy game code | Farmwork Tycoon has complex state | Harder to refactor |
| Zustand Map serialization | Requires custom partialize/merge | Extra boilerplate |
| Third-party xterm.js | WebGL addon edge cases | Defensive coding needed |
| Mobile API store | Extensive debug logging intentional | Acceptable during development |

---

## Open Items

### Type Safety Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `sessionStore.ts` | 687 | `as any` for migration code | Low |

The `as any` is used for backward compatibility during session migration and is acceptable.

### DRY Violations

**Copy Timeout Pattern (24 instances)**
The pattern `setTimeout(() => setCopiedX(null), 2000)` is repeated across 24+ files:
- `Step4SystemCheck.tsx`, `LocalhostTunnelPopup.tsx`, `HttpHeadersInspector.tsx`
- `DnsLookup.tsx`, `RedirectTracker.tsx`, `SslChecker.tsx`, `IpAddressLookup.tsx`
- `McpServerRow.tsx`, `TimestampConverter.tsx`, `IssuesTab.tsx`, `HashGenerator.tsx`
- `EpicsTab.tsx`, `UuidGenerator.tsx`, `JwtDebugger.tsx`, `NumberBaseConverter.tsx`
- `ByteSizeConverter.tsx`, `PasswordGenerator.tsx`, `UrlParser.tsx`, `GitHubManagerPopup.tsx`
- `SlugGenerator.tsx`, `LivePreviewPopup.tsx`, `CaseConverter.tsx`, `IpAddressTool.tsx`
- `HttpStatusReference.tsx`

**Recommendation:** Create a `useCopyWithFeedback` hook in `/hooks`:
```typescript
function useCopyWithFeedback(timeout = 2000) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (text: string, id?: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id ?? text);
    setTimeout(() => setCopied(null), timeout);
  };
  return { copied, copy, isCopied: (id: string) => copied === id };
}
```

**Error Display Pattern**
The pattern `bg-red-500/10 border border-red-500/20 rounded-lg text-red-400` appears in 15+ files. Consider a shared `ErrorBanner` component.

### Complexity Issues

**Large Files (>1000 lines):**

| File | Lines | Notes |
|------|-------|-------|
| `autoBuildStore.ts` | 2012 | Complex automation logic, well-organized |
| `SettingsPopup.tsx` | 1531 | Many settings tabs - acceptable |
| `ProjectTabBar.tsx` | 1365 | Many popup state vars - could extract to store |
| `mobileApiStore.ts` | 1076 | Mobile API sync logic |
| `ProjectTemplatesPopup.tsx` | 1008 | Template management |

**ProjectTabBar.tsx State Bloat:**
Lines 381-416 contain 36 `useState` hooks for popup visibility. Consider:
1. Moving popup state to a dedicated `popupStore.ts`
2. Using a single `activePopup: string | null` state
3. Using the existing `minimizedPopupsStore` pattern

### Error Handling Patterns

**Inconsistent `catch (e)` vs `catch (error)`:**
50+ instances still use `catch (e)` pattern:
- `mobileApiStore.ts` (7 instances)
- `domain-tools/*.tsx` (7 instances)
- `dev-toolkit/tools/*.tsx` (18 instances)
- `Terminal.tsx` (2 instances)
- Others

The centralized `errorHandler.ts` is only used in 7 files. Many components still use inline error handling.

### Console Logging

**mobileApiStore.ts** contains 55+ `console.log` statements for mobile sync debugging. These are intentional during active development of the mobile companion feature.

**Other files:**
- `bookmarkStore.ts` (2) - deduplication logging
- `subscriptionStore.ts` (2) - deduplication logging
- `kanbanStore.ts` (1) - deduplication logging
- `workspaceStore.ts` (1) - deduplication logging
- `TycoonGame.tsx` (2) - game state logging
- `GitHubManagerPopup.tsx` (1) - debug logging

### Magic Numbers

**Timeout Values:**
- `2000` - copy feedback timeout (24 instances) - **should extract to constant**
- `500` - debounce timeout (mobileApiStore.ts)
- `4000` - diff truncation (CommitSection.tsx)
- `65535` - port max (LivePreviewPopup.tsx)

**Colors:**
Some hex colors are hardcoded in `FarmworkPhraseDropdown.tsx`:
- `#08080f`, `#181825`, `#313244`, `#45475a`, `#6c7086`, `#cdd6f4`, `#a6e3a1`

These are Catppuccin theme colors and could be moved to CSS variables.

---

## Positive Findings

- Zero technical debt markers (TODO/FIXME/HACK)
- Good type definitions in separate `/types` folder
- Consistent use of Zustand for state management
- Custom hooks properly separated in `/hooks`
- Component composition is well-organized
- Many magic numbers extracted to `src/lib/constants.ts` and local game constants
- Centralized utilities in `src/lib/`: `errorHandler.ts`, `debug.ts`, `sensitiveKeyDetection.ts`, `constants.ts`, `farmwork-parsers.ts`
- Reusable Map helpers (`mapSet`, `mapDelete`, `mapUpdate`) exported from sessionStore
- Single source of truth for tool definitions (`TOOL_DEFINITIONS` in ToolsDropdown.tsx)
- ESLint disable comments minimal (only 2 remaining, both justified)

---

## Recommendations

### High Priority

1. **Create `useCopyWithFeedback` hook** - Eliminates 24 DRY violations
2. **Add `COPY_FEEDBACK_TIMEOUT = 2000` to constants.ts** - Centralizes magic number
3. **Standardize `catch (error)` pattern** - Replace remaining 50+ `catch (e)` instances

### Medium Priority

4. **Create `ErrorBanner` component** - Standardizes error display styling
5. **Extract popup state from ProjectTabBar** - Reduces component complexity
6. **Move Catppuccin colors to CSS variables** - In FarmworkPhraseDropdown.tsx

### Low Priority

7. **Review mobileApiStore logging** - Consider using debug.ts utility
8. **Document intentional console.log patterns** - For stores doing deduplication checks

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-31 | Full audit - Found DRY violations (copy timeout x24), complexity issues (5 files >1000 lines), inconsistent error handling (50+ catch(e)), score 10 → 8.5 |
| 2025-12-31 | Fixed all type safety issues - ScrollArea ref type, BookmarkIcon module types, Terminal effect deps |
| 2025-12-30 | Complexity reduction complete - ToolsDropdown dedupe (1337→1067), sessionStore Map helpers, farmwork-parsers extraction, Terminal/FileBrowser cleanup |
| 2025-12-30 | Error handling standardized - created errorHandler.ts utility, updated 64+ catch blocks across stores/services |
| 2025-12-30 | DRY violations resolved - consolidated 4 spawn functions, created shared sensitiveKeyDetection utility |
| 2025-12-30 | Console logging cleanup - created debug.ts utility, audited 24 files (already clean) |
| 2025-12-30 | Extracted magic numbers to constants - ports, UI dimensions, game timing |
| 2025-12-26 | Full code quality audit - identified DRY violations, complexity, magic numbers |
| 2025-12-22 | Initial code quality audit setup via Farmwork CLI |
