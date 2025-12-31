# wynter-code - Farmwork
# Run `just --list` to see all commands

# Variables
project_root := justfile_directory()

# ============================================
# DEVELOPMENT
# ============================================

# Start development server
dev:
    npm run dev

# Run linter
lint:
    npm run lint

# Run tests
test:
    npm run test

# Build project
build:
    npm run build

# ============================================
# TAURI DEVELOPMENT
# ============================================

# Run Tauri dev (frontend + backend)
tauri-dev:
    pnpm tauri dev

# Build Tauri app for production
tauri-build:
    pnpm tauri build

# Check Rust code without building
cargo-check:
    cd src-tauri && cargo check

# Build Rust backend only
cargo-build:
    cd src-tauri && cargo build

# ============================================
# CODE QUALITY
# ============================================

# TypeScript type checking
typecheck:
    npx tsc --noEmit

# Format all code (TypeScript + Rust)
format:
    npx prettier --write "src/**/*.{ts,tsx}" && cd src-tauri && cargo fmt

# Preview production build
preview:
    npm run preview

# ============================================
# RELEASE MANAGEMENT
# ============================================

# Bump patch version (1.0.1 -> 1.0.2)
release-patch:
    npm run version:patch

# Bump minor version (1.0.1 -> 1.1.0)
release-minor:
    npm run version:minor

# Bump major version (1.0.1 -> 2.0.0)
release-major:
    npm run version:major

# ============================================
# ANALYSIS
# ============================================

# Count components by directory
components:
    @echo "Component counts:" && find src/components -type f -name "*.tsx" | cut -d'/' -f3 | sort | uniq -c | sort -rn

# Find large files (>300 lines)
large-files:
    @find src -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20

# List all Zustand stores
stores:
    @find src/stores -name "*.ts" -exec basename {} \; | sort

# Show Tauri capabilities/permissions
capabilities:
    @cat src-tauri/capabilities/*.json 2>/dev/null || echo "No capability files found"

# List all Tauri commands
tauri-commands:
    @grep -E "^pub fn |^async fn " src-tauri/src/commands/mod.rs | head -40

# Check Tauri config
tauri-config:
    @cat src-tauri/tauri.conf.json | head -50

# ============================================
# NAVIGATION
# ============================================

# Go to audit folder
audit:
    @echo "{{project_root}}/_AUDIT" && cd {{project_root}}/_AUDIT

# Go to plans folder
plans:
    @echo "{{project_root}}/_PLANS" && cd {{project_root}}/_PLANS

# Go to commands folder
commands:
    @echo "{{project_root}}/.claude/commands" && cd {{project_root}}/.claude/commands

# Go to agents folder
agents:
    @echo "{{project_root}}/.claude/agents" && cd {{project_root}}/.claude/agents

# Go to mobile app
mobile:
    @echo "Opening mobile app: /Users/wynterjones/Work/SYSTEM/wynter-code-mobile"
    @cd /Users/wynterjones/Work/SYSTEM/wynter-code-mobile && pwd

# ============================================
# APP TOOLS
# ============================================

# List all app tools
tools:
    @echo "App Tools:" && ls -1 src/components/tools/*.tsx src/components/tools/*/index.ts 2>/dev/null | sed 's|src/components/tools/||' | sed 's|.tsx||' | sed 's|/index.ts||'

# Color Picker tool files
tool-color-picker:
    @echo "Color Picker:" && echo "  Frontend: src/components/colorpicker/" && echo "  Backend:  src-tauri/src/color_picker.rs"

# Port Manager tool files
tool-port-manager:
    @echo "Port Manager:" && echo "  Component: src/components/tools/PortManagerPopup.tsx" && echo "  Commands:  list_listening_ports, kill_process"

# Node Modules Cleaner tool files
tool-node-cleaner:
    @echo "Node Modules Cleaner:" && echo "  Component: src/components/tools/NodeModulesCleanerPopup.tsx" && echo "  Commands:  scan_node_modules, delete_node_modules"

# Localhost Tunnel tool files
tool-tunnel:
    @echo "Localhost Tunnel:" && echo "  Component: src/components/tools/LocalhostTunnelPopup.tsx" && echo "  Backend:   src-tauri/src/tunnel.rs" && echo "  Commands:  start_tunnel, stop_tunnel, list_tunnels"

# System Health tool files
tool-health:
    @echo "System Health:" && echo "  Components: src/components/tools/system-health/" && ls -1 src/components/tools/system-health/*.tsx | sed 's|src/components/tools/system-health/||' | sed 's|^|    - |' && echo "  Commands:   check_system_requirements, get_system_resources"

# Tools dropdown (where all tools are registered)
tool-dropdown:
    @echo "Tools Dropdown:" && echo "  Component: src/components/tools/ToolsDropdown.tsx" && echo "  Mounted:   src/components/layout/ProjectTabBar.tsx"

# ============================================
# UTILITIES
# ============================================

# Show project structure
overview:
    @tree -L 2 -I 'node_modules|.git|dist|coverage|__pycache__|.venv' 2>/dev/null || find . -maxdepth 2 -type d | head -30

# Search for files by name
search pattern:
    @find . -name "*{{pattern}}*" -not -path "./node_modules/*" -not -path "./.git/*" 2>/dev/null

# Show git status
status:
    @git status --short

# ============================================
# Farmwork WORKFLOW
# ============================================

# Run full quality gate (lint + test + build)
quality:
    just lint && just test && just build

# Show beads issues
issues:
    @bd list --status open 2>/dev/null || echo "Beads not installed. Run: cargo install beads"

# Show completed issues count
completed:
    @bd list --status closed 2>/dev/null | wc -l || echo "0"
