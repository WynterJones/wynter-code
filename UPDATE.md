# Releasing Updates

## Quick Release

```bash
./release.sh patch
```

Options:
- `patch` - 1.0.0 → 1.0.1 (bug fixes)
- `minor` - 1.0.0 → 1.1.0 (new features)
- `major` - 1.0.0 → 2.0.0 (breaking changes)

## After Build Completes

1. Commit and tag:
   ```bash
   git add -A
   git commit -m "v1.0.1 release"
   git tag v1.0.1
   git push origin main --tags
   ```

2. Go to [GitHub Releases](https://github.com/WynterJones/wynter-code/releases/new)

3. Upload the two files the script created:
   - `Wynter.Code_x.x.x_aarch64.dmg`
   - `latest.json`

4. Publish release

## Required Environment Variables

Add to `~/.zshrc`:
```bash
export APPLE_ID="your-email"
export APPLE_PASSWORD="your-app-specific-password"
export APPLE_TEAM_ID="7X2UF4FZHC"
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/wynter-code.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-password"
```
