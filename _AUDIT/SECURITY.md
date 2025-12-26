# Security Audit

> Security posture and vulnerability tracking (OWASP Top 10)

**Last Updated:** 2025-12-26
**Score:** 6.5/10
**Status:** Full Security Audit Complete (Tauri + Frontend)

---

## How to get 10/10

- Enable CSP (Content Security Policy) to prevent XSS attacks
- Restrict asset protocol scope from `**` to specific directories
- Add input validation for all shell command parameters
- Implement path traversal protections on all file operations
- Add rate limiting on command execution
- Audit all IPC commands for least-privilege access

---

## Tauri Security Audit

### Critical Issues

| Issue | File | Description | Severity |
|-------|------|-------------|----------|
| CSP Disabled | `tauri.conf.json:37` | `csp: null` allows unrestricted script execution. XSS vulnerabilities could execute arbitrary code. | CRITICAL |
| Asset Protocol Wildcard | `tauri.conf.json:40` | `scope: ["**"]` allows reading ANY file on the system via asset protocol | CRITICAL |
| Shell Execute Any Args | `capabilities/default.json:34-40` | `claude` and `git` commands allow ANY arguments (`args: true`) | HIGH |

### High Severity Issues

| Issue | Location | Description |
|-------|----------|-------------|
| Unrestricted Domain Lookups | `domain_tools.rs` | `whois`, `dig`, `curl`, `openssl` executed with user input passed directly to shell |
| Process Kill Any PID | `commands/mod.rs:1859` | `kill_process(pid)` can terminate ANY process on the system |
| Cloudflared Spawn | `tunnel.rs:118` | Spawns cloudflared with user-controlled port, no validation |
| Terminal Shell Spawn | `terminal.rs:67-77` | Creates PTY with user's shell, allows arbitrary command execution |
| Claude CLI Arbitrary Prompts | `claude_process.rs:100-111` | Claude CLI spawned with user prompts - relies on Claude's own safety |

### Medium Severity Issues

| Issue | Location | Description |
|-------|----------|-------------|
| File Operations No Sandbox | Multiple | `read_file_content`, `write_file_content` operate on any path |
| npm Commands | `commands/mod.rs:341-476` | npm install/uninstall/search with package names from user input |
| Git Command Injection | `commands/mod.rs:901-906` | Git runs with arbitrary args from frontend |
| Replace in Files | `search.rs:318-376` | Has project path validation but allows regex replacement |
| beads CLI | `beads.rs` | Runs `bd` command with user-controlled arguments |

### Low Severity / Informational

| Issue | Location | Description |
|-------|----------|-------------|
| macOSPrivateApi Enabled | `tauri.conf.json:14` | Required for traffic light positioning, acceptable risk |
| withGlobalTauri | `tauri.conf.json:13` | Exposes Tauri APIs to window, required for IPC |
| Safe Mode Default | `claude_process.rs:62-65` | Good: Downgrades bypassPermissions to acceptEdits |

---

## Capability Analysis

### default.json (Main Window)

**Permissions Granted:**
- `fs:default`, `fs:allow-read-*` - Full read access to home directory (via scope-home-recursive)
- `shell:allow-spawn`, `shell:allow-execute` - Can spawn/execute any scoped command
- `sql:*` - Full database access
- `dialog:allow-open` - File picker dialogs

**Shell Scope:**
- `claude` command with ANY arguments
- `git` command with ANY arguments

**Risk:** The `args: true` setting means no argument validation - any git or claude subcommand can be invoked.

### color-picker.json / color-magnifier.json

**Analysis:** Appropriately minimal permissions - only core events and window management. Good example of least-privilege.

---

## IPC Command Risk Assessment

### High Risk Commands (Shell Execution)

| Command | Risk | Mitigation |
|---------|------|------------|
| `run_git` | Arbitrary git commands | Restrict to specific subcommands |
| `run_claude` | Arbitrary prompts to AI | Trust in Claude CLI safety + safe mode |
| `run_claude_streaming` | Same as above | Same |
| `kill_process` | System-wide process termination | Limit to child processes only |
| `whois_lookup` | DNS injection possible | Validate domain format |
| `dns_lookup` | DNS injection possible | Validate domain format |
| `ssl_check` | Shell metacharacter injection | Validate domain format |
| `http_*_request` | SSRF potential | Validate URL format |
| `npm_install` | Supply chain attack vector | Package name validation |
| `create_pty` | Full shell access | Intended behavior, document risk |
| `start_tunnel` | External network exposure | Inform user of risks |

