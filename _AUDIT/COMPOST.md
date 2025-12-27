# Idea Compost

> Archive of rejected ideas. Reference to avoid re-proposing and remember why we didn't pursue something.

**Last Updated:** 2025-12-26
**Composted Ideas:** 35

---

## How to Use

| Phrase | Action |
|--------|--------|
| `I dont want to do this idea...` | Reject an idea |
| `remove this feature...` | Archive a feature idea |
| `compost this...` | Move idea from GARDEN here |

---

## Composted Ideas

### System-Wide Whispr Flow Clone
A system-wide speech-to-text tool similar to Whispr Flow. Capture voice input from anywhere and have it automatically transcribed and pasted at your cursor position.
> **Why rejected (2025-12-26):** No longer pursuing this idea

### Plugin Architecture
Refactor 25+ tools into a plugin system with manifests, dynamic registration, and lazy loading.
> **Why rejected:** Without third-party contributors, the effort outweighs the benefits. Current monolith works fine for solo dev. Plan kept in `_PLANS/PLUGIN_ARCHITECTURE.md` for future reference.

### Git Stash Manager
Visual stash management - list stashes, apply/pop/drop, partial stash, compare with current.
> **Why rejected:** Git stash is used infrequently enough that CLI is fine. Not worth the UI complexity.

### Branch Comparison
Compare branches visually - diff files, cherry-pick commits, merge preview.
> **Why rejected:** Already have diff viewer in Git panel. Full branch comparison is better in dedicated Git tools.

### Quick Docs Lookup
Hover over package name to see docs, search npm/crates/pypi, offline doc bundles.
> **Why rejected:** Browser is right there. Too much effort for marginal benefit.

### Clipboard History
Code-focused clipboard manager with syntax highlighting, search, pin snippets.
> **Why rejected:** macOS has clipboard history. Dedicated apps like Raycast do this better.

### Recent Files Bar
Quick access to recently opened/edited files, pinned favorites.
> **Why rejected:** File browser already shows recent. Would add UI clutter.

### Error Link Handler
Click terminal errors to jump to code location, parse Jest/TypeScript/ESLint output.
> **Why rejected:** Terminal already supports clickable links in most cases. Complex to parse all error formats reliably.

### Package Script Runner
Visual interface for package.json scripts with one-click run buttons, mini terminal output.
> **Why rejected:** Already implemented in sidebar tabs. Redundant feature.

### TODO/FIXME Scanner
Scan project for TODO, FIXME, HACK comments with grouping and jump-to-location.
> **Why rejected:** Simple regex search. Better handled by existing editor extensions or Claude queries.

### Session Search
Full-text search across all Claude conversations with filters and bookmarks.
> **Why rejected:** Lower priority. Can use system-level search or ask Claude to recall.

### Context File Manager
Visual manager for files in Claude's context with token counts and drag-to-add.
> **Why rejected:** Claude handles context well enough. Added complexity for marginal benefit.

### Quick Prompt Bar
Floating prompt input with global keyboard shortcut for fast queries.
> **Why rejected:** Main prompt input is accessible enough. Would add UI complexity.

### Conversation Bookmarks
Mark important points in conversations with notes and export.
> **Why rejected:** Not frequently needed. Can copy/paste important content manually.

### Response Comparison
Compare multiple Claude responses side-by-side with diff view.
> **Why rejected:** Edge case use. Not worth the UI overhead.

### Auto-Context Loader
Automatically suggest relevant files based on conversation and imports.
> **Why rejected:** Could be noisy. Claude already handles context requests well.

### Claude Profiles
Different settings profiles for debugging, refactoring, learning workflows.
> **Why rejected:** Over-engineering. Model defaults work well for most tasks.

### Code Metrics Dashboard
Project statistics - lines of code, file counts, bundle size, complexity.
> **Why rejected:** Already implemented in sidebar tabs. Redundant feature.

### Resend Integration
Email metrics - sent count, delivery rate, open rate, bounce rate.
> **Why rejected:** Low priority. Email monitoring better done in Resend's own dashboard.

### GitHub Actions Integration
Workflow run status, failed jobs, build duration trends, re-run button.
> **Why rejected:** Better handled in GitHub's native interface. Too niche for core app.

### Codebase Health Tools
Dependency security checker, license checker, dead code finder, bundle analyzer, duplicate code detector.
> **Why rejected:** Specialized tools exist for each. Not core to Wynter Code's purpose.

### Domain & Infrastructure
SSL/domain tracker, backup status monitor, expiry alerts.
> **Why rejected:** Edge case monitoring. Better handled by dedicated uptime services.

### Focus Mode
Distraction-free coding with hidden panels and Do Not Disturb.
> **Why rejected:** Window management handles this. Meditation mode already provides breaks.

### UptimeRobot Integration
Monitor status, uptime percentage, response time charts, incidents.
> **Why rejected:** Not actively used. Uptime monitoring better in dedicated tools.

### Claude Change Tracker
Track all changes Claude made in a session with diff view and one-click revert.
> **Why rejected:** Git already tracks changes. Redundant with existing version control.

### Import Organizer
Clean up imports in code files - sort alphabetically, group by type, remove unused.
> **Why rejected:** Better handled by ESLint/Prettier plugins. Not worth custom implementation.

### Bulk Rename Tool
Rename multiple files with find/replace and regex support.
> **Why rejected:** Rare use case. Can use terminal or ask Claude when needed.

### Token Usage Dashboard
Track Claude API/CLI usage with graphs and cost estimation.
> **Why rejected:** Claude Max subscription makes this less relevant. Over-engineering for marginal benefit.

### Prompt Templates
Insert saved prompts with variables - create snippets with variables, organize by category, quick insert with keyboard shortcut, import/export template packs.
> **Why rejected:** User decided not to implement.

### Chat Box / Chat Helper
Standalone chat interface for general questions and assistance.
> **Why rejected:** Unnecessary - Claude Code can already help with anything directly in the main interface.

### Code Screenshot Tool
Generate beautiful code screenshots (like Carbon/Ray.so) directly in the app.
> **Why rejected:** Browser tools like Carbon and Ray.so already do this well. Not worth custom implementation.

### Cron Expression Builder
Visual cron job editor with plain English explanations.
> **Why rejected:** Rarely needed. Online tools like crontab.guru handle this perfectly.

### SSH Connection Manager
Save SSH connections, quick connect, file transfer, keep-alive.
> **Why rejected:** Terminal handles SSH fine. Dedicated tools like Termius exist for power users.

### Dependency Update Dashboard
See outdated packages across all projects with changelog previews.
> **Why rejected:** `npm outdated` and Renovate/Dependabot handle this better. Not core to the app.

### Git Worktree Manager
Visual interface for git worktrees to work on multiple branches simultaneously.
> **Why rejected:** Niche power user feature. CLI is straightforward enough for the rare times it's needed.
