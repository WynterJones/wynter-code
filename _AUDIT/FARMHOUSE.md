# Farmwork Farmhouse

> Central command for the Farmwork agentic harness.
> Updated automatically by `the-farmer` agent during `/push` or via "open the farm" phrase.

**Last Updated:** 2025-12-31
**Score:** 8/10
**Status:** Active development

---

## Quick Metrics

| Metric | Count |
|--------|-------|
| Commands | 1 |
| Agents | 14 |
| Justfile Recipes | 39 |
| Test Files | 147 |
| Completed Issues | 329 |
| Plans | 7 |
| Audit Docs | 9 |

---

## Codebase Metrics

| Category | Count |
|----------|-------|
| TSX Components | 378 |
| TypeScript Files | 215 |
| Rust Files | 48 |
| Lines of TS/TSX | ~114,100 |
| Lines of Rust | ~79,300 |
| Zustand Stores | 39 |
| Custom Hooks | 16 |
| Services | 15 |
| Dependencies | 42 |
| Dev Dependencies | 11 |

---

## Component Breakdown

| Directory | Components |
|-----------|------------|
| tools | 189 |
| output | 23 |
| files | 21 |
| meditation | 20 |
| panels | 18 |
| ui | 17 |
| settings | 9 |
| layout | 9 |
| git | 9 |
| subscriptions | 8 |
| launcher | 6 |
| prompt | 6 |
| workspaces | 5 |
| onboarding | 5 |
| codespace | 4 |
| session | 4 |
| terminal | 3 |
| modules | 3 |
| claude | 2 |
| project | 2 |
| command-palette | 2 |
| livepreview | 1 |
| context | 1 |
| gemini | 1 |
| codex | 1 |
| provider | 1 |
| docs | 1 |
| ai | 1 |
| model | 1 |

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

**Total Completed Issues:** 329

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-31 | Full metrics audit: 378 TSX, 215 TS, 48 RS files; 147 tests; 329 completed issues; Score 8/10 |
| 2025-12-26 | Full metrics audit: 322 TSX, 168 TS, 69 RS files; 14 agents; 77 completed issues; Score 7.5/10 |
| 2025-12-22 | Initial FARMHOUSE setup via Farmwork CLI |