### Medium Risk Commands (File System)

| Command | Risk | Mitigation |
|---------|------|------------|
| `get_file_tree` | Directory enumeration | Limit to project scope |
| `read_file_content` | Arbitrary file read | Limit to project scope |
| `write_file_content` | Arbitrary file write | Limit to project scope |
| `delete_to_trash` | File deletion | Limit to project scope |
| `replace_in_files` | Bulk file modification | Has project path check - GOOD |

---

## Positive Security Measures Found

1. **Safe Mode in Claude Process**: Downgrades `bypassPermissions` to `acceptEdits` to prevent destructive operations
2. **Project Path Validation in replace_in_files**: Checks if target files are within project directory
3. **Binary File Detection**: `search.rs` skips binary files to prevent corruption
4. **Trash Instead of Delete**: Uses system trash for safe file deletion
5. **Move Item Self-Check**: Prevents moving folder into itself
6. **Capability Separation**: Color picker windows have minimal permissions
7. **Updater with Pubkey**: Updates verified with public key signature

---

## Constraints

| Constraint | Reason | Impact |
|------------|--------|--------|
| CSP disabled | May be required for dynamic content/eval in IDE features | XSS risk accepted |
| Wide file access | IDE needs to read/write arbitrary project files | Path traversal risk |
| Shell access | Core functionality requires terminal and CLI tools | Command injection risk |
| Global Tauri | Required for IPC from webview | API exposure |

---

## Recommendations

### Immediate (Critical)

1. **Enable CSP**: Add restrictive CSP to prevent XSS
   ```json
   "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
   ```

2. **Restrict Asset Protocol Scope**: Change from `**` to specific allowed directories
   ```json
   "scope": ["$RESOURCE/**", "$APP/**"]
   ```

3. **Validate Shell Arguments**: Add allowlists for git subcommands
   - Only allow: `status`, `add`, `commit`, `push`, `pull`, `diff`, `log`, `branch`, `checkout`, `stash`, `fetch`

### Short-term (High)

4. **Input Sanitization for Domain Tools**: Validate domain/URL format before passing to shell
5. **Restrict kill_process**: Only allow killing child processes spawned by the app
6. **Add Path Validation**: All file operations should validate paths are within project directory

### Long-term (Medium)

7. **Implement Command Audit Logging**: Log all shell command executions
8. **Add Rate Limiting**: Prevent abuse of shell command endpoints
9. **Sandboxed File Access**: Consider restricting fs:scope to current project only

---

## Open Items

| Priority | Item | Owner | Status |
|----------|------|-------|--------|
| P0 | Enable CSP in tauri.conf.json | - | Open |
| P0 | Restrict asset protocol scope | - | Open |
| P1 | Add git subcommand allowlist | - | Open |
| P1 | Validate domain tool inputs | - | Open |
| P2 | Restrict kill_process to child PIDs | - | Open |
| P2 | Add file operation path validation | - | Open |

---

---

## Frontend Security Audit (OWASP Top 10)

### XSS Vectors - dangerouslySetInnerHTML Usage

| File | Line | Context | Risk | Status |
|------|------|---------|------|--------|
| `MatchLine.tsx` | 95, 126 | Code search highlighting | LOW | HTML escaped before insertion |
| `DiffViewer.tsx` | 298 | Git diff display | LOW | Uses highlight.js output |
| `DiffPopup.tsx` | 354 | Git diff modal | LOW | Uses highlight.js output |
| `BookmarkIcon.tsx` | 432 | Simple Icons SVG rendering | MEDIUM | SVG from npm package - trusted source |
| `HtmlEntityTool.tsx` | 57 | HTML entity decoder | MEDIUM | Uses innerHTML for decoding |
| `StringEscapeTool.tsx` | 39 | String unescape tool | MEDIUM | Uses innerHTML for decoding |

