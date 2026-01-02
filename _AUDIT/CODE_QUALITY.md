# Code Quality Audit

> Code quality and standards tracking

**Last Updated:** 2025-12-31
**Score:** 9.0/10
**Status:** GOOD - Core patterns established, migration work remaining

---

## How to get 10/10

- [x] Zero TODO/FIXME/HACK comments in TypeScript (0 found)
- [ ] **5 TODO comments in Rust** (mobile_api.rs - active development)
- [x] No `@ts-ignore` usage
- [ ] **2 `as any` usages** (sessionStore.ts:687 migration, slashCommandHandler.test.ts:355 test)
- [x] All functions under 1000 lines
- [ ] **DRY violations partially resolved** - Hook created, 8 files migrated, 36 still need migration
- [x] ~~Inconsistent error handling~~ - Standardized 50+ `catch (error)` patterns
- [x] ~~Magic number 2000ms~~ - Extracted to `COPY_FEEDBACK_TIMEOUT` constant
- [ ] **Console.log statements** - 58 total (45 in mobileApiStore.ts - intentional)
- [ ] **ErrorBanner not adopted** - Component exists but 0 files import it

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| Legacy game code | Farmwork Tycoon has complex state | Harder to refactor |
| Zustand Map serialization | Requires custom partialize/merge | Extra boilerplate |
| Third-party xterm.js | WebGL addon edge cases | Defensive coding needed |
| Mobile API store | Extensive debug logging intentional | Acceptable during development |
| Mobile API Rust | Active development with placeholder TODOs | Acceptable during development |

---

## Open Items

### Type Safety Issues

| File | Line | Issue | Severity |
|------|------|-------|----------|
| `sessionStore.ts` | 687 | `as any` for migration code | Low |
| `slashCommandHandler.test.ts` | 355 | `as any` for test type coercion | Low |

Both `as any` usages are acceptable - one for backward compatibility during session migration, one for test edge case.

### Technical Debt Markers (Rust)

| File | Line | Comment | Status |
|------|------|---------|--------|
| `mobile_api.rs` | 2220 | TODO: Connect to session store | Placeholder |
| `mobile_api.rs` | 2238 | TODO: Connect to message store | Placeholder |
| `mobile_api.rs` | 2813 | TODO: Handle project subscription | Placeholder |
| `mobile_api.rs` | 2816 | TODO: Forward to chat service | Placeholder |
| `mobile_api.rs` | 2819 | TODO: Forward to permission handler | Placeholder |

These are intentional placeholders in active mobile API development.

### DRY Violations - PARTIALLY RESOLVED

**Copy Timeout Pattern - PARTIALLY FIXED**
Created `useCopyWithFeedback` hook at `src/hooks/useCopyWithFeedback.ts`.
Added `COPY_FEEDBACK_TIMEOUT` constant to `src/lib/constants.ts`.

**Migrated (8 files):**
- `HashGenerator.tsx`, `UuidGenerator.tsx`, `JwtDebugger.tsx`, `TimestampConverter.tsx`
- `PasswordGenerator.tsx`, `UrlParser.tsx`, `NumberBaseConverter.tsx`, `ByteSizeConverter.tsx`

**Remaining (36 files with `setCopied(true)` pattern):**
- SEO tools (9): RobotsTxtGenerator, OpenGraphGenerator, StructuredDataGenerator, SitemapGenerator, HreflangGenerator, TwitterCardGenerator, CanonicalUrlHelper, LlmsTxtGenerator, MetaTagsGenerator
- Dev toolkit (12): RegexTester, QrCodeGenerator, HmacGenerator, CronParser, BcryptGenerator, HtmlCssValidator, LoremIpsumGenerator, TextDiffTool, PlaceholderImageGenerator, UserAgentParser, ListSorterDeduplicator, others
- Domain tools (1): WhoisLookup
- Other components (14): CodeBlock, ClaudeResponseCard, ResponseCarousel, BeadsTrackerPopup, MobileCompanionTab, AutoBuildPopup, FarmworkTycoonPopup, JsonViewerModal, CellInspector, EnvVariableRow, WebhookPanel, ResponseViewer, ExportBookmarksModal, FaviconGeneratorPopup

