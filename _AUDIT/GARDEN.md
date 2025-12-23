# Idea Garden

> Nursery for new ideas and concepts. The pre-plan creative thinking stage.

**Last Updated:** 2025-12-23
**Active Ideas:** 6

---

## How to Use

| Phrase | Action |
|--------|--------|
| `I have an idea for...` | Plant a new idea here |
| `let's plan this idea...` | Graduate idea to _PLANS/ |
| `compost this...` | Reject idea, move to COMPOST |

---

## Ideas

### Services Overwatch Dashboard
Unified dashboard for external services.
- Tabbed interface for categories
- Real-time status indicators
- Sparkline charts for trends
- Credentials in system keychain
- Integrations: Railway, Vercel, Netlify, Plausible, PostHog, Sentry, Supabase, Stripe

### Storybook Viewer
Embedded Storybook preview.
- Detect if Storybook is configured
- Launch Storybook server
- Browse components in mini browser
- Hot reload support

### Database Viewer
PostgreSQL browser for local/remote databases.
- Connect to local/remote databases
- View tables, schemas, relationships
- Run queries with syntax highlighting
- Export to CSV/JSON
- Query history and saved queries

### Multi-Panel Layout
Split view for sessions and terminals.
- Split horizontal/vertical
- Drag sessions/terminals between panels
- Resize panels
- Save layout presets
- Quick toggle between layouts

### Workspaces
Organization layer above projects for switching work contexts.
- Pill button to the left of project tabs with icon badge + name
- Click opens dropdown popup with search and workspace list
- CRUD operations: create, rename, recolor, delete workspaces
- Each workspace contains its own project tabs
- Switching workspace changes visible projects
- Remembers last active project per workspace
- Hierarchy: Workspace -> Projects -> Sessions -> Terminals

---

## Graduated to Plans

| Idea | Plan | Date |
|------|------|------|
| System Health Dashboard | `_PLANS/SYSTEM_HEALTH_DASHBOARD.md` | 2025-12-23 |
| Live Preview Server | `_PLANS/LIVE_PREVIEW_SERVER.md` | 2025-12-23 |

---

## Implemented

| Idea | Implementation | Date |
|------|----------------|------|
| Project Starter Templates | `ProjectTemplatesPopup` - 42 templates, 7 categories, favorites, search | 2025-12-23 |
| Test Runner | `TestRunnerPopup` - detect frameworks, run tests with live terminal output | 2025-12-23 |
| Quick Command Palette | `Ctrl/Cmd+P` - search tools, projects, sessions | 2025-12-23 |
| Environment Variables | `EnvManagerPopup` - visual .env editor | 2025-12-23 |
| Project Switcher | Merged into Command Palette | 2025-12-23 |
| File Compression | Context menu in FileTree + FileBrowser, Settings tab | 2025-12-23 |
| API Testing Tool | `ApiTesterPopup` - HTTP tester with tabs, history, webhooks | 2025-12-22 |
