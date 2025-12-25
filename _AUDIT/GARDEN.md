# Idea Garden

> Nursery for new ideas and concepts. The pre-plan creative thinking stage.

**Last Updated:** 2025-12-24
**Active Ideas:** 2

---

## How to Use

| Phrase | Action |
|--------|--------|
| `I have an idea for...` | Plant a new idea here |
| `let's plan this idea...` | Graduate idea to _PLANS/ |
| `compost this...` | Reject idea, move to COMPOST |

---

## Ideas

### Project Search
**Location:** `ProjectSearchPopup` (new standalone tool)
A project-wide file search feature inspired by Zed editor's project search, allowing users to search across all files in the current project with results displayed in contextual chunks.
- Search across all files in the current project
- Results displayed in 5-line context chunks (showing surrounding lines)
- Click/jump to file functionality from search results
- Inspired by Zed editor's project search UX
- Clean, scannable results view
- Follow existing UI patterns (OverlayScrollbars, no emojis, proper icons)

### Auto Build
**Location:** New session tab type
A new session tab type featuring a Kanban board for automated feature development. Issues/tickets flow through the pipeline automatically via an auto-prompt process that builds features hands-free.
- New session tab type (alongside existing tab types)
- Kanban board with 4 columns: Backlog, In Progress, QA, Completed
- Auto-prompt system that automatically works through tickets
- Moves issues from Backlog -> In Progress -> QA -> Completed
- Automated feature building workflow
- Real-time Kanban updates as work progresses
- Hands-free development pipeline
- Follow existing UI patterns (OverlayScrollbars, no emojis, proper icons)

---

## Graduated to Plans

| Idea | Plan | Date |
|------|------|------|
| Multi-Model Support | `_PLANS/MULTI_MODEL_SUPPORT.md` | 2025-12-23 |
| Farmwork Tycoon | `_PLANS/PIXIJS_GAME_MODE.md` | 2025-12-23 |

---

## Implemented

