---
description: Clean, stage, lint, test, build, commit, push, and update metrics
argument-hint: [optional: commit message override]
allowed-tools: Bash(find:*), Bash(git:*), Bash(npm:*), Bash(npx:*), Task
---

# Push Command

Run code cleanup, all quality gates, commit changes, and push to remote.

## Workflow

Execute these steps in order. **Stop immediately if any step fails.**

### Step 1: Clean Up System Files
Remove any .DS_Store files from the repository:
```bash
find . -name '.DS_Store' -type f -delete
```

### Step 2: Sync Packages
Clean and reinstall node_modules to ensure package-lock.json stays in sync:
```bash
rm -rf node_modules && npm install
```
This prevents `npm ci` failures in CI/CD due to lock file drift.

If package-lock.json was modified, it will be staged in the next step.

### Step 3: Stage All Changes
```bash
git add -A
```

### Step 4: Check for Changes
Run `git status` to verify there are staged changes. If nothing to commit, inform the user and stop.

### Step 5: Clean Code

Run the code-cleaner agent on staged TypeScript files to remove comments and console.logs.

This removes:
- Line comments (`//`) and block comments (`/* */`)
- `console.log` statements

It preserves:
- JSDoc comments (`/** */`)
- `console.error`, `console.warn`, `console.info`

After cleaning, re-stage the modified files:
```bash
git add -A
```

### Step 6: Run Quality Gates (in order)

Run each check. If any fails, stop and report which check failed:

1. **Lint**: `npm run lint`
2. **Unit Tests**: `npm run test`
3. **Build**: `npm run build`

### Step 7: Generate Commit Message

If `$ARGUMENTS` is provided, use it as the commit message.

Otherwise, analyze the staged changes:
1. Run `git diff --cached --stat` to see changed files
2. Run `git diff --cached` to see actual changes
3. Run `git log -5 --oneline` to match the repository's commit style
4. Generate a concise, descriptive commit message that:
   - Starts with a type (feat, fix, refactor, docs, style, test, chore)
   - Summarizes the "why" not the "what"
   - Is 1-2 sentences maximum

### Step 8: Commit and Push

Create the commit with the message, including the standard footer:

```
🌽 Generated with FARMWORK
```

Then push to remote:
```bash
git push
```

### Step 10: Update Farmhouse Metrics

Run the-farmer agent to update `_AUDIT/FARMHOUSE.md` with current metrics:
- Commands and agents inventory
- Test counts (unit, e2e)
- Completed issues count

This keeps the harness documentation in sync with the codebase.

### Step 11: Report Success

Show a summary:
- Files changed
- Commit hash
- Push status
- Harness metrics updated
