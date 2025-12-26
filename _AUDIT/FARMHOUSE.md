# Farmwork Farmhouse

> Central command for the Farmwork agentic harness.
> Updated automatically by `the-farmer` agent during `/push` or via "open the farm" phrase.

**Last Updated:** 2025-12-26
**Score:** 7.5/10
**Status:** Active development

---

## Quick Metrics

| Metric | Count |
|--------|-------|
| Commands | 1 |
| Agents | 14 |
| Justfile Recipes | 37 |
| Test Files | 90 |
| Completed Issues | 77 |
| Plans | 3 |
| Audit Docs | 8 |

---

## Codebase Metrics

| Category | Count |
|----------|-------|
| TSX Components | 322 |
| TypeScript Files | 168 |
| Rust Files | 69 |
| Lines of TS/TSX | ~87,500 |
| Lines of Rust | ~10,700 |
| Zustand Stores | 30 |
| Custom Hooks | 13 |
| Services | 9 |
| Dependencies | 44 |
| Dev Dependencies | 13 |

---

## Component Breakdown

| Directory | Components |
|-----------|------------|
| tools | 174 |
| meditation | 20 |
| files | 19 |
| ui | 14 |
| panels | 14 |
| output | 13 |
| git | 9 |
| subscriptions | 8 |
| settings | 7 |
| layout | 6 |
| prompt | 6 |
| onboarding | 5 |
| workspaces | 5 |
| colorpicker | 3 |
| modules | 3 |
| terminal | 3 |
| claude | 2 |
| command-palette | 2 |
| project | 2 |
| docs | 1 |
| livepreview | 1 |
| model | 1 |
| session | 1 |

---

## How to get 10/10

All Claude Code commands and agents are documented, phrase triggers are tested and working, issue tracking via beads is active, justfile navigation covers all project areas, and the CLAUDE.md instructions are complete and accurate.

**Current gaps:**
- Only 1 command (need more workflow commands)
- Unit tests exist but need better coverage
- Could use more E2E tests

---

## Commands (`.claude/commands/`)

| Command | Description |
|---------|-------------|
| `/push` | Clean, lint, test, build, commit, push, update metrics |

---

## Agents (`.claude/agents/`)

| Agent | Purpose |
|-------|---------|
| `the-farmer` | Audit and update FARMHOUSE.md metrics |
| `idea-gardener` | Manage Idea Garden and Compost lifecycle |
| `code-reviewer` | Quality & security code review |
| `security-auditor` | OWASP vulnerability scanning |
| `tauri-security-auditor` | IPC/capability security for Tauri |
| `rust-code-auditor` | Error handling/panics in Rust code |
| `performance-auditor` | Performance anti-patterns |
| `code-smell-auditor` | DRY violations, complexity, naming |
| `accessibility-auditor` | WCAG 2.1 compliance, alt text, contrast |
| `unused-code-cleaner` | Detect and remove dead code |
| `code-cleaner` | Remove comments and console.logs |
| `i18n-locale-translator` | Translate UI text to locales |
| `storybook-maintainer` | Create/update Storybook stories |
| `test-scaffolder` | Create test scaffolding for components |

---

## Phrase Commands

### Farmwork Phrases

| Phrase | Action |
|--------|--------|
| `open the farm` | Audit systems, update FARMHOUSE.md |
| `count the herd` | Full inspection + dry run (no push) |
| `go to market` | i18n scan + accessibility audit |
| `close the farm` | Execute /push |

### Plan Phrases

| Phrase | Action |
|--------|--------|
| `make a plan for...` | Create plan in _PLANS/ |
| `let's implement...` | Load plan, create Epic |

### Idea Phrases

| Phrase | Action |
|--------|--------|
| `I have an idea for...` | Plant idea in GARDEN.md |
| `let's plan this idea...` | Graduate idea to _PLANS/ |
| `compost this...` | Reject idea to COMPOST.md |

---

## Issue Tracking (`.beads/`)

Using `bd` CLI for issue management:

```bash
bd ready              # Find available work
bd create "..." -t task -p 2  # Create issue
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
```

---

## Beads Issue History

**Total Completed Issues:** 77

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-26 | Full metrics audit: 322 TSX, 168 TS, 69 RS files; 14 agents; 77 completed issues; Score 7.5/10 |
| 2025-12-22 | Initial FARMHOUSE setup via Farmwork CLI |