| Idea | Implementation | Date |
|------|----------------|------|
| MCP Manager Tool | `McpManagerPopup` - View/manage MCP servers, toggle, create, edit configs | 2025-12-23 |
| Dev Toolkit | `DevToolkitPopup` - JSON formatter, Base64, JWT debugger, UUID generator, hash generator, regex tester | 2025-12-23 |
| Multi-Panel Layout | Split view with horizontal/vertical splits, drag sessions between panels, resize, layout presets | 2025-12-23 |
| Radio Streaming | Meditation player with Nightride.fm stations + Radio Browser API search, favorites, stream metadata | 2025-12-23 |
| Beads Issue Tracker | `bd` CLI + UI tabs - local SQLite issue tracking with epics, kanban board, dependencies | 2025-12-23 |
| Services Overwatch | `OverwatchPopup` - Railway, Plausible, Netlify, Sentry monitoring cards | 2025-12-23 |
| System Health | `SystemHealthPopup` - dev tools and system resources dashboard | 2025-12-23 |
| Live Preview | `LivePreviewPopup` - embedded browser preview with dev server management | 2025-12-23 |
| Project Starter Templates | `ProjectTemplatesPopup` - 42 templates, 7 categories, favorites, search | 2025-12-23 |
| Test Runner | `TestRunnerPopup` - detect frameworks, run tests with live terminal output | 2025-12-23 |
| Quick Command Palette | `Ctrl/Cmd+P` - search tools, projects, sessions | 2025-12-23 |
| Environment Variables | `EnvManagerPopup` - visual .env editor | 2025-12-23 |
| Project Switcher | Merged into Command Palette | 2025-12-23 |
| File Compression | Context menu in FileTree + FileBrowser, Settings tab | 2025-12-23 |
| API Testing Tool | `ApiTesterPopup` - HTTP tester with tabs, history, webhooks | 2025-12-22 |
| Workspaces | `WorkspaceSelectorPopup` - workspace layer above projects with custom avatars, icon/image/shape | 2025-12-23 |
| Storybook Viewer | `StorybookViewerPopup` - detect Storybook, launch dev server, embedded iframe preview | 2025-12-23 |
| Background Services Viewer | `BackgroundServicesPopup` - view and kill developer services (Redis, Postgres, Node, etc.) | 2025-12-23 |
| Database Viewer | `DatabaseViewerPopup` - SQLite + PostgreSQL + MySQL browser with CRUD, SQL runner, detects running services | 2025-12-23 |
| Favicon Generator | `FaviconGeneratorPopup` - upload image, generate all favicon sizes, preview grid, ZIP download, copy HTML tags | 2025-12-23 |
| Claude Code Stats | `ClaudeCodeStatsPopup` - 16 stat cards (messages, sessions, tool calls, streak, peak hour, cache hits, etc.), daily activity charts, model usage breakdown, hourly heatmap | 2025-12-23 |
| Dev Toolkit Expansion | `DevToolkitPopup` - expanded to 28 tools: Bcrypt, HMAC, HTTP Status Reference, IP Address, Byte Size, Cron Parser, Number Base, User Agent Parser, Lorem Ipsum, Case Converter, String Escape, Slug Generator, Word Counter, Timestamp Converter, JSON/YAML, CSV/JSON, Regex Tester, Password Generator | 2025-12-24 |
| Domain & SEO Tools | `DomainToolsPopup` - 8 tools: WHOIS Lookup, Domain Availability, DNS Lookup, DNS Propagation, SSL Certificate, HTTP Headers, IP Geolocation, Redirect Tracker | 2025-12-24 |
| Floating Webcam | `WebcamToolPopup` - floating webcam overlay with desktop pinning, customizable borders/effects/shadows, crop selection, Decart AI integration for real-time effects | 2025-12-24 |
| List Sorter & Deduplicator | `DevToolkitPopup` > Text category - Sort arrays alphabetically/numerically/by length, remove duplicates, case-sensitive options, natural sort, copy results | 2025-12-24 |
| HTML/CSS Validator | `DevToolkitPopup` > Code category - Validate HTML/CSS with error detection, deprecated tag/property warnings, accessibility hints, format/beautify | 2025-12-24 |
| EXIF Data Remover | `DevToolkitPopup` > Image category - Strip EXIF metadata from images, batch processing, preview before/after, download individually or as ZIP | 2025-12-24 |
| Placeholder Image Generator | `DevToolkitPopup` > Generators category - Generate placeholder images with custom dimensions, color picker, multiple formats (PNG/JPG/SVG/WebP), preset sizes, data URI support | 2025-12-24 |
| Searchable Sidebar | `SearchableToolSidebar` - Reusable search component for DevKit, Domain Tools, and SEO Tools with real-time filtering | 2025-12-24 |
| Dead Link Checker | `DomainToolsPopup` > SEO category - Crawl website to find broken links, configurable depth (1-5 levels), check internal/external links, reports 404s/5xx/timeouts/redirects, export CSV, highlight anchor text | 2025-12-24 |
| Lighthouse Auditor | `DomainToolsPopup` > SEO category - Run Google Lighthouse audits via Pagespeed API, Performance/Accessibility/SEO/Best Practices scores, mobile/desktop emulation, Core Web Vitals metrics (FCP, LCP, CLS, TBT, Speed Index), recommendations, export HTML/JSON | 2025-12-24 |
| Favicon Grabber | `DomainToolsPopup` > Utilities category - Extract favicons from any URL, detect from `<link>` tags/manifest.json/common paths, preview grid (16x16 to 512x512), download individual or ZIP, show source paths | 2025-12-24 |
| GIF Screen Recorder | `GifRecorderPopup` - Select screen region to record as animated GIF, adjustable frame rate/quality, cursor capture, click indicators, copy to clipboard or save | 2025-12-24 |
| Netlify FTP | `NetlifyFtpPopup` - FTP-style drag-and-drop Netlify deploys, browse local files vs site, one-click deploys, domain management, deploy history with rollback | 2025-12-24 |
| Bookmarks | `BookmarksPopup` - Save and organize sites/web apps/services, category folders, icon gallery vs list view, favicon display, AI apps tracking | 2025-12-24 |
