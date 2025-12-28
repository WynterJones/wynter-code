# Auto-Build Quality Gates Enhancement Plan

## Overview

Enhance the auto-build pipeline with AI-powered quality gates using subagents. Keep the simple 4-column UI but add comprehensive code review before npm verification.

**New Flow:**
```
Backlog → Doing → Self-Review → Subagent Audits → NPM Verification → Human Review
           │           │              │                  │
           │           │              │                  └── lint/test/build
           │           │              └── security-auditor, performance-auditor, etc.
           │           └── Claude reviews own code
           └── Claude implements
```

---

## Key Decisions

1. **Self-review:** Always ON after implementation
2. **AI audits:** Use specialized subagents (most thorough)
3. **Order:** AI audits run BEFORE npm verification (faster feedback)

---

## New Pipeline Phases

### Phase 1: Working (existing)
Claude implements the issue as today.

### Phase 2: Self-Review (NEW)
After implementation, Claude reviews its own code:
```
Review the code you just wrote for issue {id}:
- Check for security issues (injection, XSS, etc.)
- Check for performance problems (memory leaks, N+1 queries)
- Check for code quality (DRY violations, complexity)
- Check for accessibility issues (if UI changes)

Fix any issues you find. Confirm when ready.
```

### Phase 3: Subagent Audits (NEW - configurable)
Spawn specialized audit agents on the modified files:

| Agent | Focus | Runs When |
|-------|-------|-----------|
| `security-auditor` | OWASP vulnerabilities | `runSecurityAudit: true` |
| `performance-auditor` | Memory leaks, anti-patterns | `runPerformanceAudit: true` |
| `code-smell-auditor` | DRY, complexity, naming | `runCodeQualityAudit: true` |
| `accessibility-auditor` | WCAG 2.1 compliance | `runAccessibilityAudit: true` + UI files changed |

Each audit:
1. Receives list of modified files
2. Runs focused analysis
3. Returns pass/fail + issues found
4. If issues → enter fix loop

### Phase 4: NPM Verification (existing)
Run lint/test/build as today.

### Phase 5: Human Review (existing)
Await human approval before closing.

---

## Implementation Plan

### Step 1: Add New Phases to Types
**File:** `src/types/autoBuild.ts`

```typescript
// Update AutoBuildPhase
type AutoBuildPhase =
  | "selecting"
  | "working"
  | "selfReviewing"      // NEW
  | "securityAudit"      // NEW
  | "performanceAudit"   // NEW
  | "codeQualityAudit"   // NEW
  | "accessibilityAudit" // NEW
  | "testing"
  | "fixing"
  | "reviewing"
  | "committing"
  | null;

// Add new settings
interface AutoBuildSettings {
  // Existing...

  // NEW - AI Audits (all default: false except self-review)
  runSecurityAudit: boolean;
  runPerformanceAudit: boolean;
  runCodeQualityAudit: boolean;
  runAccessibilityAudit: boolean;
}

// Add phase labels
PHASE_LABELS = {
  // Existing...
  selfReviewing: "Self-reviewing code",
  securityAudit: "Security scan",
  performanceAudit: "Performance check",
  codeQualityAudit: "Code quality check",
  accessibilityAudit: "Accessibility check",
};
```

### Step 2: Add Self-Review Step
**File:** `src/stores/autoBuildStore.ts`

After `working` phase completes:
1. Set phase to `selfReviewing`
2. Send self-review prompt to Claude (same session)
3. Wait for completion
4. Proceed to subagent audits

```typescript
// In processIssue() after working phase
updateWorker(workerId, { phase: "selfReviewing" });
await executeStreamingWork(issueId, true, SELF_REVIEW_PROMPT, workerId);
```

### Step 3: Implement Subagent Audit Runner
**File:** `src/stores/autoBuildStore.ts`

Add new function to spawn audit subagents:

```typescript
async runSubagentAudits(
  issueId: string,
  filesModified: string[],
  workerId: number
): Promise<AuditResults> {
  const results: AuditResults = {};
  const { settings } = get();

  // Security audit
  if (settings.runSecurityAudit) {
    updateWorker(workerId, { phase: "securityAudit" });
    results.security = await runAuditSubagent("security-auditor", filesModified);
  }

  // Performance audit
  if (settings.runPerformanceAudit) {
    updateWorker(workerId, { phase: "performanceAudit" });
    results.performance = await runAuditSubagent("performance-auditor", filesModified);
  }

  // Code quality audit
  if (settings.runCodeQualityAudit) {
    updateWorker(workerId, { phase: "codeQualityAudit" });
    results.quality = await runAuditSubagent("code-smell-auditor", filesModified);
  }

  // Accessibility audit (only if UI files changed)
  if (settings.runAccessibilityAudit && hasUIFiles(filesModified)) {
    updateWorker(workerId, { phase: "accessibilityAudit" });
    results.accessibility = await runAuditSubagent("accessibility-auditor", filesModified);
  }

  return results;
}
```

### Step 4: Add Rust Subagent Spawner
**File:** `src-tauri/src/auto_build.rs`