**Error Display Pattern - CREATED BUT NOT ADOPTED**
Created shared `ErrorBanner` component at `src/components/ui/ErrorBanner.tsx`.
However, **0 files currently import it** - 24 files still use inline `bg-red-500/10 border border-red-500/20` pattern.

### Complexity Issues

**Large Files (>1000 lines):**

| File | Lines | Notes |
|------|-------|-------|
| `autoBuildStore.ts` | 2012 | Complex automation logic, well-organized |
| `SettingsPopup.tsx` | 1531 | Many settings tabs - acceptable |
| `ProjectTabBar.tsx` | 1386 | Many popup state vars - could extract to store |
| `mobileApiStore.ts` | 1076 | Mobile API sync logic |
| `ProjectTemplatesPopup.tsx` | 1008 | Template management |
| `mobile_api.rs` | 5900 | Very large Rust file - mobile API server |

**ProjectTabBar.tsx State Bloat:**
Contains 44 `useState` hooks, mostly for popup visibility. Consider:
1. Moving popup state to a dedicated `popupStore.ts`
2. Using a single `activePopup: string | null` state
3. Using the existing `minimizedPopupsStore` pattern

**Rust Complexity:**
`mobile_api.rs` at 5900 lines is very large. Contains the full mobile companion API server. Could benefit from splitting into:
- `mobile_api/routes.rs` - HTTP route handlers
- `mobile_api/websocket.rs` - WebSocket handling
- `mobile_api/auth.rs` - Authentication logic
- `mobile_api/state.rs` - Shared state management

### Error Handling Patterns - RESOLVED

**Standardized `catch (error)` pattern:**
All 50+ instances of `catch (e)` have been updated to `catch (error)`:
- `mobileApiStore.ts` - fixed 7 instances
- `domain-tools/*.tsx` - fixed 7 instances
- `dev-toolkit/tools/*.tsx` - fixed 18 instances
- `Terminal.tsx` - fixed 2 instances
- All other files updated

The centralized `errorHandler.ts` is available for complex error scenarios.

### Console Logging

**Total: 58 console.log statements across 9 files**

| File | Count | Purpose |
|------|-------|---------|
| `mobileApiStore.ts` | 45 | Mobile sync debugging (intentional) |
| `debug.ts` | 3 | Debug utility (intentional) |
| `bookmarkStore.ts` | 2 | Deduplication logging |
| `subscriptionStore.ts` | 2 | Deduplication logging |
| `git.ts` | 2 | Git operation logging |
| `kanbanStore.ts` | 1 | Deduplication logging |
| `workspaceStore.ts` | 1 | Deduplication logging |
| `TycoonGame.tsx` | 1 | Game state logging |
| `farmwork-standalone/App.tsx` | 1 | Standalone app logging |

Most are intentional during active mobile companion development.

### Magic Numbers - MOSTLY RESOLVED

**Timeout Values:**
- `2000` - copy feedback timeout - **FIXED**: Extracted to `COPY_FEEDBACK_TIMEOUT` in `src/lib/constants.ts`
- `500` - debounce timeout (mobileApiStore.ts) - acceptable inline
- `4000` - diff truncation (CommitSection.tsx) - acceptable inline
- `65535` - port max (LivePreviewPopup.tsx) - standard network constant

**Colors - FIXED:**
Added Catppuccin surface/overlay colors to `tailwind.config.js`:
- `surface-crust`, `surface-mantle`, `surface-base`, `surface-0/1/2`
- `overlay-0/1/2`
- Updated `FarmworkPhraseDropdown.tsx` to use semantic Tailwind classes

### ESLint Disable Comments

Only 2 `eslint-disable` comments remain (both justified):
1. `sessionStore.ts:686` - `@typescript-eslint/no-explicit-any` for migration code
2. `AIAssistantPopup.tsx:105` - `react-hooks/exhaustive-deps` for intentional effect behavior

### Rust Code Quality

**unwrap()/expect() usage:** 227 occurrences across 21 Rust files

This is tracked separately in `_AUDIT/RUST.md`. Most are in error paths or initialization code where panicking is acceptable.

---

