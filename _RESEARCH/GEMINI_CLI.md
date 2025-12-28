# Google Gemini CLI - Comprehensive Reference

> **Last Updated:** December 2025
> **Official Docs:** https://geminicli.com/docs/
> **GitHub:** https://github.com/google-gemini/gemini-cli
> **License:** Apache 2.0

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [CLI Commands](#cli-commands)
5. [Headless Mode (-p)](#headless-mode--p)
6. [Output Formats](#output-formats)
7. [Permission Model](#permission-model)
8. [Stream-JSON Events](#stream-json-events)
9. [Session Management](#session-management)
10. [Configuration (settings.json)](#configuration-settingsjson)
11. [MCP Integration](#mcp-integration)
12. [Built-in Tools](#built-in-tools)
13. [wynter-code Implementation Notes](#wynter-code-implementation-notes)

---

## Overview

Gemini CLI is Google's open-source terminal application providing direct access to Gemini AI. Key features:
- Lightweight, direct access to Gemini models
- 1M token context window (Gemini 2.5 Pro)
- Built-in Google Search grounding
- MCP (Model Context Protocol) support
- Terminal-first design

**Key Characteristics:**
- Written primarily in TypeScript
- Open source under Apache 2.0
- Free tier with Google account (60 req/min, 1000 req/day)
- Headless mode for automation

---

## Installation

### Via npm (Recommended)
```bash
npm install -g @google/gemini-cli
```

### Via Homebrew
```bash
brew install gemini-cli
```

### Via npx (No Install)
```bash
npx https://github.com/google-gemini/gemini-cli
```

### Prerequisites
- Node.js 20+
- macOS, Linux, or Windows

### Release Channels

| Channel | Tag | Description |
|---------|-----|-------------|
| Stable | `@latest` | Weekly, production-ready |
| Preview | `@preview` | Weekly, less vetted |
| Nightly | `@nightly` | Daily, experimental |

### Verify Installation
```bash
gemini --version
which gemini
```

---

## Authentication

### Option 1: Google Login (Recommended)
```bash
gemini
# First launch prompts for Google sign-in
```

**Free Tier Limits:**
- 60 requests/minute
- 1,000 requests/day
- Access to Gemini 2.5 Pro (1M context)

### Option 2: Gemini API Key
```bash
# Get key from https://aistudio.google.com/apikey
export GOOGLE_API_KEY="AIza..."
```

Or configure:
```bash
gemini config set api_key AIza...
```

**API Key Limits:**
- 100 requests/day (free tier)
- Model selection flexibility

### Option 3: Vertex AI (Enterprise)
```bash
# Configure Google Cloud project
gcloud auth application-default login
export GOOGLE_CLOUD_PROJECT="my-project"
```

Benefits:
- Enterprise features
- Higher rate limits
- Google Cloud billing

---

## CLI Commands

### `gemini` (Interactive Mode)
Launch the terminal UI:
```bash
gemini
gemini "Explain this codebase"
```

### `gemini -p` (Headless Mode)
Run without UI:
```bash
gemini -p "Your prompt"
gemini --prompt "Your prompt"
```

### Common Options

| Flag | Short | Description |
|------|-------|-------------|
| `--prompt` | `-p` | Run in headless mode |
| `--model` | `-m` | Specify model |
| `--output-format` | | Output type: text, json, stream-json |
| `--debug` | `-d` | Enable debug logging |
| `--yolo` | `-y` | Auto-approve all actions |
| `--include-directories` | | Add directories to context |

### Examples

```bash
# Simple query
gemini -p "What does this code do?"

# Specify model
gemini -p "Query" -m gemini-2.5-flash

# Include additional directories
gemini --include-directories ../lib,../docs "Analyze the codebase"

# Enable debug output
gemini -p "Query" --debug
```

---

## Headless Mode (-p)

Headless mode enables programmatic/scripted operation:

```bash
gemini -p "Your prompt" [options]
```

### Key Flags

| Flag | Description |
|------|-------------|
| `-p`, `--prompt` | Enable headless mode |
| `--output-format` | Output type: `text`, `json`, `stream-json` |
| `-m`, `--model` | Specify model |
| `--yolo`, `-y` | Auto-approve all actions |
| `-d`, `--debug` | Enable debug logging |

### Examples

```bash
# Basic headless
gemini -p "Explain the architecture"

# With JSON output
gemini -p "List functions" --output-format json

# Streaming events
gemini -p "Analyze code" --output-format stream-json

# Auto-approve all actions
gemini -p "Refactor code" --yolo

# Pipe input
cat file.py | gemini -p "Review this code"

# Redirect output
gemini -p "Generate docs" > output.txt

# Extract with jq
gemini -p "Query" --output-format json | jq '.response'
```

---

## Output Formats

### Text (Default)
```bash
gemini -p "Explain this code"
```
Plain text output, human-readable.

### JSON
```bash
gemini -p "Query" --output-format json
```

Response structure:
```json
{
  "response": "The analysis shows...",
  "session_id": "session_xyz",
  "stats": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "model": "gemini-2.5-pro"
  }
}
```

### Stream-JSON
```bash
gemini -p "Query" --output-format stream-json
```

Emits newline-delimited JSON (NDJSON) events in real-time.

**Note:** Stream-JSON was added in September 2025 (Issue #8203). Earlier versions may not support this format.

---

## Permission Model

Gemini CLI has a simpler permission model than Codex/Claude:

### Default Behavior
- Asks permission for potentially destructive actions
- File reads are generally allowed
- Shell commands may prompt for approval

### `--yolo` / `-y` Flag
Auto-approve ALL actions:
```bash
gemini -p "Refactor the entire codebase" --yolo
```

**Warning:** Use with caution. No sandbox protection like Codex.

### Comparison with Other CLIs

| Feature | Gemini | Claude | Codex |
|---------|--------|--------|-------|
| Auto-approve flag | `--yolo` | `--dangerously-skip-permissions` | `--yolo` |
| Sandbox modes | No | Container recommended | 3 levels |
| Fine-grained permissions | No | `--allowedTools` | `--ask-for-approval` |
| Default | Ask | Ask | Ask |

---

## Stream-JSON Events

When using `--output-format stream-json`, events are emitted as NDJSON:

### Event Types

#### `init`
Session start:
```json
{
  "type": "init",
  "session_id": "session_abc123",
  "model": "gemini-2.5-pro"
}
```

#### `message`
User/assistant messages:
```json
{
  "type": "message",
  "role": "user",
  "content": "Analyze this code"
}
```

```json
{
  "type": "message",
  "role": "assistant",
  "content": "Here's my analysis..."
}
```

#### `tool_use`
Tool invocation:
```json
{
  "type": "tool_use",
  "tool_id": "tool_001",
  "tool_name": "file_read",
  "arguments": {
    "path": "/path/to/file.ts"
  }
}
```

#### `tool_result`
Tool completion:
```json
{
  "type": "tool_result",
  "tool_id": "tool_001",
  "content": "file contents...",
  "success": true
}
```

#### `error`
Error event:
```json
{
  "type": "error",
  "message": "Something went wrong"
}
```

#### `result`
Final result with stats:
```json
{
  "type": "result",
  "response": "Complete response...",
  "stats": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "model": "gemini-2.5-pro"
  }
}
```

---

## Session Management

### Current Limitations
**Session resume is NOT documented for Gemini CLI** (as of December 2025).

Unlike Codex and Claude Code:
- No `--resume` flag
- No documented session ID persistence
- Each invocation is stateless

### Workarounds

1. **Context via Files**: Save conversation to file, re-include:
```bash
gemini -p "Previous context: $(cat context.md). Continue analysis."
```

2. **Include Previous Output**:
```bash
previous=$(gemini -p "Start analysis" --output-format json)
gemini -p "Continue from: $previous"
```

### Planned Features
Check GitHub issues for session management feature requests:
- https://github.com/google-gemini/gemini-cli/issues

---

## Configuration (settings.json)

### File Location
`~/.gemini/settings.json`

### Common Settings

```json
{
  "model": "gemini-2.5-pro",
  "api_key": "AIza...",
  "mcp": {
    "servers": {}
  },
  "telemetry": {
    "enabled": true
  }
}
```

### Model Configuration

```json
{
  "model": "gemini-2.5-flash",
  "max_tokens": 8192,
  "temperature": 0.7
}
```

### Available Models

| Model | Description |
|-------|-------------|
| `gemini-2.5-pro` | Most capable, 1M context |
| `gemini-2.5-flash` | Fast, cost-effective |
| `gemini-2.0-pro` | Previous generation |
| `gemini-2.0-flash` | Previous generation, fast |

### Execution Policies

```json
{
  "execution_policies": {
    "/path/to/trusted-project": {
      "auto_approve": true
    },
    "/path/to/untrusted": {
      "auto_approve": false,
      "allowed_commands": ["ls", "cat", "npm test"]
    }
  }
}
```

---

## MCP Integration

### Configure in settings.json

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-filesystem"]
      },
      "github": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-github"],
        "env": {
          "GITHUB_TOKEN": "ghp_..."
        }
      }
    }
  }
}
```

### MCP Tools in Stream

```json
{
  "type": "tool_use",
  "tool_name": "mcp_github_get_issue",
  "arguments": {
    "owner": "google-gemini",
    "repo": "gemini-cli",
    "issue_number": 123
  }
}
```

---

## Built-in Tools

Gemini CLI includes several built-in capabilities:

### File System
- Read files
- Write files
- List directories
- Search for files

### Shell Execution
- Run commands
- Capture output
- Handle errors

### Google Search
Built-in Google Search grounding:
```bash
gemini -p "What's the latest news about AI?" --search
```

Or in settings:
```json
{
  "features": {
    "google_search": true
  }
}
```

### Web Fetching
Fetch content from URLs:
```bash
gemini -p "Summarize this article: https://example.com/article"
```

---

## wynter-code Implementation Notes

### Planned Implementation

Location: `src/services/gemini.ts` (to be created)

#### Process Spawning
```typescript
const args = [
  "-p",
  "--output-format", "stream-json"
];

if (model) {
  args.push("-m", model);
}

if (permissionMode === "bypassPermissions") {
  args.push("--yolo");
}

// Invoke via Tauri
await invoke("start_gemini_session", {
  cwd,
  sessionId,
  args,
  prompt
});
```

#### Event Mapping

| Gemini Event | wynter-code StreamChunk |
|-------------|------------------------|
| `init` | `init` |
| `message` (assistant) | `text` |
| `tool_use` | `tool_start` |
| `tool_result` | `tool_result` |
| `error` | `error` |
| `result` | `result` + `usage` |

### Current Status in wynter-code

From `src/types/session.ts`:
```typescript
export type AIProvider = "claude" | "codex" | "gemini";
export type GeminiModel = "gemini-2.0-flash" | "gemini-2.0-pro";
```

From `src/stores/autoBuildStore.ts`:
```typescript
// Gemini not yet implemented
if (provider === "gemini") {
  console.warn("Gemini provider not yet implemented, falling back to claude");
  return "claude";
}
```

### Implementation Gaps

1. **No Session Resume**: Unlike Claude/Codex, Gemini doesn't support `--resume`
   - Store full context and re-send
   - Or wait for feature to be added

2. **No Fine-Grained Permissions**: Only `--yolo` or default
   - No equivalent to Claude's `--allowedTools`
   - No sandbox modes like Codex

3. **Stream-JSON Availability**: May not be available in all versions
   - Fall back to `--output-format json` if needed

4. **Event Format Differences**: Gemini events may differ slightly
   - Need to validate actual event structure
   - Test with latest version

### Recommended Implementation

```typescript
// src/services/gemini.ts
class GeminiService {
  private _currentModel: GeminiModel = "gemini-2.0-flash";

  async startSession(
    cwd: string,
    sessionId: string,
    callbacks: GeminiSessionCallbacks,
    model?: string
  ): Promise<void> {
    // Build args
    const args = ["-p", "--output-format", "stream-json"];

    if (model) {
      args.push("-m", model);
    }

    // Set up event listener
    const unlisten = await listen<StreamChunk>("gemini-stream", (event) => {
      this.handleEvent(event.payload, callbacks);
    });

    // Start process
    await invoke("start_gemini_session", {
      cwd,
      sessionId,
      model: model || this._currentModel,
    });
  }

  private handleEvent(chunk: StreamChunk, cb: GeminiSessionCallbacks) {
    switch (chunk.chunk_type) {
      case "init":
        cb.onInit(chunk.model || "", chunk.cwd || "");
        break;
      case "message":
        if (chunk.role === "assistant") {
          cb.onText(chunk.content || "");
        }
        break;
      case "tool_use":
        cb.onToolStart(chunk.tool_name || "", chunk.tool_id || "");
        break;
      case "tool_result":
        cb.onToolResult(chunk.tool_id || "", chunk.content || "");
        break;
      case "error":
        cb.onError(chunk.content || "Unknown error");
        break;
      case "result":
        cb.onResult(chunk.content || "");
        if (chunk.stats) {
          cb.onUsage({
            inputTokens: chunk.stats.input_tokens,
            outputTokens: chunk.stats.output_tokens,
          });
        }
        break;
    }
  }
}
```

### Rust Backend (gemini_process.rs)

```rust
// src-tauri/src/gemini_process.rs

#[tauri::command]
pub async fn start_gemini_session(
    window: tauri::Window,
    cwd: String,
    session_id: String,
    model: Option<String>,
    prompt: Option<String>,
) -> Result<String, String> {
    let mut args = vec![
        "-p".to_string(),
        "--output-format".to_string(),
        "stream-json".to_string(),
    ];

    if let Some(m) = model {
        args.push("-m".to_string());
        args.push(m);
    }

    if let Some(p) = prompt {
        args.push(p);
    }

    let mut child = Command::new("gemini")
        .args(&args)
        .current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn Gemini CLI: {}", e))?;

    // Handle stdout/stderr similar to codex_process.rs
    // ...
}
```

---

## Known Issues & Limitations

### No Stream-JSON in Some Versions
Issue #9009 reports that `--output-format json` may not work in all versions:
```
Unknown arguments: output-format, outputFormat
```

**Workaround:** Use latest version or parse text output.

### No Session Resume
Unlike Codex and Claude:
- No thread ID concept
- No `--resume` flag
- Must re-send context

### Limited Permission Control
Only two modes:
- Default (asks for approval)
- `--yolo` (auto-approve everything)

No fine-grained permission patterns.

---

## Reference Links

- **Official Docs:** https://geminicli.com/docs/
- **Headless Mode:** https://geminicli.com/docs/cli/headless/
- **Configuration:** https://geminicli.com/docs/get-started/configuration/
- **GitHub:** https://github.com/google-gemini/gemini-cli
- **Gemini API:** https://ai.google.dev/gemini-api/docs/

---

## Comparison: All Three CLIs

| Feature | Codex | Claude | Gemini |
|---------|-------|--------|--------|
| **Streaming** | `--json` JSONL | `--output-format stream-json` | `--output-format stream-json` |
| **Auto-approve** | `--full-auto` or `--yolo` | `--dangerously-skip-permissions` | `--yolo` |
| **Fine-grained** | `--ask-for-approval` | `--allowedTools` | N/A |
| **Sandbox** | 3 modes | Container recommended | None |
| **Resume** | `codex resume <id>` | `--resume <id>` | Not supported |
| **Config** | `~/.codex/config.toml` | `~/.claude/settings.json` | `~/.gemini/settings.json` |
| **MCP** | TOML config | JSON config | JSON config |
| **Language** | Rust | TypeScript | TypeScript |
| **License** | Apache 2.0 | Proprietary | Apache 2.0 |
| **Free Tier** | Via ChatGPT sub | Via Anthropic API | 60 req/min |
