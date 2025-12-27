# Idea Garden

> Nursery for new ideas and concepts. The pre-plan creative thinking stage.

**Last Updated:** 2025-12-26
**Active Ideas:** 3

---

## How to Use

| Phrase | Action |
|--------|--------|
| `I have an idea for...` | Plant a new idea here |
| `let's plan this idea...` | Graduate idea to _PLANS/ |
| `compost this...` | Reject idea, move to COMPOST |

---

## Ideas

### Homebrew Manager
**Location:** New tool popup
A tool to view, manage, and search for Homebrew packages.
- View all installed Homebrew packages
- Search for new packages from Homebrew registry
- Install/uninstall packages with one click
- View package details (description, version, dependencies)
- Update outdated packages
- Manage casks (GUI applications) alongside formulae

### System Cleaner
**Location:** New tool popup
A CleanMyMac-style tool to find and remove large files, temp files, and system junk to free up disk space.
- Scan for large files and folders across the system
- Find and clean temporary files and caches
- Identify old downloads and unused applications
- Clean browser caches and data
- Remove system logs and crash reports
- Show disk usage visualization
- Safe deletion with trash/restore option
- Exclude list for protected paths

### Claude Code Limits Dashboard
**Location:** Enhancement to Claude Code Stats
Enhance the Claude Code Stats feature to display usage limits and progress bars for the daily 5-hour sliding window and weekly usage caps.
- Show daily 5-hour sliding window usage with progress bar
- Display weekly usage limit with progress bar
- Visual indicators when approaching limits (warning/yellow and critical/red thresholds)
- Show time remaining until limit resets
- Historical usage graph over time
- Notification when nearing capacity
- Color-coded status (green/yellow/red based on usage level)

---

## Graduated to Plans

| Idea | Plan | Date |
|------|------|------|
| Multi-Model Support | `_PLANS/MULTI_MODEL_SUPPORT.md` | 2025-12-23 |
| Farmwork Tycoon | `_PLANS/PIXIJS_GAME_MODE.md` | 2025-12-23 |
| Auto Build | `_PLANS/AUTO_BUILD.md` | 2025-12-26 |

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
| Project Search | `ProjectSearchPopup` - Project-wide file search with context chunks, regex/case-sensitive/whole-word modes, find & replace, click to open file at line, keyboard navigation | 2025-12-24 |
| Just Command Manager | `JustCommandManagerPopup` - Manage justfile recipes, detect justfile presence, run recipes with embedded terminal, favorites/recents, visual editor to add/edit recipes, help tab with quick reference | 2025-12-25 |
| Raycast-Style Launcher | System-level popup launcher with global hotkey, Google/file/feature search, keyboard navigation | 2025-12-26 |
| Encrypted Web Backup | Netlify-hosted encrypted backup with black lock design, password decryption, data import/export | 2025-12-26 |