## Positive Findings

- Zero technical debt markers (TODO/FIXME/HACK) in TypeScript
- Good type definitions in separate `/types` folder
- Consistent use of Zustand for state management
- Custom hooks properly separated in `/hooks`
- Component composition is well-organized
- Many magic numbers extracted to `src/lib/constants.ts` and local game constants
- Centralized utilities in `src/lib/`: `errorHandler.ts`, `debug.ts`, `sensitiveKeyDetection.ts`, `constants.ts`, `farmwork-parsers.ts`
- Reusable Map helpers (`mapSet`, `mapDelete`, `mapUpdate`) exported from sessionStore
- Single source of truth for tool definitions (`TOOL_DEFINITIONS` in ToolsDropdown.tsx)
- ESLint disable comments minimal (only 2 remaining, both justified)
- Shared component patterns established (`useCopyWithFeedback`, `ErrorBanner`)

---

## Recommendations

### Completed (Epic wynter-code-3vy5)

1. ~~**Create `useCopyWithFeedback` hook**~~ - DONE: `src/hooks/useCopyWithFeedback.ts`
2. ~~**Add `COPY_FEEDBACK_TIMEOUT = 2000` to constants.ts**~~ - DONE
3. ~~**Standardize `catch (error)` pattern**~~ - DONE: 50+ instances fixed
4. ~~**Create `ErrorBanner` component**~~ - DONE: `src/components/ui/ErrorBanner.tsx`
5. ~~**Move Catppuccin colors to CSS variables**~~ - DONE: Added to tailwind.config.js

### High Priority

6. **Migrate remaining 36 files to useCopyWithFeedback** - Hook exists, adoption incomplete
7. **Adopt ErrorBanner component** - 24 files still use inline error styling
8. **Split mobile_api.rs** - 5900 lines is too large, should be modularized

### Deferred

9. **Extract popup state from ProjectTabBar** - Complex refactor with many dependencies (lazy loading, initialTool states, event listeners). Requires dedicated planning session.

### Low Priority

10. **Review mobileApiStore logging** - Consider using debug.ts utility
11. **Document intentional console.log patterns** - For stores doing deduplication checks
12. **Complete Rust TODO placeholders** - 5 TODOs in mobile_api.rs for mobile companion features

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-31 | Full re-audit: Score 9.2 → 9.0. Found ErrorBanner not adopted (0 imports), 36 files still need useCopyWithFeedback migration, 5 Rust TODOs in mobile_api.rs, mobile_api.rs at 5900 lines. |
| 2025-12-31 | Created useCopyWithFeedback hook and COPY_FEEDBACK_TIMEOUT constant. Migrated 8 dev-toolkit files. 46+ files still need migration to complete DRY violations resolution. |
| 2025-12-31 | Epic 3vy5 complete: Created useCopyWithFeedback hook, COPY_FEEDBACK_TIMEOUT constant, ErrorBanner component, standardized 50+ catch(error) patterns, added Catppuccin CSS vars to Tailwind. Score 8.5 → 9.2 |
| 2025-12-31 | Full audit - Found DRY violations (copy timeout x24), complexity issues (5 files >1000 lines), inconsistent error handling (50+ catch(e)), score 10 → 8.5 |
| 2025-12-31 | Fixed all type safety issues - ScrollArea ref type, BookmarkIcon module types, Terminal effect deps |
| 2025-12-30 | Complexity reduction complete - ToolsDropdown dedupe (1337→1067), sessionStore Map helpers, farmwork-parsers extraction, Terminal/FileBrowser cleanup |
| 2025-12-30 | Error handling standardized - created errorHandler.ts utility, updated 64+ catch blocks across stores/services |
| 2025-12-30 | DRY violations resolved - consolidated 4 spawn functions, created shared sensitiveKeyDetection utility |
| 2025-12-30 | Console logging cleanup - created debug.ts utility, audited 24 files (already clean) |
| 2025-12-30 | Extracted magic numbers to constants - ports, UI dimensions, game timing |
| 2025-12-26 | Full code quality audit - identified DRY violations, complexity, magic numbers |
| 2025-12-22 | Initial code quality audit setup via Farmwork CLI |
