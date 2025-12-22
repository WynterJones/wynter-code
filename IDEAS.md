# Wynter Code - Feature Ideas

A collection of feature ideas organized by where they live in the UI.

---

## Completed

*Features that have been implemented.*

### Enhanced Project Tabs ✓
- Custom icon picker from Lucide library (120+ icons with search)
- Compact tab mode toggle in Settings > General
- Dim inactive projects toggle in Settings > General
- Right-click context menu for icon and color selection
- Drag to reorder tabs using @dnd-kit
- Project icon and color persist across sessions

### Tools Dropdown + Port Manager ✓
- Tools dropdown menu in header bar (wrench icon)
- Port Manager tool showing all listening localhost ports
- Process name, PID, port number, and protocol display
- Kill process button to stop services
- Open in browser button for quick access
- Auto-refresh and manual refresh options
- Process icons based on runtime (Node, Python, Ruby, etc.)

### Node Modules Cleaner ✓
- Opens a popup to clean up node_modules folders
- User picks folder to scan (folder picker dialog)
- Shows path, size, last modified, project name
- Delete individually or batch select
- Total disk space recovery indicator
- Confirmation before deletion
- Excludes system paths for safety

---

## Project Tab Bar

*Improvements to the project tabs at the top of the app.*

---

## Header Tools Dropdown

*Tools accessible from a dropdown menu in the main header (next to subscriptions button).*

### Color Picker
**Priority:** Medium

Eyedropper tool for picking colors anywhere on screen:
- Copy as HEX, RGB, HSL, Tailwind class
- Recent colors history
- Color palette saver
- Also accessible via keyboard shortcut

### Localhost Tunnel

Quick public URL using Cloudflared:
- One-click to create tunnel (free, no signup)
- QR code for mobile testing
- Copy shareable URL
- Auto-reconnect on disconnect

### API Testing Tool

Lightweight Postman-like interface:
- Make HTTP requests (GET, POST, PUT, DELETE)
- Save request collections per project
- Response syntax highlighting
- Environment variables for URLs/tokens
- cURL export

### System Health Dashboard

Mini dashboard for installed tools:
- Node.js, npm/pnpm/yarn versions
- Git version
- Claude CLI version and auth status
- Rust/Cargo for Tauri
- Quick install buttons for missing tools

---

## Header Icon Buttons

*Icon buttons in header row (like the meditation icon button).*

### Project Starter Templates
**Icon:** FolderPlus or Rocket

Generate new projects from templates:
- Chrome Extension, Next.js, Rails, Express, Tauri, Electron, React+Vite, CLI Tool
- Custom template creation from existing projects
- Variables in templates (project name, author)
- One-click scaffold in chosen directory

### Live Preview Server
**Icon:** Eye or Play

Quick preview for web projects:
- Detect index.html or framework
- One-click to start preview server
- Hot reload
- QR code for mobile testing

### Services Overwatch Dashboard
**Icon:** Activity or BarChart

Unified dashboard for external services:
- Tabbed interface for categories
- Real-time status indicators
- Sparkline charts for trends
- Credentials in system keychain

**Integrations:**
- **Hosting:** Railway, Vercel, Netlify
- **Analytics:** Plausible, PostHog
- **Errors:** Sentry
- **Database:** Supabase
- **Payments:** Stripe

---

## Right-Click Context Menu

*Actions available when right-clicking files/folders in the file browser.*

### File Compression
**Priority:** Medium

Compress files without losing quality:
- Images: lossless PNG, JPEG optimization
- Videos: smart compression
- PDFs: reduce file size
- Before/after size comparison
- Replace original or save as new

---

## Sidebar Hamburger Menu

*Tools accessible from a hamburger menu dropdown in the sidebar header.*

### Test Runner

Run and view tests visually:
- Support Jest, Vitest, RSpec, Mocha
- Pass/fail status in real-time
- Coverage report visualization
- Re-run failed tests only
- Watch mode toggle

### Storybook Viewer

Embedded Storybook preview:
- Detect if Storybook is configured
- Launch Storybook server
- Browse components in mini browser
- Hot reload support

### Database Viewer

PostgreSQL browser:
- Connect to local/remote databases
- View tables, schemas, relationships
- Run queries with syntax highlighting
- Export to CSV/JSON
- Query history and saved queries

### Environment Variables

Manage .env files:
- View/edit .env, .env.local, .env.production
- Compare differences between env files
- Mark sensitive values (hidden by default)
- Never commit warnings for secrets

---

## Keyboard Shortcuts

*Features triggered only by keyboard shortcuts.*

### Quick Command Palette
**Shortcut:** Cmd+Shift+P

Global command launcher:
- Search across all app features
- Recent commands
- Custom command aliases
- Chain multiple commands

### Project Switcher
**Shortcut:** Cmd+O

Fast project switching:
- Recent projects list
- Fuzzy search by name
- Preview project info
- Open in new window option

---

## Claude Input Area

*Features near or integrated with the prompt input.*

### Prompt Templates

Insert saved prompts (button near input field):
- Create snippets with variables (e.g., `Fix the bug in {{file}}`)
- Organize by category (refactor, debug, explain, generate)
- Quick insert with keyboard shortcut
- Import/export template packs

*Template management lives in Settings.*

---

## Main Layout

*Core layout features affecting the entire window.*

### Multi-Panel Layout
**Priority:** High

Split view for sessions and terminals:
- Split horizontal/vertical
- Drag sessions/terminals between panels
- Resize panels
- Save layout presets
- Quick toggle between layouts (View menu or keyboard shortcut)

---

## API Reference Links

| Service | API Docs | Auth |
|---------|----------|------|
| Railway | [docs.railway.com/guides/public-api](https://docs.railway.com/guides/public-api) | API Token |
| Vercel | [vercel.com/docs/rest-api](https://vercel.com/docs/rest-api) | Bearer Token |
| Netlify | [open-api.netlify.com](https://open-api.netlify.com/) | OAuth2 / PAT |
| Plausible | [plausible.io/docs/stats-api](https://plausible.io/docs/stats-api) | API Key |
| Sentry | [docs.sentry.io/api](https://docs.sentry.io/api/) | Auth Token |
| Supabase | [supabase.com/docs/guides/telemetry/metrics](https://supabase.com/docs/guides/telemetry/metrics) | Service Role JWT |
| Stripe | [docs.stripe.com/api](https://docs.stripe.com/api) | API Key |

---

## Implementation Notes

**Quick Wins (Low Effort, High Value):**
- ~~Enhanced Project Tabs (UI tweaks + Lucide picker)~~ ✓
- ~~Port Manager (uses lsof/netstat)~~ ✓
- System Health Dashboard (version checks) ← **NEXT**
- Prompt Templates (JSON storage + UI)

**Medium Effort:**
- ~~Node Modules Cleaner (directory traversal + UI)~~ ✓
- Test Runner Integration (process spawning + parsing)
- Color Picker (system APIs)
- Multi-Panel Layout (layout refactor)
- Project Starter Templates (file copying + variable substitution)
- Live Preview Server (spawn local server)

**Higher Effort:**
- API Testing Tool (full HTTP client)
- PostgreSQL Viewer (connection handling + query engine)
- Localhost Tunnel (Cloudflared CLI integration)
- Services Overwatch Dashboard (multiple API integrations)

---

## Notes

- All features should maintain the app's dark theme (Catppuccin Mocha)
- Prioritize features that reduce context-switching for solo developers
- Keep tools lightweight - this isn't trying to replace dedicated tools
- Consider keyboard shortcuts for frequently used features
- Features should work offline where possible

---

## Graveyard

*Ideas that were considered but rejected.*

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
