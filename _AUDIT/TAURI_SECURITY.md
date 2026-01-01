# Tauri Security Audit

**Last Updated:** 2025-12-31
**Auditor:** Tauri Security Auditor Agent
**Status:** PASS (with recommendations)

---

## Executive Summary

The wynter-code Tauri application demonstrates **strong security practices** overall. The codebase implements comprehensive input validation, command allowlisting, and path sanitization. However, there are a few areas that warrant attention.

### Overall Security Posture: **B+ (Good)**

| Category | Status | Notes |
|----------|--------|-------|
| IPC Command Security | PASS | Extensive validation on all commands |
| Capability Configuration | PASS | Properly scoped permissions per window |
| Shell Command Security | PASS | Input validation and allowlisting in place |
| File System Access | PASS | Path validation blocks sensitive directories |
| CSP Configuration | WARNING | Uses unsafe-inline/unsafe-eval |
| Asset Protocol | PASS | Restricted to $HOME and $RESOURCE |
| Process Management | PASS | Registry validates child processes |

---

## Critical Issues

### None Found

The codebase does not have any critical security vulnerabilities that would allow immediate exploitation.

---

## Warnings

### 1. CSP Uses `unsafe-inline` and `unsafe-eval` (Medium Risk)

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/tauri.conf.json` (line 37)

```json
"csp": "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; ..."
```

**Risk:** While necessary for some frameworks (React, etc.), `unsafe-inline` and `unsafe-eval` weaken XSS protections.

**Recommendation:** Consider using nonces or hashes for inline scripts if possible. Document why these are required.

---

### 2. `kill_process_on_port` Lacks PID Validation (Medium Risk)

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/live_preview.rs` (lines 223-246)

```rust
pub async fn kill_process_on_port(port: u16) -> Result<(), String> {
    let output = Command::new("lsof")
        .args(["-t", "-i", &format!(":{}", port)])
        .output()
        // ...
    for pid in pids {
        if !pid.is_empty() {
            let _ = Command::new("kill")
                .args(["-9", pid])
                .output();
        }
    }
}
```

**Risk:** Unlike `kill_process` which validates PIDs against the process registry, this function kills any process on a port without verifying it belongs to the application.

**Recommendation:** Add validation that the process being killed is owned by the current user or was spawned by the application.

---

### 3. Hardcoded JWT Secret (Medium Risk)

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/mobile_api.rs` (line 33)

```rust
const JWT_SECRET: &str = "wynter-code-mobile-api-secret-key-2024";
```

**Risk:** Hardcoded secrets can be extracted from the binary and used to forge tokens.

**Recommendation:** Generate secrets at runtime or use secure storage (e.g., keychain) for production deployments.

---

### 4. Broad Asset Protocol Scope (Low Risk)

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/tauri.conf.json` (lines 39-44)

```json
"assetProtocol": {
    "enable": true,
    "scope": [
        "$HOME/**",
        "$RESOURCE/**"
    ]
}
```

**Risk:** Allows loading any file from the user's home directory via `asset://` protocol.

**Recommendation:** This appears intentional for a code editor. Document the security rationale.

---

## Positive Security Findings

### 1. Comprehensive Input Validation

The codebase implements thorough validation for:

- **Session IDs:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/mod.rs` (lines 15-28)
  - Validates format (alphanumeric with hyphens)
  - Limits length (1-100 characters)

- **File Paths:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/mod.rs` (lines 76-166)
  - Blocks sensitive directories (.ssh, .gnupg, .aws, /etc, /var, etc.)
  - Blocks sensitive file patterns (id_rsa, credentials, .env.local, etc.)
  - Canonicalizes paths to prevent traversal

- **NPM Package Names:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/mod.rs` (lines 170-233)
  - Validates against npm naming rules
  - Blocks shell injection characters

- **Git Arguments:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/mod.rs` (lines 1258-1443)
  - Allowlists git subcommands
  - Blocks dangerous patterns (command substitution, redirection)
  - Blocks dangerous options (--exec, --upload-pack)
  - Blocks force push without --force-with-lease

---

### 2. Domain/URL Validation

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/domain_tools.rs` (lines 7-78)

All external tool commands validate inputs:
- Domain names (regex + forbidden characters)
- DNS record types (allowlist)
- URLs (protocol check + host validation)

---

### 3. Shell Path Validation for Terminal

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/terminal.rs` (lines 10-37)

The PTY terminal validates shell paths:
- Must be absolute path
- No shell metacharacters
- File must exist

---

### 4. Process Registry for Kill Validation

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/process_registry.rs`

The application maintains a registry of spawned child processes. The `kill_process` command verifies PIDs against this registry before terminating.

---

### 5. Beads Issue Tracker Validation

**File:** `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/beads.rs` (lines 10-84)

All issue tracker inputs are validated:
- Issue IDs (alphanumeric, hyphens, dots only)
- Status (allowlist)
- Issue type (allowlist)
- Priority (0-4 range)
- Text inputs are sanitized

---

### 6. Capability Configuration

The application properly separates capabilities by window:

| Window | Capabilities |
|--------|-------------|
| **main** | Full access (fs, shell, dialog, etc.) |
| **launcher** | Minimal (window management, global shortcuts) |
| **color-picker** | Minimal (events, window management) |

**Files:**
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/default.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/launcher.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/color-picker.json`

---

## Command Security Matrix

| Command | Validation | Shell Exec | Risk Level |
|---------|------------|------------|------------|
| `run_git` | Subcommand allowlist, arg validation | Yes | Low |
| `run_claude` | Session ID validation | Yes | Low |
| `run_claude_streaming` | Session ID validation | Yes | Low |
| `npm_install` | Package name validation | Yes | Low |
| `npm_uninstall` | Package name validation | Yes | Low |
| `npm_search` | None (query only) | Yes | Low |
| `whois_lookup` | Domain validation | Yes | Low |
| `dns_lookup` | Domain + record type validation | Yes | Low |
| `ssl_check` | Domain validation | Yes | Low |
| `http_*` | URL validation | Yes | Low |
| `kill_process` | Registry + PID check | Yes | Low |
| `kill_process_on_port` | Port range only | Yes | **Medium** |
| `create_pty` | Shell path + cwd validation | Yes | Low |
| `read_file_content` | Path validation | No | Low |
| `write_file_content` | Path validation | No | Low |

---

## Recommendations

### Priority 1 (Should Fix)

1. **Add process validation to `kill_process_on_port`**
   - Verify the process is owned by the current user
   - Or restrict to ports >= 1024 (non-privileged)

2. **Move JWT secret to secure storage**
   - Use keychain on macOS
   - Generate at first run, not compile time

### Priority 2 (Consider)

3. **Document CSP requirements**
   - Add comment explaining why unsafe-inline/eval are needed
   - Consider if any can be removed

4. **Add rate limiting to mobile API**
   - Prevent brute-force authentication attempts

### Priority 3 (Nice to Have)

5. **Add security headers to mobile API**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY

6. **Consider reducing asset protocol scope**
   - If only project files are needed, scope to project directories

---

## Files Reviewed

- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/tauri.conf.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/default.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/launcher.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/capabilities/color-picker.json`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/mod.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/commands/search.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/terminal.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/beads.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/domain_tools.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/process_registry.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/live_preview.rs`
- `/Users/wynterjones/Work/SYSTEM/wynter-code/src-tauri/src/mobile_api.rs`

---

## Changelog

| Date | Changes |
|------|---------|
| 2025-12-31 | Initial comprehensive audit |
