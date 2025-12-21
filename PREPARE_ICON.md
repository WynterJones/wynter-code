# Preparing App Icons

This guide shows how to generate all required icon formats from a single PNG file for Tauri.

## Requirements

- macOS (for `sips` and `iconutil` commands)
- ffmpeg (for Windows .ico generation)
- Source PNG: 512x512 or larger, with transparent background

## Quick Start

Place your source icon at `public/icons/new-icon.png`, then run:

```bash
# Generate all icons from new-icon.png
./scripts/prepare-icons.sh public/icons/new-icon.png
```

Or run the commands manually below.

## Manual Commands

### 1. Generate macOS .icns

```bash
# Create iconset directory
mkdir -p src-tauri/icons/icon.iconset

# Generate all required sizes
sips -z 16 16 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_16x16.png
sips -z 32 32 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_16x16@2x.png
sips -z 32 32 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_32x32.png
sips -z 64 64 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_32x32@2x.png
sips -z 128 128 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_128x128.png
sips -z 256 256 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_128x128@2x.png
sips -z 256 256 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_256x256.png
sips -z 512 512 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_256x256@2x.png
sips -z 512 512 public/icons/new-icon.png --out src-tauri/icons/icon.iconset/icon_512x512.png
cp public/icons/new-icon.png src-tauri/icons/icon.iconset/icon_512x512@2x.png

# Convert to .icns
iconutil -c icns src-tauri/icons/icon.iconset -o src-tauri/icons/icon.icns

# Cleanup
rm -rf src-tauri/icons/icon.iconset
```

### 2. Generate Tauri PNG icons

```bash
cp public/icons/new-icon.png src-tauri/icons/icon.png
sips -z 32 32 public/icons/new-icon.png --out src-tauri/icons/32x32.png
sips -z 128 128 public/icons/new-icon.png --out src-tauri/icons/128x128.png
sips -z 256 256 public/icons/new-icon.png --out src-tauri/icons/128x128@2x.png
```

### 3. Generate Windows .ico

```bash
# Create temp files at different sizes
ffmpeg -y -i public/icons/new-icon.png -vf "scale=256:256" /tmp/icon_256.png
ffmpeg -y -i public/icons/new-icon.png -vf "scale=128:128" /tmp/icon_128.png
ffmpeg -y -i public/icons/new-icon.png -vf "scale=64:64" /tmp/icon_64.png
ffmpeg -y -i public/icons/new-icon.png -vf "scale=48:48" /tmp/icon_48.png
ffmpeg -y -i public/icons/new-icon.png -vf "scale=32:32" /tmp/icon_32.png
ffmpeg -y -i public/icons/new-icon.png -vf "scale=16:16" /tmp/icon_16.png

# Combine into .ico
ffmpeg -y -i /tmp/icon_256.png -i /tmp/icon_128.png -i /tmp/icon_64.png \
  -i /tmp/icon_48.png -i /tmp/icon_32.png -i /tmp/icon_16.png \
  src-tauri/icons/icon.ico

# Cleanup
rm -f /tmp/icon_*.png
```

### 4. Update About section icon

```bash
cp public/icons/new-icon.png public/icons/icon1.png
```

## After Updating Icons

Rebuild the app to see the new icon in Dock/Finder:

```bash
pnpm tauri build
```

Note: `pnpm tauri dev` uses the default Tauri icon - you must build to see your custom icon.

## Files Generated

| File | Purpose |
|------|---------|
| `src-tauri/icons/icon.icns` | macOS Dock & Finder |
| `src-tauri/icons/icon.ico` | Windows taskbar & explorer |
| `src-tauri/icons/icon.png` | Linux & fallback |
| `src-tauri/icons/32x32.png` | Small icon |
| `src-tauri/icons/128x128.png` | Medium icon |
| `src-tauri/icons/128x128@2x.png` | Retina medium icon |
| `public/icons/icon1.png` | About section in app |
