# Rust Code Audit

**Last Updated:** 2025-12-31
**Files Audited:** 33 Rust source files in `src-tauri/src/`
**Build Status:** Compiles with 1 warning (unused `get_all` method in `process_registry.rs`)

---

## Executive Summary

The codebase has **189 instances of `.unwrap()`** across 20 files and **1 instance of `.expect()`** (in `main.rs:497`). The majority of unwrap calls are on:
1. Mutex locks (acceptable for Tauri state management)
2. Regex compilation (safe - static patterns)
3. SystemTime operations (safe - UNIX_EPOCH is always before now)
4. JSON serialization of known-valid types (safe)

There are **2 unsafe blocks** for macOS-specific Cocoa/Objective-C interop (window level and sharing type).

**No `panic!`, `todo!`, or `unimplemented!` macros found in production code.**

---

## Panic Risks

### High Priority - `.expect()` Usage

| File | Line | Code | Assessment |
|------|------|------|------------|
| `main.rs` | 497 | `.expect("error while running tauri application")` | **Acceptable** - Fatal error at app startup, cannot recover |

### Medium Priority - Mutex Lock Unwraps

**Pattern found across 20 files:** `state.*.lock().unwrap()`

| File | Occurrences | Context |
|------|-------------|---------|
| `file_coordinator.rs` | 25 | Lock management for concurrent auto-build |
| `mobile_api.rs` | 20 | Mobile API server state |
| `mcp_permission_server.rs` | 17 | Permission request handling |
| `live_preview.rs` | 20 | Preview server management |
| `tunnel.rs` | 14 | Cloudflare tunnel management |
| `storybook.rs` | 14 | Storybook server management |
| `claude_process.rs` | 13 | Claude CLI process management |
| `audio_proxy.rs` | 11 | Audio streaming proxy |
| `codex_process.rs` | 8 | Codex CLI process management |
| `api_tester.rs` | 8 | Webhook server management |
| `gemini_process.rs` | 7 | Gemini CLI process management |
| `webcam_window.rs` | 7 | Floating window position |
| `terminal.rs` | 6 | PTY instance management |
| `commands/mod.rs` | 5 | Various command utilities |
| `cost_popup.rs` | 4 | Popup window position |
| `process_registry.rs` | 4 | Child process tracking |
| `domain_tools.rs` | 2 | Regex validation |
| `beads.rs` | 2 | Issue ID regex |
| `github.rs` | 1 | Command output handling |
| `limits_monitor.rs` | 1 | Test code only |

**Assessment:** These are generally safe because:
1. Tauri commands run on the async runtime with proper thread isolation
2. Lock acquisition is brief - no async awaits while holding locks
3. A poisoned mutex indicates a previous panic, which is already fatal

**Recommendation:** Consider `.expect("context: lock poisoned")` for better debugging.

### Low Priority - Safe Unwrap Patterns

These unwraps are safe and do not need changes:

| Pattern | Files | Reason |
|---------|-------|--------|
| `Regex::new(...).unwrap()` | Multiple | Static patterns, validated at dev time |
| `duration_since(UNIX_EPOCH).unwrap()` | Multiple | UNIX_EPOCH is always before current time |
| `serde_json::to_string(...).unwrap()` | Multiple | Serializing known-valid types |
| `Header::from_bytes(...).unwrap()` | `api_tester.rs`, `audio_proxy.rs`, `live_preview.rs` | Static ASCII header names |
| `listener.local_addr().unwrap()` | Multiple | Already bound successfully |

---

## Error Handling Assessment

### Proper Error Propagation

The codebase demonstrates good error handling patterns:

| File | Pattern | Assessment |
|------|---------|------------|
| `terminal.rs` | Input validation with `validate_shell_path()`, `validate_cwd()` | Excellent |
| `tunnel.rs` | Port validation with `validate_tunnel_port()` | Good |
| `beads.rs` | Input sanitization with `sanitize_text()`, validation functions | Excellent |
| `commands/mod.rs` | Path validation with `validate_file_path()` | Excellent |
| `claude_process.rs` | Model and session ID validation | Good |

### Silent Error Handling

The pattern `let _ = window.emit(...)` is used intentionally:
- Window may close before emit completes
- Non-critical status updates that shouldn't fail the operation

**Files using this pattern:** `tunnel.rs`, `live_preview.rs`, `storybook.rs`, `claude_process.rs`, `file_coordinator.rs`, `mcp_permission_server.rs`

---

## Unsafe Code

### All Unsafe Blocks (2 total)

| File | Lines | Purpose | Justification |
|------|-------|---------|---------------|
| `launcher.rs` | 99-102 | macOS: Set window level to floating | **Required** - Objective-C message passing via `objc` crate |
| `cost_popup.rs` | 76-78 | macOS: Set window sharing type to None | **Required** - Hide window from screen recording |

**Code Review:**

```rust
// launcher.rs:99-102
if let Ok(ns_window) = window.ns_window() {
    let ns_window = ns_window as id;
    unsafe {
        let _: () = msg_send![ns_window, setLevel: 3i32];
    }
}
```

```rust
// cost_popup.rs:76-78
if let Ok(ns_window) = window.ns_window() {
    let ns_window = ns_window as id;
    unsafe {
        let _: () = msg_send![ns_window, setSharingType: NS_WINDOW_SHARING_NONE];
    }
}
```

