# Multi-CLI Model Support

## Overview

Add support for multiple AI CLI providers (Claude Code, Gemini CLI, Codex CLI) with one CLI per session. User selects provider when creating a session, UI shows provider-specific branding while app structure stays the same.

---

## Key Changes

### 1. Type System (`src/types/session.ts`)

```typescript
// New provider type
export type AIProvider = "claude" | "gemini" | "codex";

// Provider-specific models
export type ClaudeModel = "claude-sonnet-4-20250514" | "claude-opus-4-20250514" | "claude-haiku-3-5-20241022";
export type GeminiModel = "gemini-2.0-flash" | "gemini-2.0-pro" | "gemini-1.5-pro";
export type CodexModel = "gpt-4o" | "gpt-4-turbo" | "o1-preview";
export type AIModel = ClaudeModel | GeminiModel | CodexModel;

// Updated Session interface
export interface Session {
  // ... existing fields
  provider: AIProvider;              // NEW
  model: AIModel;                    // CHANGED from ClaudeModel
  providerSessionId: string | null;  // RENAMED from claudeSessionId
}
```

### 2. Rust Backend (`src-tauri/src/commands/mod.rs`)

Single polymorphic streaming command:

```rust
#[tauri::command]
pub async fn run_ai_streaming(
    window: tauri::Window,
    provider: AIProvider,  // "claude" | "gemini" | "codex"
    prompt: String,
    cwd: String,
    session_id: String,
    provider_session_id: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    match provider {
        AIProvider::Claude => run_claude_impl(...),
        AIProvider::Gemini => run_gemini_impl(...),
        AIProvider::Codex => run_codex_impl(...),
    }
}
```

**CLI Commands:**
- Claude: `claude -p "prompt" --output-format stream-json --resume <id>`
- Gemini: `gemini run --model <model> "prompt"`
- Codex: `codex exec --json --model <model> "prompt"`

### 3. Session Store (`src/stores/sessionStore.ts`)

```typescript
createSession: (
  projectId: string,
  type: SessionType = "claude",
  provider: AIProvider = "claude",  // NEW
  model?: AIModel
) => string;
```

Migration: existing sessions default to `provider: "claude"`, rename `claudeSessionId` → `providerSessionId`.

### 4. Provider Icons (`src/components/icons/`)

Create SVG icon components:
- `ClaudeIcon.tsx` - existing from public/claude.svg
- `GeminiIcon.tsx` - Google Gemini sparkle logo
- `OpenAIIcon.tsx` - OpenAI logo

### 5. UI Components

**ProviderSelector** (`src/components/model/ProviderSelector.tsx`) - NEW
- Shows installed providers with icons
- Used when creating new session
- Shows provider color (Claude: #da7756, Gemini: #4285f4, OpenAI: #10a37f)

**ModelSelector** (`src/components/model/ModelSelector.tsx`) - UPDATE
- Filter models by current session's provider
- Show provider icon alongside

**AIResponseCard** (`src/components/output/ClaudeResponseCard.tsx`) - RENAME
- Change "Claude" label to dynamic provider name
- Use provider color for status indicator

**SessionTabBar** (`src/components/layout/SessionTabBar.tsx`) - UPDATE
- New session dropdown shows provider options
- Session tabs show provider icon

### 6. Onboarding (`src/components/onboarding/steps/Step4SystemCheck.tsx`)

Add CLI detection:
```typescript
{ key: "gemini", label: "Gemini CLI", installCommand: "npm i -g @google/genai" }
{ key: "codex", label: "Codex CLI", installCommand: "npm i -g @openai/codex" }
```

Update `check_system_requirements` in Rust to check for all three CLIs.

### 7. Settings (`src/components/settings/SettingsPopup.tsx`)

New "AI Providers" section:
- Show installed status for each provider
- Default provider selector
- Custom CLI path configuration (optional)

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/session.ts` | Add AIProvider, update Session interface |
| `src/stores/sessionStore.ts` | Add provider to createSession, migration |
| `src/stores/settingsStore.ts` | Add defaultProvider, providerPaths |
| `src-tauri/src/commands/mod.rs` | Add run_ai_streaming, provider implementations |
| `src-tauri/src/main.rs` | Register new command |
| `src/services/claude.ts` | Update to use new command |
| `src/components/icons/GeminiIcon.tsx` | NEW |
| `src/components/icons/OpenAIIcon.tsx` | NEW |
| `src/components/model/ProviderSelector.tsx` | NEW |
| `src/components/model/ModelSelector.tsx` | Filter by provider |
| `src/components/output/ClaudeResponseCard.tsx` | Rename, add provider prop |
| `src/components/layout/SessionTabBar.tsx` | Provider selection in dropdown |
| `src/components/onboarding/steps/Step4SystemCheck.tsx` | Add CLI checks |
| `src/components/settings/SettingsPopup.tsx` | Provider settings section |

---

## Implementation Order

1. **Phase 1: Types & Backend**
   - Update type definitions
   - Add Rust provider enum and streaming command
   - Implement Gemini/Codex CLI parsers

2. **Phase 2: Store Migration**
   - Update sessionStore with provider field
   - Add migration for existing sessions
   - Update settingsStore

3. **Phase 3: Services**
   - Update claude service to use new command
   - Normalize streaming callbacks

4. **Phase 4: UI**
   - Create provider icons
   - Build ProviderSelector
   - Update ModelSelector, SessionTabBar, ResponseCard

5. **Phase 5: Onboarding & Settings**
   - Expand system check
   - Add provider settings

---

## Design Decisions

- **Onboarding**: At least one CLI required, primary focus on Claude CLI
- **Provider Selection**: In session dropdown, only shows installed providers
- **Default**: Claude is the default if installed
