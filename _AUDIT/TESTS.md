# Test Coverage Audit

> Test coverage and gaps tracking

**Last Updated:** 2025-12-27
**Score:** 1.0/10
**Status:** CRITICAL - No frontend tests, minimal backend tests, no test runner configured

---

## How to get 10/10

- Test framework configured (Vitest for frontend, cargo test for backend)
- Unit tests for all utility functions in `/lib`
- Unit tests for all custom hooks
- Unit tests for all Zustand stores
- Integration tests for critical user flows
- Component tests for reusable UI components
- >80% code coverage overall
- E2E tests for main workflows
- All Rust commands have unit tests

---

## Current State Summary

| Category | Files | Test Files | Coverage |
|----------|-------|------------|----------|
| TSX Components | 346 | 0 | 0% |
| TypeScript Files | 182 | 0 | 0% |
| Zustand Stores | 33 | 0 | 0% |
| Custom Hooks | 14 | 0 | 0% |
| Services | 9 | 0 | 0% |
| Lib Utilities | 4 | 0 | 0% |
| Rust Files | 26 | 1 | 3.8% |

**Total Test Files:** 1 (in Rust)
**Total Test Cases:** 3 (all in limits_monitor.rs)

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| No test runner | No vitest/jest in devDependencies | Cannot run frontend tests |
| Tauri integration | Many components depend on Tauri APIs | Need mocking strategy |
| Heavy side effects | Stores interact with filesystem/shell | Requires isolation |
| Large component count | 346 TSX files | Prioritization needed |

---

## Existing Tests

### Rust Backend

| File | Tests | Purpose |
|------|-------|---------|
| `src-tauri/src/limits_monitor.rs` | 3 | Model classification, token math, week start calculation |

```rust
// Tests in limits_monitor.rs:
- test_classify_model: Validates model tier detection
- test_tokens_to_hours: Verifies token-to-hours conversion
- test_get_week_start: Checks week boundary calculation
```

### Frontend

None.

---

## Priority Testing Targets

### P0 - Critical (Should test first)

| Category | Files | Reason |
|----------|-------|--------|
| `/lib/*.ts` | 4 | Pure utility functions, easiest to test |
| `/services/encryption.ts` | 1 | Security-critical |
| `/services/git.ts` | 1 | Core functionality |
| `/stores/sessionStore.ts` | 1 | Complex state management |

### P1 - High Priority

| Category | Files | Reason |
|----------|-------|--------|
| Custom Hooks | 14 | Reusable logic, moderate complexity |
| `/services/*.ts` | 9 | Business logic layer |
| `/stores/*Store.ts` | 34 | State management |

### P2 - Medium Priority

| Category | Files | Reason |
|----------|-------|--------|
| UI Components `/ui/*` | 14 | Reusable building blocks |
| `/components/prompt/*` | 6 | User input handling |

### P3 - Lower Priority

| Category | Files | Reason |
|----------|-------|--------|
| Page components | 300+ | Integration tests preferred |
| Tool popups | 174 | Similar patterns, less ROI per test |

---

## Recommendations

### Immediate Actions

1. **Install test framework**
   ```bash
   pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom
   ```

2. **Add test script to package.json**
   ```json
   "test": "vitest",
   "test:coverage": "vitest --coverage"
   ```

3. **Create vitest.config.ts** with Tauri mocks

4. **Start with `/lib` utilities** - Pure functions, no dependencies

### Quick Wins

| File | Estimated Effort | Impact |
|------|------------------|--------|
| `lib/colorUtils.ts` | 30 min | Color manipulation logic |
| `lib/utils.ts` | 30 min | General utilities |
| `lib/storageUtils.ts` | 30 min | Storage helpers |
| `services/encryption.ts` | 1 hour | Security validation |

### Rust Testing

Most Rust files have no tests. Priority additions:

| File | Functions to Test |
|------|-------------------|
| `beads.rs` | Issue parsing, status transitions |
| `claude_process.rs` | Process spawning, message parsing |
| `api_tester.rs` | Request building, response parsing |

---

## Score Calculation

| Factor | Max Points | Current | Notes |
|--------|------------|---------|-------|
| Test framework exists | 1.0 | 0.0 | No vitest/jest in package.json, no `test` script |
| Frontend test files | 3.0 | 0.0 | None exist (0 of 528 TS/TSX files) |
| Backend test files | 2.0 | 0.5 | 1 of 26 Rust files has tests |
| Core logic tested | 2.0 | 0.0 | No store/service/hook tests |
| E2E tests | 1.0 | 0.0 | None |
| Coverage >50% | 1.0 | 0.0 | No coverage tooling |
| **Total** | **10.0** | **1.0** | |

**Score Breakdown:**
- 0.5 points for having 3 Rust tests in `limits_monitor.rs`
- 0.5 points for cargo test capability (tests pass when run)
- 0.0 points for frontend (no framework, no `npm test` script, no test files)

**Note:** Score reduced from 1.5 to 1.0 because:
- No `npm run test` script exists
- No `npm run lint` script exists
- Build works but no automated quality gates

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-27 | Re-audit: Score 1.0/10 - No test/lint scripts, 346 TSX + 182 TS files untested |
| 2025-12-26 | Full test audit: 1 Rust file with tests, 0 frontend tests, Score 1.5/10 |
| 2025-12-22 | Initial test coverage audit setup via Farmwork CLI |
