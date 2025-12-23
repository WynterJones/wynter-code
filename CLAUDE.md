# wynter-code

## MANDATORY: Issue-First Workflow

**ALWAYS create beads issues BEFORE starting work.** This ensures full visibility and tracking.

### Single Task
1. Create issue: `bd create "Task description" -t bug|feature|task -p 0-4`
2. Claim it: `bd update <id> --status in_progress`
3. Do the work
4. Close it: `bd close <id> --reason "What was done"`

### Multiple Tasks
When given multiple tasks, **log ALL of them first** before starting:
1. Create all issues upfront
2. Show what's queued: `bd list --status open`
3. Work through them one by one
4. Close each issue when complete

**NO EXCEPTIONS**: Every task gets an issue.

---

## Phrase Commands

These are phrase triggers. Most activate when the phrase is the **entire message**.

---

### Farmwork Phrases (Development Workflow)

Run these in order for a complete development cycle:

| Phrase | Action |
|--------|--------|
| **open the farm** | Audit systems, update `_AUDIT/FARMHOUSE.md` with current metrics |
| **count the herd** | Full inspection + dry run: code review, cleanup, performance, security, code quality, accessibility |
| **go to market** | i18n scan + accessibility audit for missing translations and a11y issues |
| **close the farm** | Execute `/push` (lint, test, build, commit, push) |

---

### Plan Phrases

| Phrase | Action |
|--------|--------|
| **make a plan for...** | Investigate codebase, create plan, save to `_PLANS/*.md` |
| **let's implement...** | Load plan from `_PLANS/*.md`, create Epic + issues, confirm, start work |

---

### Idea Phrases (Pre-Plan Stage)

| Phrase | Action |
|--------|--------|
| **I have an idea for...** | Add new idea to `_AUDIT/GARDEN.md` (title, description, bullets) |
| **let's plan this idea...** | Graduate idea from GARDEN → create plan in `_PLANS/` |
| **I dont want to do this idea...** | Reject idea → move from GARDEN to COMPOST |
| **remove this feature...** | Archive feature idea to COMPOST |
| **compost this...** | Move idea from GARDEN to COMPOST |

---

### Farmwork Phrase Details

**open the farm**
1. Launch `the-farmer` agent to audit all systems
2. Run `bd list --status closed | wc -l` to get total completed issues
3. Updates `_AUDIT/FARMHOUSE.md` with current metrics

**count the herd** (Full Audit Cycle)
Runs all inspection agents in parallel, then dry run quality gates. No push.

1. **Code Review & Cleanup** - `code-reviewer` + `unused-code-cleaner`
2. **Performance Audit** - `performance-auditor`, updates `_AUDIT/PERFORMANCE.md`
3. **Security Audit** - `security-auditor` for OWASP Top 10, updates `_AUDIT/SECURITY.md`
4. **Tauri Security** - `tauri-security-auditor` for IPC/capability security, updates `_AUDIT/TAURI_SECURITY.md`
5. **Rust Code Audit** - `rust-code-auditor` for error handling/panics, updates `_AUDIT/RUST.md`
6. **Code Quality** - `code-smell-auditor` for DRY violations, updates `_AUDIT/CODE_QUALITY.md`
7. **Accessibility** - `accessibility-auditor` for WCAG 2.1, updates `_AUDIT/ACCESSIBILITY.md`
8. **Dry Run** - lint, tests, build (but NOT commit/push)
9. **Summary Report** - Consolidate findings, ask user next steps

**go to market**
1. Scan for hardcoded text not using i18n
2. Launch `i18n-locale-translator` agent
3. Launch `accessibility-auditor` for WCAG 2.1 compliance
4. Updates `_AUDIT/ACCESSIBILITY.md`

**close the farm**
- Invoke the `push` skill immediately

---

### Idea Phrase Details

**I have an idea for...**
1. Launch `idea-gardener` agent
2. Parse idea title from user input
3. Ask for short description and bullet points
4. Add to `_AUDIT/GARDEN.md` under ## Ideas section

**let's plan this idea...**
1. Launch `idea-gardener` agent
2. Find the idea in GARDEN.md
3. Create plan in `_PLANS/` using plan mode
4. Move to "Graduated to Plans" table
5. Remove from ## Ideas section

**compost this...** / **I dont want to do this idea...**
1. Launch `idea-gardener` agent
2. Find idea in GARDEN.md (or accept new rejection)
3. Ask for rejection reason
4. Add to `_AUDIT/COMPOST.md` with reason
5. Remove from GARDEN.md if it was there

---

## Plan Mode Protocol

**CRITICAL**: When Claude enters Plan Mode, ALL plans MUST:

### Step 1: Save Plan to `_PLANS/`
Before exiting plan mode, the plan MUST be saved to `_PLANS/<FEATURE_NAME>.md`:
- Use SCREAMING_SNAKE_CASE for filename
- Include: overview, technical approach, files to modify, implementation steps, risks

### Step 2: Exit Plan Mode & Create Epic
After user approves:
1. Exit plan mode
2. Create a beads Epic
3. Create child issues from plan steps

### Step 3: Confirm Before Implementation
1. Show the created Epic and issues
2. **Always ask**: "Ready to start implementing?"
3. Wait for explicit user confirmation

---

## Project Configuration

- **Test Command:** `npm run test`
- **Build Command:** `npm run build`
- **Lint Command:** `npm run lint`

---

## UI Patterns

### File/Folder Selection
**ALWAYS use the app's FileBrowserPopup** for file and folder selection. Never use native Tauri dialogs (`@tauri-apps/plugin-dialog`).

```tsx
import { FileBrowserPopup } from "@/components/files/FileBrowserPopup";

// For folder selection
<FileBrowserPopup
  isOpen={showFileBrowser}
  onClose={() => setShowFileBrowser(false)}
  initialPath={homeDir}
  mode="selectProject"
  selectButtonLabel="Select Folder"
  onSelectProject={(path) => handleFolderSelected(path)}
/>

// For file browsing
<FileBrowserPopup
  isOpen={showFileBrowser}
  onClose={() => setShowFileBrowser(false)}
  initialPath={projectPath}
  mode="browse"
  onSendToPrompt={(image) => handleImage(image)}
/>
```

This ensures a consistent UX across the app with our custom file browser that includes git status indicators, quick look previews, and more.

---

## Tips for Claude Code

### When Working on Features
- Always check justfile: `just --list`
- Create issues before starting work
- Use "make a plan for..." for non-trivial features

### Before Committing
```bash
npm run lint    # Check code quality
npm run build   # Verify compilation
```

## Notes:

- Always use OverlayScrollbars for scrollbars for any scrollable container.
- When we make new tools, add their paths to justfiles for quicker access.
- Never use emojies always proper icons
