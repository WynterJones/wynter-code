# Mac Release Launch Plan

A step-by-step guide to release Wynter Code for macOS with code signing, notarization, and auto-updates via GitHub releases.

---

## Current Status

| Item | Status | Notes |
|------|--------|-------|
| Tauri updater plugin | ✅ Ready | Installed and initialized |
| Bundle identifier | ✅ Ready | `com.wyntercode.app` |
| App icons (.icns) | ✅ Ready | All formats present |
| Version management | ✅ Ready | Scripts sync all files |
| GitHub Actions workflow | ⚠️ Partial | Builds all platforms, needs Mac-only |
| Apple signing secrets | ❌ Missing | Not configured in GitHub |
| Notarization setup | ❌ Missing | Not configured |
| Tauri update signing key | ❌ Missing | pubkey field empty |
| macOS bundle config | ❌ Missing | No signing identity set |

---

## Phase 1: Apple Developer Setup

### 1.1 Prerequisites
- [ ] Apple Developer Program membership ($99/year)
- [ ] Xcode installed (for codesign tools)

### 1.2 Create Developer ID Certificate
1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click "+" to create new certificate
3. Select **"Developer ID Application"** (for distribution outside App Store)
4. Follow CSR generation steps using Keychain Access
5. Download and install the certificate

### 1.3 Export Certificate as .p12
```bash
# Open Keychain Access
# Find your "Developer ID Application: Your Name (TEAM_ID)" certificate
# Right-click → Export
# Save as .p12 with a strong password
# Keep this password - you'll need it for GitHub secrets
```

### 1.4 Get Your Team ID
```bash
# Your Team ID is the 10-character code in parentheses
# Example: "Developer ID Application: John Doe (ABC123XYZ0)"
# Team ID = ABC123XYZ0
```

### 1.5 Create App-Specific Password
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign In → Security → App-Specific Passwords
3. Generate new password, label it "Wynter Code Notarization"
4. Save this password securely

---

## Phase 2: Tauri Update Signing Key

### 2.1 Generate Signing Keypair
```bash
cd /Users/wynterjones/Work/SYSTEM/wynter-code

# Generate the keypair (will prompt for password)
pnpm tauri signer generate -w ~/.tauri/wynter-code.key
```

This creates:
- Private key: `~/.tauri/wynter-code.key`
- Public key: Printed to console (save this!)

### 2.2 Save the Public Key
- [ ] Copy the public key output
- [ ] You'll add this to `tauri.conf.json` in Phase 4

---

## Phase 3: GitHub Secrets Configuration

Go to: **Repository → Settings → Secrets and variables → Actions**

### 3.1 Apple Signing Secrets
| Secret Name | Value |
|-------------|-------|
| `APPLE_CERTIFICATE` | Base64 of your .p12 file (see below) |
| `APPLE_CERTIFICATE_PASSWORD` | Password you set when exporting .p12 |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Your Name (TEAM_ID)` |
| `APPLE_ID` | Your Apple Developer email |
| `APPLE_PASSWORD` | App-specific password from Phase 1.5 |
| `APPLE_TEAM_ID` | Your 10-character Team ID |

### 3.2 Tauri Signing Secrets
| Secret Name | Value |
|-------------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Contents of `~/.tauri/wynter-code.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password you set in Phase 2.1 |

### 3.3 Base64 Encode Your Certificate
```bash
# On macOS
base64 -i ~/path/to/your-certificate.p12 | pbcopy
# Now paste into APPLE_CERTIFICATE secret
```

---

## Phase 4: Configuration Updates

### 4.1 Update tauri.conf.json

Add the public key from Phase 2.1 to the updater config:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/WynterJones/wynter-code/releases/latest/download/latest.json"
      ],
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 4.2 Add macOS Signing Config

Add to `tauri.conf.json` under the `bundle` section:

```json
{
  "bundle": {
    "targets": ["dmg", "app"],
    "macOS": {
      "minimumSystemVersion": "10.15",
      "signingIdentity": "-",
      "entitlements": null
    }
  }
}
```

Note: `signingIdentity: "-"` means use environment variable `APPLE_SIGNING_IDENTITY`

---

## Phase 5: Update GitHub Actions

### 5.1 Modify .github/workflows/release.yml

Replace the build matrix with Mac-only:

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - platform: 'macos-latest'
        args: '--target aarch64-apple-darwin'
      - platform: 'macos-latest'
        args: '--target x86_64-apple-darwin'
