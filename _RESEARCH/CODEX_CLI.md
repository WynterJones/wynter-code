# OpenAI Codex CLI - Comprehensive Reference

> **Last Updated:** December 2025
> **Official Docs:** https://developers.openai.com/codex/cli/
> **GitHub:** https://github.com/openai/codex
> **License:** Apache 2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [CLI Commands](#cli-commands)
5. [Global Flags](#global-flags)
6. [Sandbox Modes](#sandbox-modes)
7. [Approval Policies](#approval-policies)
8. [Streaming JSONL Events](#streaming-jsonl-events)
9. [Session Management](#session-management)
10. [Configuration (config.toml)](#configuration-configtoml)
11. [MCP Integration](#mcp-integration)
12. [SDK/Programmatic Usage](#sdkprogrammatic-usage)
13. [wynter-code Implementation Notes](#wynter-code-implementation-notes)

---

## Overview

Codex CLI is OpenAI's agentic coding tool that runs in the terminal. It can:
- Read, modify, and execute code in your repository
- Run shell commands with sandboxing
- Search the web (optional)
- Use MCP tools

**Key Characteristics:**
- Written in Rust (97.3% of codebase)
- OS-level sandboxing via Seatbelt (macOS) and Landlock/seccomp (Linux)
- JSONL streaming output for programmatic use
- Thread-based conversation context

---

## Installation

### Via npm (Recommended)
```bash
npm install -g @openai/codex
```

### Via Homebrew
```bash
brew install --cask codex
```

### Binary Download
Download from GitHub Releases for:
- macOS (Apple Silicon / x86_64)
- Linux (x86_64 / arm64)

### Verify Installation
```bash
codex --version
which codex
```

---

## Authentication

### Option 1: ChatGPT Sign-In (Recommended)
```bash
codex login
```
- Uses existing ChatGPT Plus, Pro, Team, Edu, or Enterprise subscription
- No API key management required
- First launch prompts for auth automatically

### Option 2: API Key
```bash
codex login --with-api-key
# Then paste your API key
```

Or set environment variable:
```bash
export CODEX_API_KEY="sk-..."
```

### Logout
```bash
codex logout
```

---

## CLI Commands

### `codex` (Interactive Mode)
Launch the full-screen terminal UI:
```bash
codex
codex "Fix the bug in auth.py"
codex -i screenshot.png "Implement this design"
```

### `codex exec` (Non-Interactive Mode)
Run without UI, streaming results to stdout:
```bash
codex exec "Explain this codebase"
codex exec --json "List all functions"
codex e "Quick query"  # alias
```

### `codex resume`
Continue previous sessions:
```bash
codex resume           # Opens picker of recent sessions
codex resume --last    # Resumes most recent session
codex resume <id>      # Resumes specific session by ID
```

### `codex login` / `codex logout`
Manage authentication:
```bash
codex login
codex login --with-api-key
codex logout
```

### `codex sandbox`
Test sandboxing:
```bash
codex sandbox "ls -la"
codex sandbox --full-auto "npm install"
```

### `codex mcp`
Manage MCP servers:
```bash
codex mcp list
codex mcp add <name> <command>
codex mcp remove <name>
codex mcp login <name>
codex mcp logout <name>
```

### `codex execpolicy`
Evaluate command allowance rules:
```bash
codex execpolicy evaluate <rule-file> "<command>"
```

### `codex apply`
Apply diffs from Codex Cloud:
```bash
codex apply <task-id>
```

### `codex cloud`
Interact with Codex Cloud:
```bash
codex cloud --env <ENV_ID> "task description"
codex cloud --env <ENV_ID> --attempts 3 "complex task"
```

### `codex completion`
Generate shell completions:
```bash
codex completion bash > /etc/bash_completion.d/codex
codex completion zsh > ~/.zsh/completions/_codex
codex completion fish > ~/.config/fish/completions/codex.fish
```

---

## Global Flags

These flags work with most commands:

| Flag | Short | Type | Description |
|------|-------|------|-------------|
| `--model` | `-m` | string | Override model (e.g., `gpt-5-codex`) |
| `--sandbox` | `-s` | enum | Set sandbox policy |
| `--ask-for-approval` | `-a` | enum | Control approval prompts |
| `--full-auto` | | bool | Shortcut: `--ask-for-approval on-failure` + `workspace-write` |
| `--dangerously-bypass-approvals-and-sandbox` | `--yolo` | bool | Skip all safety checks |
| `--cd` | `-C` | path | Set working directory |
| `--profile` | `-p` | string | Load config profile |
| `--image` | `-i` | path | Attach image(s) to prompt |
| `--search` | | bool | Enable web search |
| `--add-dir` | | path | Grant write access to additional directories |
| `--oss` | | bool | Use local Ollama provider |
| `--config` | `-c` | key=value | Override config values |
| `--enable` | | string | Force-enable feature flag |
| `--disable` | | string | Force-disable feature flag |

### exec-specific Flags

| Flag | Type | Description |
|------|------|-------------|
| `--json` | bool | Output JSONL events |
| `--skip-git-repo-check` | bool | Allow execution outside Git repos |
| `--output-schema` | path | Validate output against JSON Schema |
| `--output-last-message` | `-o` path | Write final message to file |
| `--color` | enum | ANSI color output (always/never/auto) |

---

## Sandbox Modes

Codex uses OS-level sandboxing for security:

### `read-only`
```bash
codex exec --sandbox read-only "analyze code"
```
- Can only read files
- No modifications or command execution
- Safest mode for exploration

### `workspace-write` (Default)
```bash
codex exec --sandbox workspace-write "fix bug"
```
- Read/write within working directory
- No network access by default
- Requires approval for operations outside workspace

### `danger-full-access`
```bash
codex exec --sandbox danger-full-access "deploy app"
```
- Full filesystem and network access
- Use with extreme caution
- Only for trusted operations

### Platform Implementation
- **macOS:** Seatbelt policies
- **Linux:** Landlock + seccomp
- **Windows:** WSL recommended (inherits Linux sandboxing)

---

## Approval Policies

Control when Codex pauses for human approval:

### `never`
```bash
codex exec --ask-for-approval never "task"
```
- No prompts; operates within sandbox constraints only
- Fastest for automation

### `on-failure`
```bash
codex exec --ask-for-approval on-failure "task"
```
- Re-prompts only when a command fails
- Good for automation with error recovery

### `on-request`
```bash
codex exec --ask-for-approval on-request "task"
```
- Asks before operations outside workspace
- Default for interactive mode

### `untrusted`
```bash
codex exec --ask-for-approval untrusted "task"
```
- Auto-approves trusted commands
- Prompts for suspicious operations

### Shortcut: `--full-auto`
```bash
codex exec --full-auto "task"
```
Equivalent to:
```bash
codex exec --ask-for-approval on-failure --sandbox workspace-write "task"
```

### Shortcut: `--yolo` / `--dangerously-bypass-approvals-and-sandbox`
```bash
codex exec --yolo "task"
```
- Bypasses ALL approvals and sandboxing
- Use only in hardened/isolated environments

---

## Streaming JSONL Events

When using `codex exec --json`, events are emitted as newline-delimited JSON:

### Event Types

#### `thread.started`
Emitted when a new thread begins:
```json
{
  "type": "thread.started",
  "thread_id": "thread_abc123",
  "timestamp": "2025-12-28T10:00:00Z"
}
```

#### `turn.started`
Emitted when a new turn begins:
```json
{
  "type": "turn.started",
  "turn_id": "turn_xyz789"
}
```

#### `turn.completed`
Emitted when a turn finishes (includes usage):
```json
{
  "type": "turn.completed",
  "turn_id": "turn_xyz789",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cached_input_tokens": 100
  }
}
```

#### `turn.failed`
Emitted on turn failure:
```json
{
  "type": "turn.failed",
  "error": {
    "code": "rate_limit",
    "message": "Rate limit exceeded"
  }
}
```

#### `item.started`
Emitted when an item (tool call, message) begins:
```json
{
  "type": "item.started",
  "item": {
    "id": "item_001",
    "type": "command_execution",
    "command": "ls -la"
  }
}
```

#### `item.completed`
Emitted when an item finishes:
```json
{
  "type": "item.completed",
  "item": {
    "id": "item_001",
    "type": "command_execution",
    "status": "success",
    "output": "file1.txt\nfile2.txt"
  }
}
```

### Item Types

| Type | Description | Key Fields |
|------|-------------|------------|
| `command_execution` | Shell command | `command`, `output`, `status` |
| `file_read` | Read file | `path`, `content` |
| `file_write` | Write file | `path`, `content` |
| `file_change` | Edit file | `path`, `diff` |
| `agent_message` | Text response | `content`, `text` |
| `message` | User/system message | `content`, `role` |
| `reasoning` | Thinking/reasoning | `content`, `text` |
| `mcp_tool_call` | MCP tool invocation | `tool_name`, `arguments` |
| `web_search` | Web search | `query`, `results` |

### Error Event
```json
{
  "type": "error",
  "message": "Something went wrong",
  "error": "detailed error info"
}
```

---

## Session Management

### Thread IDs
Every session has a `thread_id` that enables:
- Conversation context preservation
- Session resume functionality
- Multi-turn interactions

### Resume Session
```bash
# Interactive picker
codex resume

# Most recent
codex resume --last

# Specific thread
codex resume thread_abc123
```

### Programmatic Resume
```bash
# First prompt - capture thread_id
codex exec --json "Start analysis" | jq -r '.thread_id' > /tmp/tid

# Continue conversation
codex exec --json "resume $(cat /tmp/tid)" "Continue analysis"
```

### Transcript Storage
Conversations persist locally:
- Location: `~/.codex/history/`
- Enables resume functionality
- Configurable via `history.persistence`

---

## Configuration (config.toml)

Location: `~/.codex/config.toml`

### Core Settings

```toml
# Model configuration
model = "gpt-5-codex"
model_provider = "openai"
model_context_window = 128000
model_reasoning_effort = "medium"  # minimal, low, medium, high, xhigh
model_verbosity = "medium"  # low, medium, high

# Approval policy
approval_policy = "on-request"  # never, on-failure, on-request, untrusted

# Sandbox mode
sandbox_mode = "workspace-write"  # read-only, workspace-write, danger-full-access
```

### Sandbox Extensions

```toml
[sandbox_workspace_write]
writable_roots = ["/tmp/build", "~/projects/shared"]
network_access = false
exclude_tmpdir_env_var = false
```

### Shell Environment

```toml
[shell_environment_policy]
inherit = "core"  # all, core, none
exclude = ["SECRET_*", "AWS_*"]
include_only = ["PATH", "HOME", "USER"]

[shell_environment_policy.set]
MY_VAR = "value"
```

### Feature Flags

```toml
[features]
unified_exec = true
shell_snapshot = true
web_search_request = true
view_image_tool = false
```

### MCP Servers

```toml
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@anthropic/mcp-server-filesystem"]

[mcp_servers.github]
command = "npx"
args = ["-y", "@anthropic/mcp-server-github"]
env = { GITHUB_TOKEN = "..." }
```

### Profiles

```toml
[profiles.development]
model = "gpt-5-codex"
sandbox_mode = "workspace-write"

[profiles.production]
model = "gpt-5.1-codex-max"
sandbox_mode = "read-only"
```

Use profiles:
```bash
codex --profile production "analyze security"
```

### Telemetry

```toml
[otel]
enabled = true
endpoint = "http://localhost:4317"
```

---

## MCP Integration

### Configure in config.toml

```toml
[mcp_servers.my_server]
command = "node"
args = ["./my-mcp-server.js"]
env = { API_KEY = "..." }
```

### CLI Management

```bash
# List servers
codex mcp list

# Add server
codex mcp add myserver "npx my-mcp-package"

# Remove server
codex mcp remove myserver

# Auth flows
codex mcp login myserver
codex mcp logout myserver
```

### Streaming HTTP Servers

```toml
[mcp_servers.remote]
type = "sse"
url = "https://api.example.com/mcp"
```

---

## SDK/Programmatic Usage

### TypeScript/JavaScript SDK

```bash
npm install @openai/codex-sdk
```

```typescript
import { Codex } from '@openai/codex-sdk';

const codex = new Codex();
const thread = codex.startThread();

const result = await thread.run("Analyze this codebase");
console.log(result);

// Continue conversation
const followUp = await thread.run("Focus on security issues");
console.log(followUp);

// Resume later
const resumed = codex.resumeThread(thread.id);
await resumed.run("What about performance?");
```

### CLI Automation

```bash
# Capture output
result=$(codex exec --json "task" | jq -r '.result')

# Extract thread_id for resume
thread_id=$(codex exec --json "start" | jq -r '.thread_id')
codex exec "resume $thread_id" "continue"

# Structured output
codex exec --json --output-schema ./schema.json "extract data" | jq '.structured_output'
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CODEX_API_KEY` | API key (exec mode only) |
| `CODEX_MODEL` | Default model |
| `CODEX_SANDBOX` | Default sandbox mode |

---

## wynter-code Implementation Notes

### Current Implementation

Location: `src-tauri/src/codex_process.rs`

#### Process Spawning
```rust
Command::new("codex")
    .args(&["exec", "--json", "--skip-git-repo-check"])
    .arg("--model").arg(model_name)
    .current_dir(&cwd)
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
```

#### Event Mapping

| Codex Event | wynter-code StreamChunk |
|-------------|------------------------|
| `thread.started` | `init` (captures `thread_id`) |
| `turn.started` | `turn_start` |
| `turn.completed` | `usage` (with token counts) |
| `turn.failed` | `error` |
| `item.started` (command_execution) | `tool_start` (tool_name: "Bash") |
| `item.started` (file_read/write) | `tool_start` (tool_name: "Read"/"Write") |
| `item.started` (agent_message) | `text` |
| `item.started` (reasoning) | `thinking` |
| `item.completed` | `tool_result` or `text` |

#### Session Resume
Currently implemented via thread_id storage in `CodexProcessInstance`:
```rust
struct CodexProcessInstance {
    child: Child,
    stdin: Option<ChildStdin>,
    session_id: String,
    thread_id: Option<String>,  // Captured from thread.started
}
```

### Integration Gaps

1. **Permission Mode Toggle**: Need to map PermissionModeToggle values to Codex flags:
   - `manual` -> `--ask-for-approval on-request`
   - `acceptEdits` -> `--full-auto`
   - `bypassPermissions` -> `--yolo`
   - `plan` -> `--sandbox read-only` (no exec)

2. **MCP Permission Server**: Codex doesn't use external permission server like Claude Code

3. **Plan Mode**: Codex doesn't have explicit plan mode - use `--sandbox read-only`

4. **Web Search**: Enable via `--search` flag when user requests

### Recommended Updates

1. Add permission mode flag mapping in `start_codex_session`
2. Add `--search` flag support for web-enabled sessions
3. Consider profile support for different use cases
4. Handle `mcp_tool_call` events for MCP tool display

---

## Reference Links

- **CLI Reference:** https://developers.openai.com/codex/cli/reference/
- **Features:** https://developers.openai.com/codex/cli/features/
- **Security:** https://developers.openai.com/codex/security/
- **Configuration:** https://developers.openai.com/codex/local-config/
- **SDK:** https://developers.openai.com/codex/sdk/
- **Models:** https://developers.openai.com/codex/models/
- **GitHub:** https://github.com/openai/codex
