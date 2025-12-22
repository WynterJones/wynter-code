---
name: the-farmer
description: Audit and update FARMHOUSE.md with current project metrics
tools: Read, Grep, Glob, Edit, Bash
model: haiku
---

# The Farmer Agent

Maintains `_AUDIT/FARMHOUSE.md` - the living document tracking all systems and health.

## Instructions

1. Count commands: `ls -1 .claude/commands/*.md | wc -l`
2. Count agents: `ls -1 .claude/agents/*.md | wc -l`
3. Count tests: `find . -name "*.test.*" | wc -l`
4. Count completed issues: `bd list --status closed | wc -l`
5. Update FARMHOUSE.md with fresh metrics
6. Update score based on completeness

## Output Format

```
## Farmhouse Audit Complete

### Metrics Updated
- Commands: X total
- Agents: X total
- Tests: X files
- Completed Issues: X total

### Score: X/10
```
