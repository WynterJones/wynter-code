# Code Quality Audit

> Code quality and standards tracking

**Last Updated:** 2025-12-26
**Score:** 7.2/10
**Status:** FAIR - 5 areas need attention

---

## How to get 10/10

- Zero TODO/FIXME/HACK comments remaining
- No `as any` or `@ts-ignore` usage
- All functions under 50 lines
- No DRY violations (duplicated code blocks)
- Consistent error handling patterns
- Zero magic numbers (all constants extracted)
- All console.log statements removed or converted to proper logging

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| Legacy game code | Farmwork Tycoon has complex state | Harder to refactor |
| Zustand Map serialization | Requires custom partialize/merge | Extra boilerplate |
| Third-party xterm.js | WebGL addon edge cases | Defensive coding needed |

---

## Open Items

### DRY Violations

- [MEDIUM] `spawnVehicle`, `spawnVehicleWithTint`, `spawnVehicleWithRoute` in `/Users/wynterjones/Work/SYSTEM/wynter-code/src/stores/farmworkTycoonStore.ts` (lines 453-582) - 3 nearly identical functions that could be consolidated
- [LOW] `isSensitiveEnvKey` in mcpStore.ts and `detectSensitive` in envStore.ts - similar sensitivity detection logic duplicated

### Complexity Issues

- [MEDIUM] `ToolsDropdown.tsx` (1337 lines) - Large component with tool definitions duplicated in both `TOOL_DEFINITIONS` array and internal `tools` array
- [MEDIUM] `sessionStore.ts` (645 lines) - Multiple update functions with repetitive Map cloning pattern
- [MEDIUM] `farmworkTycoonStore.ts` (674 lines) - Complex store with parsing logic that could be extracted
- [LOW] `Terminal.tsx` (454 lines) - Complex initialization with multiple try/catch blocks and async race condition handling
- [LOW] `FileBrowserPopup.tsx` (652 lines) - Many useCallback hooks with overlapping logic

### Type Safety Issues

- [LOW] `ScrollArea.tsx:15` - Uses `as any` for ref
- [LOW] `BookmarkIcon.tsx` - 3 instances of eslint-disable for any types
- [LOW] `Terminal.tsx:336` - eslint-disable for react-hooks/exhaustive-deps

### Technical Debt Markers

- No TODO/FIXME/HACK comments found - Good

### Console Logging

- 79 occurrences of console.log/error/warn across 20 files
- Heavy logging in: autoBuildStore.ts (6), farmworkTycoonStore.ts (15), sessionStore.ts (3)
- Most are debug logs that should be removed or gated behind debug mode

### Magic Numbers

- Port numbers hardcoded: `6006` (Storybook), `9876` (Live Preview)
- UI values: `256` (sidebar width), `200` (terminal height), `400` (autoHideDelay)
- Game values in farmworkTycoonStore.ts: `500`, `800`, `400`, `300`, `200`, `3000`, `250`
- Consider extracting to constants files

### Error Handling Patterns

- 50+ try/catch blocks across stores
- Inconsistent: some log errors, some silently swallow
- Pattern in databaseViewerStore.ts uses `catch (e)` with unnamed variable
- Recommendation: Create centralized error handling utility

---

## Positive Findings

- Zero technical debt markers (TODO/FIXME/HACK)
- Good type definitions in separate `/types` folder
- Consistent use of Zustand for state management
- Custom hooks properly separated in `/hooks`
- Component composition is well-organized

---

## Recommendations

1. **Consolidate spawn functions** - Create single `spawnVehicle(options: SpawnOptions)`
2. **Extract ToolsDropdown definitions** - Keep only `TOOL_DEFINITIONS`, generate runtime tools from it
3. **Create Map update helper** - Reduce boilerplate in sessionStore and other stores
4. **Add debug flag for console logs** - Gate verbose logging behind feature flag
5. **Extract constants** - Move magic numbers to `constants.ts` files

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-26 | Full code quality audit - identified DRY violations, complexity, magic numbers |
| 2025-12-22 | Initial code quality audit setup via Farmwork CLI |
