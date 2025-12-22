#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== Wynter Code Release Script ===${NC}\n"

# Check for version argument
if [ -z "$1" ]; then
  echo -e "${RED}Usage: ./release.sh [patch|minor|major]${NC}"
  echo "  patch: 1.0.0 → 1.0.1"
  echo "  minor: 1.0.0 → 1.1.0"
  echo "  major: 1.0.0 → 2.0.0"
  exit 1
fi

# Check environment variables
if [ -z "$APPLE_ID" ] || [ -z "$APPLE_PASSWORD" ] || [ -z "$APPLE_TEAM_ID" ]; then
  echo -e "${RED}Error: Apple signing environment variables not set${NC}"
  echo "Add these to your ~/.zshrc:"
  echo "  export APPLE_ID=\"your-email\""
  echo "  export APPLE_PASSWORD=\"your-app-specific-password\""
  echo "  export APPLE_TEAM_ID=\"7X2UF4FZHC\""
  exit 1
fi

if [ -z "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" ]; then
  echo -e "${RED}Error: TAURI_SIGNING_PRIVATE_KEY_PASSWORD not set${NC}"
  exit 1
fi

# Step 1: Bump version
echo -e "${GREEN}[1/5] Bumping version ($1)...${NC}"
pnpm version:$1
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "New version: ${GREEN}v${NEW_VERSION}${NC}\n"

# Step 2: Build
echo -e "${GREEN}[2/5] Building app...${NC}"
pnpm tauri build
echo ""

# Step 3: Sign DMG
DMG_PATH="src-tauri/target/release/bundle/dmg/Wynter Code_${NEW_VERSION}_aarch64.dmg"
echo -e "${GREEN}[3/5] Signing DMG...${NC}"
SIGNATURE=$(pnpm tauri signer sign "$DMG_PATH" -k "$(cat ~/.tauri/wynter-code.key)" 2>&1 | grep "^dW50cnVzdGVk" || true)

if [ -z "$SIGNATURE" ]; then
  # Try reading from .sig file
  SIG_FILE="${DMG_PATH}.sig"
  if [ -f "$SIG_FILE" ]; then
    SIGNATURE=$(cat "$SIG_FILE")
  else
    echo -e "${RED}Error: Could not get signature${NC}"
    exit 1
  fi
fi
echo -e "Signature generated\n"

# Step 4: Update latest.json
echo -e "${GREEN}[4/5] Updating latest.json...${NC}"
cat > latest.json << EOF
{
  "version": "${NEW_VERSION}",
  "notes": "Release v${NEW_VERSION}",
  "pub_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://github.com/WynterJones/wynter-code/releases/download/v${NEW_VERSION}/Wynter.Code_${NEW_VERSION}_aarch64.dmg",
      "signature": "${SIGNATURE}"
    }
  }
}
EOF
echo -e "latest.json updated\n"

# Step 5: Copy DMG with proper name
echo -e "${GREEN}[5/5] Preparing release files...${NC}"
RELEASE_DMG="Wynter.Code_${NEW_VERSION}_aarch64.dmg"
cp "$DMG_PATH" "$RELEASE_DMG"
echo ""

echo -e "${GREEN}=== Build Complete ===${NC}\n"
echo -e "Files ready for release:"
echo -e "  - ${YELLOW}${RELEASE_DMG}${NC}"
echo -e "  - ${YELLOW}latest.json${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. git add -A"
echo -e "  2. git commit -m \"v${NEW_VERSION} release\""
echo -e "  3. git tag v${NEW_VERSION}"
echo -e "  4. git push origin main --tags"
echo -e "  5. Create release at: https://github.com/WynterJones/wynter-code/releases/new"
echo -e "  6. Upload: ${YELLOW}${RELEASE_DMG}${NC} and ${YELLOW}latest.json${NC}"
