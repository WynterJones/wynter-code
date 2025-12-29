# Cursor Composer 1 Research

> Research completed: 2025-12-28

## Overview

**Cursor Composer-1** is Cursor's first proprietary coding LLM, released October 2025 with Cursor 2.0. It can be driven via CLI with JSON streaming, making it viable for integration as an AI provider in wynter-code.

---

## Model Specifications

### Architecture
- **Type:** Mixture-of-Experts (MoE) language model
- **Training:** Reinforcement learning specialized for software engineering
- **Context:** Long-context generation and understanding support

### Performance
| Metric | Value |
|--------|-------|
| Speed | 4x faster than comparable frontier models |
| Throughput | ~250 tokens/second |
| Latency | Most turns < 30 seconds |

### Trade-offs
- GPT-5 and Claude Sonnet 4.5 beat Composer in raw coding intelligence
- Composer matches mid-frontier intelligence with highest generation speed
- Best for iterative, fast feedback loops where speed > precision

### Built-in Tools
- File read/edit/write/delete
- Codebase-wide semantic search
- Pattern matching (grep)
- Terminal command execution
- Directory listing (ls, glob)
- Todo management

---

## CLI: cursor-agent

### Installation
```bash
curl https://cursor.com/install -fsSL | bash
```

### Authentication
```bash
export CURSOR_API_KEY=your_api_key_here
```

### Basic Usage
```bash
# Interactive chat
cursor-agent chat "find one bug and fix it"

# Headless/script mode with streaming JSON
cursor-agent -p \
  --model composer-1 \
  --output-format stream-json \
  --stream-partial-output \
  "Refactor the auth middleware"
```

### CLI Flags

| Flag | Purpose |
|------|---------|
| `-p, --print` | Non-interactive/headless mode |
| `--force` | Allow file modifications without confirmation |
| `--output-format stream-json` | NDJSON streaming output |
| `--output-format text` | Human-readable output |
| `--output-format json` | Structured JSON output |
| `--stream-partial-output` | Emit incremental text deltas |
| `--model <model>` | Select model (e.g., `composer-1`) |
| `--approve-mcps` | Pre-approve MCP servers |

---

## NDJSON Stream Protocol

Each line is a separate JSON object terminated with `\n`.

### Event Types

#### 1. System Init
Emitted once at session start:
```json
{
  "type": "system",
  "subtype": "init",
  "apiKeySource": "env|flag|login",
  "cwd": "/absolute/path",
  "session_id": "uuid-string",
  "model": "composer-1",
  "permissionMode": "default"
}
```

#### 2. User Message
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{"type": "text", "text": "prompt text"}]
  },
  "session_id": "uuid"
}
```

#### 3. Assistant Message
With `--stream-partial-output`, multiple events per response:
```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{"type": "text", "text": "partial or complete response"}]
  },
  "session_id": "uuid"
}
```

#### 4. Tool Call Started
```json
{
  "type": "tool_call",
  "subtype": "started",
  "call_id": "string-id",
  "tool_call": {
    "readToolCall": {"args": {"path": "file.txt"}}
  },
  "session_id": "uuid"
}
```

#### 5. Tool Call Completed
```json
{
  "type": "tool_call",
  "subtype": "completed",
  "call_id": "string-id",
  "tool_call": {
    "readToolCall": {
      "args": {"path": "file.txt"},
      "result": {
        "success": {
          "content": "file contents...",
          "isEmpty": false,
          "exceededLimit": false,
          "totalLines": 54,
          "totalChars": 1254
        }
      }
    }
  },
  "session_id": "uuid"
}
```

#### 6. Terminal Result
Success:
```json
{
  "type": "result",
  "subtype": "success",
  "duration_ms": 1234,
  "duration_api_ms": 1234,
  "is_error": false,
  "result": "full assistant text",
  "session_id": "uuid",
  "request_id": "optional-request-id"
}
```

Error: Process exits non-zero, stream ends without result event, error on stderr.

### Tool Call Types

| Tool Call Key | Operation |
|---------------|-----------|
| `shellToolCall` | Shell command execution |
| `readToolCall` | File reading |
| `editToolCall` | File modifications |
| `writeToolCall` | File writing |
| `deleteToolCall` | File deletion |
| `grepToolCall` | Pattern search |
| `lsToolCall` | Directory listing |
| `globToolCall` | File glob patterns |
| `todoToolCall` | Add todos |
| `updateTodosToolCall` | Update todos |

---

## Integration Strategy for wynter-code

### Mapping to StreamChunk

| Cursor Event | StreamChunk.chunk_type |
|--------------|------------------------|
| `system.init` | `"init"` |
| `assistant` | `"text"` |
| `tool_call.started` | `"tool_use"` |
| `tool_call.completed` | `"tool_result"` |
| `result.success` | `"result"` |
| error (stderr) | `"error"` |

### Files to Create/Modify

**New Files:**
- `src/services/cursor.ts` - TypeScript service
- `src-tauri/src/cursor_process.rs` - Rust process manager
- `public/cursor-color.svg` - Icon asset

**Modify:**
- `src/types/session.ts` - Add `CursorModel` type
- `src/stores/settingsStore.ts` - Add `defaultCursorModel`
- `src/components/model/ModelSelector.tsx` - Add cursor models
- `src/components/session/ProviderIcon.tsx` - Add cursor icon config
- `src/components/session/StartButton.tsx` - Add cursor provider option
- `src-tauri/src/commands/mod.rs` - Register commands
- `src-tauri/src/main.rs` - Add CursorProcessManager state

---

## Known Limitations

1. **Beta Status** - CLI security safeguards still evolving
2. **Concurrency** - Issues with multiple headless sessions; serialize with delay
3. **MCP Approvals** - Headless limitations; use `--approve-mcps --force`
4. **Token Usage** - Not included in stream-json output (feature requested)
5. **Subscription Required** - Cursor pricing:
   - Pro: $20/month (500 fast requests)
   - Business: $40/user/month
   - Ultra: $200/month (~10k fast actions)

---

## References

- [Cursor Headless CLI Docs](https://cursor.com/docs/cli/headless)
- [Output Format Reference](https://cursor.com/docs/cli/reference/output-format)
- [Cursor Agent CLI Blog](https://cursor.com/blog/cli)
- [Composer Model Blog](https://cursor.com/blog/composer)
- [Cursor 2.0 Announcement](https://cursor.com/blog/2-0)
- [Stream Format Parsing Guide](https://tarq.net/posts/cursor-agent-stream-format/)