```

### 5.2 Remove Windows/Linux Jobs
- [ ] Delete the `windows-latest` matrix entry
- [ ] Delete the `ubuntu-22.04` matrix entry
- [ ] Update `latest.json` generation to only include darwin platforms

### 5.3 Add Notarization Step (after build)

The workflow already has Apple environment variables. Tauri 2.0 handles notarization automatically when these are set:
- `APPLE_ID`
- `APPLE_PASSWORD`
- `APPLE_TEAM_ID`
- `APPLE_SIGNING_IDENTITY`

---

## Phase 6: Local Testing

### 6.1 Test Signing Locally
```bash
# Set environment variables
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAM_ID)"

# Build for your architecture
pnpm tauri build --target aarch64-apple-darwin

# Check if signed
codesign -dv --verbose=4 src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Wynter\ Code.app
```

### 6.2 Test Notarization Locally
```bash
# Set all Apple env vars
export APPLE_ID="your@email.com"
export APPLE_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="ABC123XYZ0"
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (ABC123XYZ0)"

# Build (Tauri handles notarization)
pnpm tauri build
```

### 6.3 Verify Notarization
```bash
spctl -a -vvv -t install src-tauri/target/release/bundle/dmg/Wynter\ Code_1.0.0_aarch64.dmg
# Should say: "source=Notarized Developer ID"
```

---

## Phase 7: First Release

### 7.1 Bump Version
```bash
pnpm version:patch  # 1.0.0 → 1.0.1
# or
pnpm version:minor  # 1.0.0 → 1.1.0
```

### 7.2 Commit and Tag
```bash
git add -A
git commit -m "Prepare v1.0.1 release"
git tag v1.0.1
git push origin main --tags
```

### 7.3 Monitor Release
1. Go to Actions tab in GitHub
2. Watch the release workflow run
3. Check Releases page for uploaded assets:
   - `Wynter.Code_x.x.x_aarch64.dmg`
   - `Wynter.Code_x.x.x_x64.dmg`
   - `latest.json`

---

## Phase 8: Verify Auto-Updates

### 8.1 Test Update Flow
1. Install the released version
2. Make another release with `pnpm version:patch`
3. Open the installed app
4. App should detect and prompt for update

### 8.2 Update Check Endpoint
Your app checks: `https://github.com/WynterJones/wynter-code/releases/latest/download/latest.json`

This file contains:
```json
{
  "version": "1.0.1",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/.../Wynter.Code_1.0.1_aarch64.dmg",
      "signature": "..."
    },
    "darwin-x86_64": {
      "url": "https://github.com/.../Wynter.Code_1.0.1_x64.dmg",
      "signature": "..."
    }
  }
}
```

---

## Troubleshooting

### Signing Fails
```bash
# List available identities
security find-identity -v -p codesigning

# Verify certificate is valid
security find-certificate -c "Developer ID Application" -p | openssl x509 -noout -dates
```

### Notarization Fails
```bash
# Check notarization status
xcrun notarytool history --apple-id YOUR_ID --password YOUR_APP_PASSWORD --team-id YOUR_TEAM

# Get detailed log for failed submission
xcrun notarytool log SUBMISSION_ID --apple-id YOUR_ID --password YOUR_APP_PASSWORD --team-id YOUR_TEAM
```

### Common Issues
| Issue | Solution |
|-------|----------|
| "Developer ID not found" | Certificate not installed or wrong identity name |
| "App damaged" on open | Notarization failed - check logs |
| "Invalid signature" on update | Wrong public key in tauri.conf.json |
| Update not detected | Check latest.json URL is accessible |

---

## Quick Reference

### Required GitHub Secrets (8 total)
1. `APPLE_CERTIFICATE`
2. `APPLE_CERTIFICATE_PASSWORD`
3. `APPLE_SIGNING_IDENTITY`
4. `APPLE_ID`
5. `APPLE_PASSWORD`
6. `APPLE_TEAM_ID`
7. `TAURI_SIGNING_PRIVATE_KEY`
8. `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

### Release Checklist
- [ ] All GitHub secrets configured
- [ ] Public key added to tauri.conf.json
- [ ] GitHub Actions workflow updated for Mac-only
- [ ] Local build test passed
- [ ] Local signing test passed
- [ ] Version bumped
- [ ] Git tagged and pushed
- [ ] Release assets uploaded
- [ ] DMG installs correctly
- [ ] Auto-update works

---

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `src-tauri/tauri.conf.json` | Add pubkey, macOS config |
| `.github/workflows/release.yml` | Remove Windows/Linux, Mac-only |
| GitHub Secrets | Add all 8 secrets |
