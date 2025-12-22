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
