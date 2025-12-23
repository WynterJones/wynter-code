# Farmwork Farmhouse

> Central command for the Farmwork agentic harness.
> Updated automatically by `the-farmer` agent during `/push` or via "open the farm" phrase.

**Last Updated:** 2025-12-22
**Score:** 5.0/10
**Status:** Initial setup

---

## Quick Metrics

| Metric | Count |
|--------|-------|
| Commands | 1 |
| Agents | 11 |
| Justfile Recipes | 10 |
| Unit Tests | 0 |
| E2E Tests | 0 |
| Completed Issues | 0 |

---

## How to get 10/10

All Claude Code commands and agents are documented, phrase triggers are tested and working, issue tracking via beads is active, justfile navigation covers all project areas, and the CLAUDE.md instructions are complete and accurate.

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
| `performance-auditor` | Performance anti-patterns |
| `code-smell-auditor` | DRY violations, complexity, naming |
| `accessibility-auditor` | WCAG 2.1 compliance, alt text, contrast |
| `unused-code-cleaner` | Detect and remove dead code |
| `code-cleaner` | Remove comments and console.logs |
| `i18n-locale-translator` | Translate UI text to locales |
| `storybook-maintainer` | Create/update Storybook stories |

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

**Total Completed Issues:** 0

---

## Audit History

| Date | Changes |
|------|---------|
| 2025-12-22 | Initial FARMHOUSE setup via Farmwork CLI |
