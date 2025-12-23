# Environment Variables Tool

## Overview
Visual .env file manager with security-focused UX (blurred values), supporting both global app-wide variables and per-project .env files.

## Features
- **Blurred values** - Click to reveal sensitive data
- **Global scope** - App-wide variables stored in Zustand
- **Project scope** - Read/write .env, .env.local, .env.production, etc.
- **File comparison** - Side-by-side diff of env files
- **Sensitive detection** - Auto-detect API keys, tokens, passwords
- **Gitignore warnings** - Alert when .env files aren't ignored

---

## Implementation Steps

### Step 1: TypeScript Types
**File:** `src/types/env.ts`
- `EnvVariable` - key, value, isSensitive, comment, lineNumber
- `EnvFile` - filename, path, variables, exists, isGitignored
- `GlobalEnvVariable` - with id, timestamps
- Export from `src/types/index.ts`

### Step 2: Zustand Store
**File:** `src/stores/envStore.ts`
- Global variables CRUD
- Reveal/hide tracking (not persisted)
- `detectSensitive()` helper with regex patterns
- Persist to `wynter-code-env` localStorage

### Step 3: Rust Backend Commands
**File:** `src-tauri/src/commands/mod.rs`
- `list_env_files(projectPath)` - List all .env* files with metadata
- `read_env_file(filePath)` - Parse .env content
- `write_env_file(filePath, variables)` - Serialize and save
- `create_env_file(projectPath, filename)` - Create new .env file
- `check_env_gitignore(projectPath, filename)` - Check if gitignored

**Register in:** `src-tauri/src/main.rs`

### Step 4: React Components
**Directory:** `src/components/tools/env-manager/`

| Component | Purpose |
|-----------|---------|
| `EnvManagerPopup.tsx` | Main modal with tabs (Global/Project) |
| `EnvVariableRow.tsx` | Row with blur toggle, edit, delete |
| `EnvFileSelector.tsx` | File tabs (.env, .env.local, etc.) |
| `EnvCompareView.tsx` | Side-by-side file comparison |
| `EnvAddForm.tsx` | Add new variable form |
| `index.ts` | Exports |

### Step 5: Tool Integration
**Update:** `src/components/tools/ToolsDropdown.tsx`
- Add `onOpenEnvManager` prop
- Add menu item with Key icon

**Update:** `src/components/layout/ProjectTabBar.tsx`
- Add `showEnvManager` state
- Render `EnvManagerPopup`

**Update:** `src/components/tools/index.ts`
- Export `EnvManagerPopup`

---

## UI Specifications

### Blur Effect
```tsx
// Blurred (default)
<span className="blur-sm select-none cursor-pointer">
  {value}
</span>

// Revealed (on click)
<span className="blur-none font-mono">
  {value}
</span>
```

### Sensitive Detection Patterns
- `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN`
- `PRIVATE_KEY`, `AUTH`, `CREDENTIAL`
- `DATABASE_URL`, `AWS_`, `STRIPE_`

### Gitignore Warning
Yellow banner when .env file is not gitignored:
> **.env** is not in .gitignore. Secrets may be committed.

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/types/env.ts` | Create |
| `src/types/index.ts` | Update (add export) |
| `src/stores/envStore.ts` | Create |
| `src-tauri/src/commands/mod.rs` | Update (add 5 commands) |
| `src-tauri/src/main.rs` | Update (register commands) |
| `src/components/tools/env-manager/*.tsx` | Create (5 files) |
| `src/components/tools/ToolsDropdown.tsx` | Update |
| `src/components/layout/ProjectTabBar.tsx` | Update |
| `src/components/tools/index.ts` | Update |

---

## Critical Files
- `src-tauri/src/commands/mod.rs` - Rust .env parsing logic
- `src/components/tools/env-manager/EnvManagerPopup.tsx` - Main UI
- `src/stores/envStore.ts` - Global state management

---

## Status
- **Created:** 2025-12-22
- **Issue:** wynter-code-6oy