**Assessment:** Most dangerouslySetInnerHTML uses are properly sanitized. The `MatchLine.tsx` component correctly escapes HTML entities before insertion. Highlight.js is generally safe but depends on the library not having XSS vulnerabilities.

### Injection Risks

| Type | Location | Risk Level | Notes |
|------|----------|------------|-------|
| No eval() | Codebase-wide | PASS | No dynamic code execution found |
| No new Function() | Codebase-wide | PASS | No function constructors |
| URL Validation | `AddBookmarkModal.tsx:55-58` | PASS | Uses new URL() for validation |

### Sensitive Data Handling

| Data Type | Storage | Risk | Notes |
|-----------|---------|------|-------|
| Netlify API Token | Zustand store (memory) | LOW | Not persisted in localStorage |
| Database Passwords | Connection config | LOW | In-memory only |
| Backup Encryption | `encryption.ts` | PASS | AES-256-GCM with PBKDF2 (100k iterations) |

### Random Number Generation

| Use Case | Method | Security |
|----------|--------|----------|
| UUIDs | `crypto.randomUUID()` | SECURE |
| Passwords | `crypto.getRandomValues()` | SECURE |
| Encryption IV/Salt | `crypto.getRandomValues()` | SECURE |
| Panel IDs | `Math.random()` | ACCEPTABLE (non-security) |
| Game animations | `Math.random()` | ACCEPTABLE (non-security) |

### External URL Handling

| Pattern | Locations | Risk |
|---------|-----------|------|
| `shell.open(url)` | 15+ components | MEDIUM - No URL validation |
| `window.open(url)` | 10+ components | MEDIUM - No origin validation |
| `fetch(url)` | API tools, bookmarks | MEDIUM - Potential SSRF |

### iframe Security

| Location | Sandbox Attributes | Status |
|----------|-------------------|--------|
| `StorybookViewerPopup.tsx:323` | `allow-scripts allow-same-origin allow-forms allow-popups allow-modals` | GOOD |
| `BrowserPreviewPanel.tsx:168` | `allow-same-origin allow-scripts allow-popups allow-forms` | GOOD |

---

## OWASP Top 10 Summary

| Category | Status | Notes |
|----------|--------|-------|
| A01 Broken Access Control | N/A | Desktop app with local user context |
| A02 Cryptographic Failures | PASS | AES-256-GCM, PBKDF2, crypto.getRandomValues() |
| A03 Injection | MEDIUM | dangerouslySetInnerHTML mostly sanitized; shell command risks |
| A04 Insecure Design | MEDIUM | CSP disabled, broad shell permissions |
| A05 Security Misconfiguration | HIGH | CSP null, asset scope wildcard |
| A06 Vulnerable Components | REVIEW | Run npm audit regularly |
| A07 Auth Failures | N/A | No authentication system |
| A08 Data Integrity Failures | PASS | Signed updates, checksum verification |
| A09 Logging Failures | N/A | Desktop app - user has full access |
| A10 SSRF | MEDIUM | Outbound fetch without URL validation |

---

## Positive Security Findings

| Finding | Location | Notes |
|---------|----------|-------|
| Strong Encryption | `/src/services/encryption.ts` | AES-256-GCM, PBKDF2 100k iterations, proper salt/IV |
| Secure Random | Most ID generation | crypto.randomUUID() used for important IDs |
| HTML Escaping | `MatchLine.tsx:70-76` | Proper escaping before dangerouslySetInnerHTML |
| Input Validation | `AddBookmarkModal.tsx` | URL validation with new URL() |
| iframe Sandboxing | Multiple | Proper sandbox attributes on all iframes |
| CORS Awareness | Multiple services | Using Tauri backend to proxy API calls |
| No eval/Function | Codebase-wide | No dynamic code execution |
| Signed Updates | `tauri.conf.json:51-56` | Updates verified with public key |
| Safe Mode Default | `claude_process.rs` | Downgrades bypassPermissions to acceptEdits |

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-22 | Initial security audit setup via Farmwork CLI |
| 2025-12-26 | Complete Tauri security audit: IPC, capabilities, shell commands |
| 2025-12-26 | OWASP Top 10 frontend audit: XSS, injection, data exposure, SSRF |
