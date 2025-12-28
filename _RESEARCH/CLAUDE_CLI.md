# Anthropic Claude Code CLI - Comprehensive Reference

> **Last Updated:** December 2025
> **Official Docs:** https://code.claude.com/docs/en/
> **GitHub:** https://github.com/anthropics/claude-code
> **License:** Proprietary (Anthropic)

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Authentication](#authentication)
4. [CLI Commands](#cli-commands)
5. [Print Mode (-p)](#print-mode--p)
6. [Output Formats](#output-formats)
7. [Permission Model](#permission-model)
8. [Stream-JSON Events](#stream-json-events)
9. [Session Management](#session-management)
10. [Configuration (settings.json)](#configuration-settingsjson)
11. [MCP Integration](#mcp-integration)
12. [Hooks System](#hooks-system)
13. [Skills & Slash Commands](#skills--slash-commands)
14. [Agent SDK](#agent-sdk)
15. [wynter-code Implementation Notes](#wynter-code-implementation-notes)

---

## Overview

Claude Code is Anthropic's agentic coding tool for the terminal. It can:
- Read and understand your entire codebase
- Edit files with diff-based proposals
- Run terminal commands
- Handle git workflows
- Use MCP tools

**Key Characteristics:**
- Interactive TUI by default
- Headless/print mode for automation (-p flag)
- Permission-based security model
- Session persistence via session IDs
- Extensible via hooks and skills

---

## Installation

### Via npm (Recommended)
```bash
npm install -g @anthropic-ai/claude-code
```

### Verify Installation
```bash
claude --version
which claude
```

### First Run
```bash
claude
# Prompts for Anthropic API key on first launch
```

---

## Authentication

### API Key Setup
```bash
# Set via environment variable
export ANTHROPIC_API_KEY="sk-ant-..."

# Or configure in settings
claude config set api_key sk-ant-...
```

### Verify Auth
```bash
claude -p "Hello"  # Should respond without auth errors
```

---

## CLI Commands

### `claude` (Interactive Mode)
Launch the full TUI:
```bash
claude
claude "Fix the bug in auth.py"
```

### `claude -p` (Print/Headless Mode)
Run without TUI, output to stdout:
```bash
claude -p "Explain this codebase"
claude --print "List all functions"
```

### `claude config`
Manage configuration:
```bash
claude config list
claude config set <key> <value>
claude config get <key>
```

### `claude mcp`
Manage MCP servers:
```bash
claude mcp list
claude mcp add <name> <command>
claude mcp remove <name>
```

---

## Print Mode (-p)

Print mode enables headless/programmatic operation:

```bash
claude -p "Your prompt here" [options]
```

### Key Flags

| Flag | Description |
|------|-------------|
| `-p`, `--print` | Enable headless mode |
| `--output-format` | Output type: `text`, `json`, `stream-json` |
| `--resume <id>` | Resume specific session |
| `--continue` | Continue most recent session |
| `--allowedTools` | Auto-approve specific tools |
| `--append-system-prompt` | Add to system prompt |
| `--system-prompt` | Replace system prompt entirely |
| `--json-schema` | Define structured output schema |
| `--input-format` | Input type: `text`, `stream-json` |
| `--verbose` | Enable verbose logging |
| `--permission-mode` | Set permission mode |
| `--dangerously-skip-permissions` | Bypass all permission checks |

### Examples

```bash
# Simple query
claude -p "What does this code do?"

# With JSON output
claude -p "List functions" --output-format json

# Streaming events
claude -p "Analyze code" --output-format stream-json

# Auto-approve specific tools
claude -p "Run tests" --allowedTools "Bash(npm:*),Read"

# Continue conversation
claude -p "Review code"
claude -p "Focus on security" --continue

# Resume specific session
claude -p "Continue analysis" --resume "session_abc123"

# Structured output
claude -p "Extract functions" --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array"}}}'
```

---

## Output Formats

### Text (Default)
```bash
claude -p "Explain this code"
```
Plain text response, human-readable.

### JSON
```bash
claude -p "Query" --output-format json
```

Response structure:
```json
{
  "result": "The response text...",
  "session_id": "session_abc123",
  "usage": {
    "input_tokens": 1234,
    "output_tokens": 567,
    "cache_read_tokens": 100
  }
}
```

### Stream-JSON
```bash
claude -p "Query" --output-format stream-json
```

Emits newline-delimited JSON (NDJSON) events in real-time.

### Input Format (stream-json)
```bash
# Pipe input from another Claude instance
claude -p "First task" --output-format stream-json | \
  claude -p "Process results" --input-format stream-json --output-format stream-json
```

---

## Permission Model

Claude Code has a hierarchical permission system:

### Default Behavior
- Asks permission for every action
- Shows diffs before file edits
- Confirms before command execution

### `--allowedTools`
Auto-approve specific tools:
```bash
# Allow all Bash commands
claude -p "task" --allowedTools "Bash"

# Allow specific Bash patterns
claude -p "task" --allowedTools "Bash(npm:*),Bash(git:*)"

# Multiple tools
claude -p "task" --allowedTools "Bash,Read,Edit,Write"

# Restrict Bash to specific commands
claude -p "task" --allowedTools "Bash(git diff:*),Bash(git log:*),Bash(git status:*)"
```

### `--dangerously-skip-permissions`
Bypass ALL permission checks:
```bash
claude -p "task" --dangerously-skip-permissions
```

**Warning:** Use only in isolated/containerized environments.

### Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `manual` | Ask for every action | Default, maximum control |
| `acceptEdits` | Auto-approve edits, ask for commands | Trusted file operations |
| `bypassPermissions` | Auto-approve everything | Full automation |
| `plan` | Read-only, no execution | Safe exploration |

### Permission Wildcards in Settings

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(git:*)",
      "Read(*)",
      "Edit(src/**)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Edit(.env)"
    ]
  }
}
```

---

## Stream-JSON Events

When using `--output-format stream-json`, events are emitted as NDJSON:

### Event Types

#### `init`
Session initialization:
```json
{
  "type": "init",
  "session_id": "session_abc123",
  "model": "claude-sonnet-4-20250514",
  "cwd": "/path/to/project"
}
```

#### `system`
System messages:
```json
{
  "type": "system",
  "subtype": "ready",
  "content": "Session started"
}
```

#### `assistant`
Text response chunks:
```json
{
  "type": "assistant",
  "subtype": "text",
  "content": "Here's my analysis..."
}
```

#### `thinking`
Thinking/reasoning (extended thinking):
```json
{
  "type": "assistant",
  "subtype": "thinking",
  "content": "Let me analyze this step by step..."
}
```

#### `tool_use`
Tool invocation start:
```json
{
  "type": "tool_use",
  "tool_id": "tool_001",
  "tool_name": "Read",
  "input": {
    "file_path": "/path/to/file.ts"
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
  "is_error": false
}
```

#### `usage`
Token usage:
```json
{
  "type": "usage",
  "input_tokens": 1234,
  "output_tokens": 567,
  "cache_read_tokens": 100,
  "cache_creation_tokens": 50
}
```

#### `result`
Final result:
```json
{
  "type": "result",
  "session_id": "session_abc123",
  "result": "Complete response text..."
}
```

#### `error`
Error event:
```json
{
  "type": "error",
  "content": "Something went wrong",
  "is_error": true
}
```

### Built-in Tools

| Tool Name | Purpose |
|-----------|---------|
| `Read` | Read file contents |
| `Write` | Create new file |
| `Edit` | Modify existing file |
| `Bash` | Execute shell command |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `Task` | Spawn subagent |
| `WebFetch` | Fetch URL content |
| `WebSearch` | Search the web |
| `TodoWrite` | Manage todo list |
| `AskUserQuestion` | Ask user for input |

---

## Session Management

### Session IDs
Every session has a unique ID that enables:
- Conversation persistence
- Session resume
- Multi-turn interactions

### Resume Most Recent
```bash
claude -p "Continue" --continue
```

### Resume Specific Session
```bash
# Capture session ID
session_id=$(claude -p "Start review" --output-format json | jq -r '.session_id')

# Resume later
claude -p "Continue" --resume "$session_id"
```

### Session Storage
Sessions stored in `~/.claude/`:
- `~/.claude/sessions/` - Session transcripts
- `~/.claude/projects/` - Project-specific context

---

## Configuration (settings.json)

### File Locations

| File | Scope |
|------|-------|
| `~/.claude/settings.json` | User settings (all projects) |
| `.claude/settings.json` | Project settings (shared) |
| `.claude/settings.local.json` | Local project (gitignored) |

### Settings Hierarchy
Local > Project > User

### Common Settings

```json
{
  "model": "claude-sonnet-4-20250514",
  "maxTokens": 8192,
  "permissions": {
    "allow": ["Read(*)", "Bash(npm:*)"],
    "deny": ["Bash(rm -rf:*)"]
  },
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-filesystem"]
      }
    }
  },
  "hooks": {
    "beforeToolCall": ["./scripts/validate-tool.sh"]
  }
}
```

### Permission Settings

```json
{
  "permissions": {
    "allow": [
      "Bash(npm:*)",
      "Bash(git:*)",
      "Bash(npx:*)",
      "Read(*)",
      "Edit(src/**)",
      "Write(src/**)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Bash(sudo:*)",
      "Edit(.env*)",
      "Write(.env*)"
    ]
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
        "args": ["-y", "@anthropic/mcp-server-filesystem"],
        "env": {}
      },
      "github": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-github"],
        "env": {
          "GITHUB_TOKEN": "ghp_..."
        }
      },
      "postgres": {
        "command": "npx",
        "args": ["-y", "@anthropic/mcp-server-postgres"],
        "env": {
          "DATABASE_URL": "postgres://..."
        }
      }
    }
  }
}
```

### MCP Tools in Activity

MCP tools appear in stream-json as regular tool calls:
```json
{
  "type": "tool_use",
  "tool_id": "mcp_001",
  "tool_name": "mcp__github__get_issue",
  "input": {
    "owner": "anthropics",
    "repo": "claude-code",
    "issue_number": 123
  }
}
```

### Permission Requests

MCP tools can trigger permission requests:
```json
{
  "type": "permission_request",
  "tool_name": "mcp__filesystem__write_file",
  "input": {...},
  "awaiting_approval": true
}
```

---

## Hooks System

Hooks allow custom scripts to run at specific points:

### Hook Types

| Hook | Trigger |
|------|---------|
| `beforeToolCall` | Before any tool execution |
| `afterToolCall` | After tool execution |
| `onPermissionRequest` | When permission is requested |

### Configuration

```json
{
  "hooks": {
    "beforeToolCall": [
      "./scripts/validate-tool.sh"
    ],
    "afterToolCall": [
      "./scripts/log-tool.sh"
    ]
  }
}
```

### Hook Script Interface

```bash
#!/bin/bash
# Input: JSON on stdin
# {
#   "tool_name": "Bash",
#   "input": {"command": "npm test"}
# }

# Output: exit code
# 0 = approve
# 1 = deny
# 2 = ask user

read -r input
tool_name=$(echo "$input" | jq -r '.tool_name')

if [[ "$tool_name" == "Bash" ]]; then
  command=$(echo "$input" | jq -r '.input.command')
  if [[ "$command" == *"rm -rf"* ]]; then
    exit 1  # Deny dangerous commands
  fi
fi

exit 0  # Approve
```

---

## Skills & Slash Commands

### Built-in Commands

| Command | Action |
|---------|--------|
| `/help` | Show help |
| `/clear` | Clear conversation |
| `/model` | Change model |
| `/compact` | Compact mode toggle |
| `/init` | Initialize project |

### Custom Skills

Skills are reusable prompts/workflows:

```json
{
  "skills": {
    "review": {
      "description": "Code review",
      "prompt": "Review this code for bugs, security issues, and best practices"
    },
    "commit": {
      "description": "Create git commit",
      "prompt": "Analyze staged changes and create an appropriate commit message"
    }
  }
}
```

Use:
```bash
claude -p "/review src/auth.ts"
```

---

## Agent SDK

### Python SDK

```python
from anthropic_claude_code import ClaudeCode

client = ClaudeCode()

# Single prompt
result = client.run("Analyze this codebase")
print(result.text)

# Multi-turn
session = client.start_session()
r1 = session.run("Start code review")
r2 = session.run("Focus on security issues")
```

### TypeScript SDK

```typescript
import { ClaudeCode } from '@anthropic-ai/claude-code';

const client = new ClaudeCode();

// Single prompt
const result = await client.run("Analyze this codebase");
console.log(result.text);

// Multi-turn with streaming
const session = client.startSession();

for await (const event of session.stream("Analyze code")) {
  if (event.type === 'text') {
    process.stdout.write(event.content);
  } else if (event.type === 'tool_use') {
    console.log(`Using tool: ${event.tool_name}`);
  }
}
```

### CLI Pipeline

```bash
# Chain Claude instances
claude -p "First task" --output-format stream-json | \
  claude -p "Process" --input-format stream-json --output-format stream-json | \
  claude -p "Finalize" --input-format stream-json
```

---

## wynter-code Implementation Notes

### Current Implementation

Location: `src/services/claude.ts`

#### Process Spawning
```typescript
// Build command args
const args = [
  "-p",
  "--output-format", "stream-json",
  "--input-format", "stream-json",
  "--verbose"
];

if (permissionMode === "acceptEdits") {
  args.push("--permission-mode", "acceptEdits");
} else if (permissionMode === "bypassPermissions") {
  args.push("--dangerously-skip-permissions");
}

if (resumeSessionId) {
  args.push("--resume", resumeSessionId);
}

// Invoke via Tauri
await invoke("start_claude_session", {
  cwd,
  sessionId,
  args,
  prompt
});
```

#### Event Mapping

| Claude Event | wynter-code Handler |
|-------------|---------------------|
| `init` | `onInit(model, cwd, sessionId)` |
| `assistant.text` | `onText(content)` |
| `assistant.thinking` | `onThinking(content)` |
| `tool_use` | `onToolStart(toolName, toolId)` |
| `tool_result` | `onToolResult(toolId, content)` |
| `usage` | `onUsage(stats)` |
| `result` | `onResult(text)` |
| `error` | `onError(message)` |

### MCP Permission Server

Claude Code supports external MCP permission servers:

```typescript
// Start MCP permission server
await invoke("start_mcp_permission_server", { port: 8765 });

// Listen for permission requests
listen("mcp-permission-request", (event) => {
  showPermissionModal(event.payload);
});

// Respond to permission request
await invoke("respond_to_permission", {
  requestId: event.id,
  approved: true
});
```

### Integration with Auto-Build

```typescript
// From autoBuildStore.ts
const getStartSessionCommand = (provider: AIProvider) => {
  switch (provider) {
    case "claude": return "start_claude_session";
    case "codex": return "start_codex_session";
    case "gemini": return "start_gemini_session";
  }
};

const getStreamEventName = (provider: AIProvider) => {
  switch (provider) {
    case "claude": return "claude-stream";
    case "codex": return "codex-stream";
    case "gemini": return "gemini-stream";
  }
};
```

### Permission Mode Toggle

Maps UI toggle to CLI flags:

| UI Mode | CLI Flag |
|---------|----------|
| Manual | (default) |
| Auto-Accept Edits | `--permission-mode acceptEdits` |
| Bypass Permissions | `--dangerously-skip-permissions` |
| Plan Mode | `--permission-mode plan` |

### Recommended Updates

1. **Tool Allowlist Patterns**: Use `--allowedTools` for fine-grained control:
   ```typescript
   args.push("--allowedTools", "Bash(npm:*),Bash(git:*),Read,Edit,Write");
   ```

2. **Structured Output**: For specific responses:
   ```typescript
   args.push("--json-schema", JSON.stringify(schema));
   ```

3. **Hooks Integration**: Consider adding hook support for tool validation

4. **Session Persistence**: Store session IDs for resume functionality

---

## Reference Links

- **Headless Mode:** https://code.claude.com/docs/en/headless
- **CLI Reference:** https://docs.anthropic.com/en/docs/claude-code/cli-usage
- **Permission Model:** https://skywork.ai/blog/permission-model-claude-code-vs-code-jetbrains-cli/
- **Best Practices:** https://www.anthropic.com/engineering/claude-code-best-practices
- **GitHub:** https://github.com/anthropics/claude-code
- **Agent SDK:** https://platform.claude.com/docs/en/agent-sdk/overview
