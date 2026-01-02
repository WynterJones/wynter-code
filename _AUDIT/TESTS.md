# Test Coverage Audit

> Test coverage and gaps tracking

**Last Updated:** 2025-12-31
**Score:** 2.0/10
**Status:** IMPROVED - Testing infrastructure in place, 8 passing tests

---

## Current State

| Category | Files | Test Files | Coverage |
|----------|-------|------------|----------|
| TSX Components | 346 | 0 | 0% |
| TypeScript Files | 182 | 1 | 0.5% |
| Zustand Stores | 39 | 0 | 0% |
| Custom Hooks | 17 | 0 | 0% |
| Services | 15 | 0 | 0% |
| Lib Utilities | 12 | 1 | 8% |
| Rust Files | 26 | 1 | 3.8% |

**Total Test Files:** 2 (1 frontend, 1 Rust)
**Total Test Cases:** 11 (8 frontend, 3 Rust)

---

## Infrastructure Status

| Component | Status |
|-----------|--------|
| Test runner (vitest) | Installed |
| Testing library | Installed |
| Tauri mocks | Configured |
| `npm test` script | Working |
| `npm run lint` script | Working |
| Coverage reporter | Configured |

---

## Core Testing Areas (Priority Focus)

We don't need 100% coverage. Focus on these high-value areas:

### P0: Critical Security & Data Integrity

| File | Functions to Test | Why Critical |
|------|-------------------|--------------|
| `lib/sensitiveKeyDetection.ts` | `isSensitiveKey()` | Prevents credential exposure in UI |
| `lib/urlSecurity.ts` | URL validation helpers | Prevents XSS/injection |
| `services/encryption.ts` | `encrypt()`, `decrypt()`, `computeDataHash()` | Data security for backups |
| `lib/errorHandler.ts` | Error message extraction | Consistent error handling |

### P1: Core Business Logic

| File | Functions to Test | Why Important |
|------|-------------------|---------------|
| `services/git.ts` | `parseGitHubUrl()`, status parsing logic | Git panel functionality |
| `lib/parseCliDiff.ts` | `splitContentWithDiffs()`, `parseCliDiffBlock()`, `getFileExtension()` | Claude response rendering |
| `lib/farmwork-parsers.ts` | `parseAuditFile()`, `parseGardenIdeas()`, `parseCompostStats()` | Farmwork tycoon game data |
| `services/modelLimits.ts` | Rate limit calculations | Usage tracking accuracy |

### P2: State Management (Pure Logic Only)

| Store | Functions to Test | Why Important |
|-------|-------------------|---------------|
| `stores/sessionStore.ts` | Session merging, message handling | Chat state consistency |
| `stores/projectStore.ts` | Path normalization, project switching | Project management |
| `stores/settingsStore.ts` | Settings merge/migration | User preferences |
| `stores/beadsStore.ts` | Issue parsing, status transitions | Task tracking |

### P3: Utility Functions

| File | Functions to Test | Why Important |
|------|-------------------|---------------|
| `lib/utils.ts` | `cn()`, `formatDate()` | Used everywhere |
| `lib/storageUtils.ts` | Storage key generation | Data persistence |
| `lib/constants.ts` | Model lists, defaults | Configuration |
| `lib/slashCommandHandler.ts` | Command parsing | Prompt input handling |

### P4: Custom Hooks (Isolation Tests)

| Hook | Logic to Test | Why Important |
|------|---------------|---------------|
| `hooks/useCompression.ts` | Compression/decompression | Backup functionality |
| `hooks/useLauncherSearch.ts` | Search filtering, scoring | Command palette UX |
| `hooks/useFileOperations.ts` | File path handling | File browser reliability |

---

## Rust Backend Testing

Priority Rust modules to test:

| File | Functions to Test | Why Important |
|------|-------------------|--------------|
| `beads.rs` | Issue parsing, status validation | Task tracking CLI |
| `limits_monitor.rs` | Model classification, token math | Usage accuracy |
| `claude_process.rs` | Stream parsing, message extraction | AI interaction |
| `file_coordinator.rs` | Path resolution, conflict detection | File safety |

---

## Testing Patterns

### For Pure Functions (lib/)
```typescript
import { describe, it, expect } from "vitest";
import { functionName } from "./file";

describe("functionName", () => {
  it("handles normal input", () => {
    expect(functionName("input")).toBe("expected");
  });

  it("handles edge cases", () => {
    expect(functionName("")).toBe("");
    expect(functionName(null)).toBeNull();
  });
});
```

### For Tauri-Dependent Code (services/)
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { someService } from "./service";

vi.mock("@tauri-apps/api/core");

describe("someService", () => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset();
  });

  it("handles success response", async () => {
    vi.mocked(invoke).mockResolvedValue({ success: true });
    const result = await someService.doThing();
    expect(result.success).toBe(true);
  });
});
```

### For Zustand Stores (stores/)
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";

describe("store", () => {
  beforeEach(() => {
    useStore.setState(useStore.getInitialState());
  });

  it("updates state correctly", () => {
    useStore.getState().someAction("value");
    expect(useStore.getState().someProperty).toBe("value");
  });
});
```

---

## Next Steps

1. Write tests for `lib/sensitiveKeyDetection.ts` (security critical)
2. Write tests for `lib/parseCliDiff.ts` (core functionality)
3. Write tests for `services/encryption.ts` (data security)
4. Add more Rust tests for `beads.rs`
5. Test store pure logic without React

---

## Score Calculation

| Factor | Max Points | Current | Notes |
|--------|------------|---------|-------|
| Test framework exists | 1.0 | 1.0 | Vitest installed and configured |
| Test scripts work | 1.0 | 1.0 | `npm test` and `npm run lint` work |
| Frontend test files | 3.0 | 0.5 | 1 test file with 8 passing tests |
| Backend test files | 2.0 | 0.5 | 1 of 26 Rust files has tests |
| Core logic tested | 2.0 | 0.0 | No service/store/hook tests yet |
| Coverage >50% | 1.0 | 0.0 | Not achieved |
| **Total** | **10.0** | **2.0** | |

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-31 | Testing infrastructure setup complete: vitest + testing-library, Tauri mocks, 8 passing tests. Score: 2.0/10 |
| 2025-12-27 | Re-audit: Score 1.0/10 - No test/lint scripts, 346 TSX + 182 TS files untested |
| 2025-12-26 | Full test audit: 1 Rust file with tests, 0 frontend tests, Score 1.5/10 |
| 2025-12-22 | Initial test coverage audit setup via Farmwork CLI |
