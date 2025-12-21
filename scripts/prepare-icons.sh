#!/bin/bash

# Prepare all icon formats from a single PNG file
# Usage: ./scripts/prepare-icons.sh path/to/icon.png

set -e

SOURCE_ICON="${1:-public/icons/new-icon.png}"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon not found: $SOURCE_ICON"
    echo "Usage: ./scripts/prepare-icons.sh path/to/icon.png"
    exit 1
fi

echo "Generating icons from: $SOURCE_ICON"
echo ""

# Create iconset directory
mkdir -p src-tauri/icons/icon.iconset

# Generate macOS iconset sizes
echo "Creating macOS .icns..."
sips -z 16 16 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_16x16.png 2>/dev/null
sips -z 32 32 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_16x16@2x.png 2>/dev/null
sips -z 32 32 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_32x32.png 2>/dev/null
sips -z 64 64 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_32x32@2x.png 2>/dev/null
sips -z 128 128 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_128x128.png 2>/dev/null
sips -z 256 256 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_128x128@2x.png 2>/dev/null
sips -z 256 256 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_256x256.png 2>/dev/null
sips -z 512 512 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_256x256@2x.png 2>/dev/null
sips -z 512 512 "$SOURCE_ICON" --out src-tauri/icons/icon.iconset/icon_512x512.png 2>/dev/null
cp "$SOURCE_ICON" src-tauri/icons/icon.iconset/icon_512x512@2x.png

iconutil -c icns src-tauri/icons/icon.iconset -o src-tauri/icons/icon.icns
rm -rf src-tauri/icons/icon.iconset
echo "  ✓ icon.icns"

# Generate Tauri PNG icons
echo "Creating PNG icons..."
cp "$SOURCE_ICON" src-tauri/icons/icon.png
sips -z 32 32 "$SOURCE_ICON" --out src-tauri/icons/32x32.png 2>/dev/null
sips -z 128 128 "$SOURCE_ICON" --out src-tauri/icons/128x128.png 2>/dev/null
sips -z 256 256 "$SOURCE_ICON" --out src-tauri/icons/128x128@2x.png 2>/dev/null
echo "  ✓ icon.png, 32x32.png, 128x128.png, 128x128@2x.png"

# Generate Windows .ico
echo "Creating Windows .ico..."
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=256:256" /tmp/icon_256.png 2>/dev/null
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=128:128" /tmp/icon_128.png 2>/dev/null
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=64:64" /tmp/icon_64.png 2>/dev/null
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=48:48" /tmp/icon_48.png 2>/dev/null
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=32:32" /tmp/icon_32.png 2>/dev/null
ffmpeg -y -i "$SOURCE_ICON" -vf "scale=16:16" /tmp/icon_16.png 2>/dev/null

ffmpeg -y -i /tmp/icon_256.png -i /tmp/icon_128.png -i /tmp/icon_64.png \
  -i /tmp/icon_48.png -i /tmp/icon_32.png -i /tmp/icon_16.png \
  src-tauri/icons/icon.ico 2>/dev/null

rm -f /tmp/icon_*.png
echo "  ✓ icon.ico"

# Update About section icon
echo "Updating About section icon..."
cp "$SOURCE_ICON" public/icons/icon1.png
echo "  ✓ public/icons/icon1.png"

echo ""
echo "Done! Run 'pnpm tauri build' to see the new icon in Dock/Finder."