**Assessment:** Both blocks are properly guarded with `#[cfg(target_os = "macos")]` and `#[allow(deprecated)]`. The unsafe operations are minimal and follow standard `objc` crate patterns. No memory safety issues identified.

---

## Resource Cleanup

### Process Management

| File | Mechanism | Assessment |
|------|-----------|------------|
| `process_registry.rs` | Centralized PID tracking for child processes | Excellent - prevents arbitrary process termination |
| `tunnel.rs` | Processes registered with `ProcessRegistry`, cleaned up on stop | Good |
| `claude_process.rs` | `drop(instance.stdin.take())` for proper stdin closure | Good |
| `codex_process.rs` | `drop(instance.stdin.take())` for proper stdin closure | Good |
| `terminal.rs` | PTY cleanup on child process exit | Good |

### Server Shutdown

| File | Mechanism | Assessment |
|------|-----------|------------|
| `file_coordinator.rs` | Shutdown signal via `Arc<RwLock<bool>>`, lock cleanup | Good |
| `mcp_permission_server.rs` | Shutdown signal, cancels pending requests | Good |
| `live_preview.rs` | Server removed from manager on stop | Good |
| `storybook.rs` | Process kill and removal on stop | Good |

---

## Security Patterns

### Input Validation

The codebase has strong input validation:

| File | Function | Validates |
|------|----------|-----------|
| `terminal.rs` | `validate_shell_path()` | Absolute paths, no injection |
| `terminal.rs` | `validate_cwd()` | Directory existence |
| `tunnel.rs` | `validate_tunnel_port()` | Non-privileged ports only |
| `beads.rs` | `validate_issue_id()`, `validate_status()`, `validate_issue_type()`, `validate_priority()` | All CLI inputs |
| `commands/mod.rs` | `validate_file_path()`, `validate_npm_package_name()`, `validate_session_id()` | Path traversal, npm names |
| `claude_process.rs` | `validate_model_name()`, `validate_session_id()` | CLI arguments |

### Blocked Paths

`commands/mod.rs` defines comprehensive path blocking:
- System directories (`/etc`, `/var`, `/System`, etc.)
- Sensitive files (SSH keys, credentials, `.env.production`)
- Home directory enforcement for file access

---

## Async/Await Patterns

### Threading Model

The codebase correctly separates:
- **Tauri commands**: Async functions on Tokio runtime
- **Long-running operations**: `std::thread::spawn` for servers, process monitoring
- **Mutex access**: Brief, synchronous, no awaits while holding locks

### Potential Blocking

| File | Pattern | Assessment |
|------|---------|------------|
| `mcp_permission_server.rs:230` | `rx.blocking_recv()` in spawned thread | Acceptable - dedicated thread |
| `storybook.rs:294` | Polling loop with sleep | Acceptable - spawned thread |

---

## Compiler Warnings

### Current Warning
```
warning: method `get_all` is never used
  --> src/process_registry.rs:39:12
```

**Recommendation:** Either use the method or add `#[allow(dead_code)]` with a comment explaining it's for debugging.

---

## Recommendations

### High Priority
None - no critical issues found.

### Medium Priority
1. **Document unsafe blocks** - Add safety comments explaining why the unsafe code is sound
2. **Use `.expect()` over `.unwrap()` for Mutex locks** - Better debugging in production
3. **Remove or mark unused `get_all` method** in `process_registry.rs`

### Low Priority
4. **Consider structured error types** - Replace `String` errors with enums for better frontend handling
5. **Add debug logging for emit failures** - Helps diagnose window lifecycle issues
6. **Consider `once_cell` or `lazy_static` for compiled Regexes** - Avoid repeated compilation

---

## Files Reviewed

### Core Modules
1. `main.rs` - Application entry point and Tauri setup
2. `commands/mod.rs` - Main command handlers (file operations, npm, git)
3. `commands/search.rs` - Search functionality

### Process Management
4. `process_registry.rs` - Child process tracking
5. `claude_process.rs` - Claude CLI process management
6. `codex_process.rs` - Codex CLI process management
7. `gemini_process.rs` - Gemini CLI process management
8. `terminal.rs` - PTY management

### Servers
9. `live_preview.rs` - Dev server preview
10. `storybook.rs` - Storybook server management
11. `api_tester.rs` - HTTP client and webhook server
12. `audio_proxy.rs` - Audio streaming proxy
13. `mobile_api.rs` - Mobile companion API
14. `mcp_permission_server.rs` - MCP permission handling
15. `file_coordinator.rs` - Concurrent file lock coordination

### Network
16. `tunnel.rs` - Cloudflare tunnel management

### Windows
17. `cost_popup.rs` - Cost tracking popup
18. `webcam_window.rs` - Floating webcam window
19. `launcher.rs` - App launcher window

### Utilities
20. `beads.rs` - Issue tracking CLI wrapper
21. `domain_tools.rs` - DNS/WHOIS lookups
22. `github.rs` - GitHub CLI integration
23. `homebrew.rs` - Homebrew management
24. `limits_monitor.rs` - Usage monitoring
25. `netlify_backup.rs` - Netlify API
26. `overwatch.rs` - Service monitoring
27. `path_utils.rs` - Path utilities
28. `vibrancy.rs` - Window vibrancy effects
29. `watcher.rs` - File watcher
30. `camera_permission.rs` - Camera permissions
31. `database_viewer.rs` - Database tools
32. `auto_build.rs` - Auto-build features
33. `system_cleaner.rs` - System cleanup utilities