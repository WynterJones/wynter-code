# Idea Garden

> Nursery for new ideas and concepts. The pre-plan creative thinking stage.

**Last Updated:** 2025-12-24
**Active Ideas:** 5

---

## How to Use

| Phrase | Action |
|--------|--------|
| `I have an idea for...` | Plant a new idea here |
| `let's plan this idea...` | Graduate idea to _PLANS/ |
| `compost this...` | Reject idea, move to COMPOST |

---

## Ideas

### GIF Screen Section Recorder
**Location:** `ScreenStudioPopup` (new standalone tool)
- Select a region of the screen to record as animated GIF
- Adjustable frame rate and quality settings
- Optional cursor capture and click indicators
- Trim start/end before export
- Copy to clipboard or save to file
- Perfect for bug reports, docs, and quick demos

### Netlify FTP
**Location:** `NetlifyFtpPopup` (new standalone tool)
- FTP-style drag-and-drop interface for Netlify deploys
- Browse local project files on left, Netlify site on right
- One-click manual deploys without CI/CD setup
- Domain management: add custom domains, configure DNS
- Deploy history with rollback support
- Site settings: build commands, environment variables
- Great for quick static site updates and prototypes

### Dead Link Checker
**Location:** `DomainToolsPopup` > SEO category
- Enter URL to crawl and find broken links
- Configurable crawl depth (1-5 levels)
- Check internal and external links
- Reports 404s, 5xx errors, timeouts, redirects
- Export results as CSV
- Highlight anchor text for broken links
- Useful for site audits and SEO cleanup

### Lighthouse Auditor
**Location:** `DomainToolsPopup` > SEO category
- Run Google Lighthouse audits from within the app
- Performance, Accessibility, SEO, Best Practices scores
- Mobile and desktop device emulation
- Detailed metrics: FCP, LCP, CLS, TBT, Speed Index
- Actionable recommendations list
- Historical score tracking per URL
- Export full report as HTML or JSON

### Favicon Grabber
**Location:** `DomainToolsPopup` > Utilities category (or extend `FaviconGeneratorPopup`)
- Enter any URL to extract all favicon variations
- Detect icons from `<link>` tags, manifest.json, apple-touch-icon
- Preview all sizes found (16x16 to 512x512)
- Download individual icons or all as ZIP
- Show source paths for each icon
- Useful for competitive research or rebuilding assets

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