Add Tauri command to spawn audit subagents:

```rust
#[tauri::command]
pub async fn auto_build_run_audit(
    project_path: String,
    audit_type: String,  // "security" | "performance" | "quality" | "accessibility"
    files_modified: Vec<String>,
) -> Result<AuditResult, String> {
    // Build prompt for subagent
    let prompt = build_audit_prompt(&audit_type, &files_modified);

    // Spawn claude with subagent type
    let output = Command::new("claude")
        .args(["-p", &prompt, "--permission-mode", "default"])
        .current_dir(&project_path)
        .output()
        .await?;

    // Parse output for issues
    parse_audit_result(&output.stdout)
}
```

### Step 5: Update Pipeline Flow
**File:** `src/stores/autoBuildStore.ts`

Modify `processIssue()` to include new phases:

```typescript
async processIssue(issueId: string, workerId: number) {
  // Phase 1: Working (existing)
  updateWorker(workerId, { phase: "working" });
  const workSuccess = await executeStreamingWork(issueId, false, null, workerId);
  if (!workSuccess) return markBlocked(issueId);

  // Phase 2: Self-Review (NEW)
  updateWorker(workerId, { phase: "selfReviewing" });
  await executeStreamingWork(issueId, true, SELF_REVIEW_PROMPT, workerId);

  // Phase 3: Subagent Audits (NEW)
  const auditResults = await runSubagentAudits(issueId, worker.filesModified, workerId);

  // Handle audit failures with fix loop
  if (hasAuditFailures(auditResults)) {
    const fixed = await runAuditFixLoop(issueId, auditResults, workerId);
    if (!fixed) return markBlocked(issueId);
  }

  // Phase 4: NPM Verification (existing)
  updateWorker(workerId, { phase: "testing" });
  const verification = await runVerification(issueId, worker.filesModified);
  // ... existing verification loop

  // Phase 5: Human Review (existing)
  // ... existing review logic
}
```

### Step 6: Update Settings UI
**File:** `src/components/tools/auto-build/AutoBuildSettingsPopup.tsx`

Add new "AI Audits" section:

```tsx
<Section title="AI Audits">
  <SettingRow
    label="Security Audit"
    description="Scan for OWASP vulnerabilities"
    checked={settings.runSecurityAudit}
    onChange={(v) => updateSettings({ runSecurityAudit: v })}
  />
  <SettingRow
    label="Performance Audit"
    description="Check for memory leaks, anti-patterns"
    checked={settings.runPerformanceAudit}
    onChange={(v) => updateSettings({ runPerformanceAudit: v })}
  />
  <SettingRow
    label="Code Quality Audit"
    description="Detect DRY violations, complexity"
    checked={settings.runCodeQualityAudit}
    onChange={(v) => updateSettings({ runCodeQualityAudit: v })}
  />
  <SettingRow
    label="Accessibility Audit"
    description="WCAG 2.1 compliance (UI files only)"
    checked={settings.runAccessibilityAudit}
    onChange={(v) => updateSettings({ runAccessibilityAudit: v })}
  />
</Section>
```

### Step 7: Update Worker Status Display
**File:** `src/components/tools/auto-build/AutoBuildKanban.tsx`

Add icons for new phases in `getPhaseIcon()`:

```typescript
const PHASE_ICONS = {
  selfReviewing: Eye,
  securityAudit: Shield,
  performanceAudit: Gauge,
  codeQualityAudit: Star,
  accessibilityAudit: Accessibility,
  // ... existing
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/autoBuild.ts` | Add phases, settings, phase labels |
| `src/stores/autoBuildStore.ts` | Self-review step, subagent runner, pipeline flow |
| `src-tauri/src/auto_build.rs` | Subagent spawner command |
| `src/components/tools/auto-build/AutoBuildSettingsPopup.tsx` | AI Audits section |
| `src/components/tools/auto-build/AutoBuildKanban.tsx` | Phase icons, status display |

---

## Default Settings

```typescript
const DEFAULT_SETTINGS: AutoBuildSettings = {
  // Existing
  autoCommit: true,
  runLint: true,
  runTests: true,
  runBuild: true,
  maxRetries: 1,
  requireHumanReview: true,
  ignoreUnrelatedFailures: true,
  maxConcurrentIssues: 3,

  // NEW - Conservative defaults
  runSecurityAudit: false,
  runPerformanceAudit: false,
  runCodeQualityAudit: false,
  runAccessibilityAudit: false,
};
```

Note: Self-review is always ON (not configurable) since it's fast and catches obvious issues.

---

## Benefits

1. **Better Code Quality** - AI self-review + subagent audits catch issues npm can't
2. **Security by Default** - Optional security scanning before merge
3. **Self-Correction** - Claude reviews its own work before verification
4. **Configurable** - Choose which audits to enable based on project needs
5. **Simple UI** - No new columns, just enhanced phases shown in worker status
6. **Faster Feedback** - Issues caught before npm commands run
7. **Thorough** - Subagents provide deep, focused analysis
