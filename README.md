# Wynter Code

A beautiful, modern desktop application for Claude Code CLI built with Tauri 2.0, React, and TypeScript. Features a VSCode-inspired dark theme, multi-project tabs, multiple sessions per project, file browsing, Git integration, and more.

## Features

- **Claude Code Integration** - Full integration with Claude Code CLI for AI-powered coding assistance
- **Multi-Project Tabs** - Work on multiple projects simultaneously with tabbed interface
- **Multiple Sessions** - Run multiple Claude sessions per project with inner tabs
- **File Browser** - Explore project files with a collapsible tree view
- **Git Integration** - View branch, status, and recent commits at a glance
- **Node Modules Viewer** - Browse installed packages with search functionality
- **Model Selector** - Switch between Claude models (Sonnet, Opus, Haiku)
- **Favorites System** - Star and quickly access your favorite projects
- **Dark Theme** - Beautiful VSCode-inspired dark theme with Catppuccin colors
- **SQLite Persistence** - Projects, sessions, and messages are persisted locally

## Prerequisites

- **Node.js** 18+ and pnpm
- **Rust** (latest stable) - [Install Rust](https://rustup.rs/)
- **Claude Code CLI** - [Install Claude Code](https://claude.ai/code)
- **Platform Requirements:**
  - macOS: Xcode Command Line Tools
  - Linux: `webkit2gtk-4.1`, `libayatana-appindicator3-dev`
  - Windows: Microsoft Visual Studio C++ Build Tools

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/wynter-code.git
cd wynter-code

# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

## Development

```bash
# Start the development server with hot reload
pnpm tauri dev

# Build for production
pnpm tauri build

# Run frontend only (for UI development)
pnpm dev

# Type check
pnpm tsc --noEmit
```

## Project Structure

```
wynter-code/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── ui/                   # Base components (Button, Input, etc.)
│   │   ├── layout/               # Layout components (AppShell, Sidebar)
│   │   ├── files/                # File browser components
│   │   ├── git/                  # Git integration
│   │   ├── modules/              # Node modules viewer
│   │   ├── model/                # Model selector
│   │   ├── prompt/               # Prompt input
│   │   ├── output/               # Output display
│   │   └── project/              # Project info
│   ├── stores/                   # Zustand state stores
│   ├── services/                 # Backend services
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript types
│   └── lib/                      # Utility functions
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs               # Tauri entry point
│   │   └── commands/             # Tauri commands
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
├── package.json                  # Node dependencies
├── tailwind.config.js            # Tailwind theming
├── tsconfig.json                 # TypeScript config
└── vite.config.ts                # Vite config
```

## Architecture

### Frontend (React + TypeScript)

- **State Management**: Zustand with persistence
- **Styling**: Tailwind CSS with custom theme
- **Components**: Modular, reusable component library
- **Markdown**: react-markdown with syntax highlighting

### Backend (Rust + Tauri)

- **File System**: tauri-plugin-fs for file operations
- **Shell**: tauri-plugin-shell for Claude CLI and Git
- **Database**: tauri-plugin-sql with SQLite for persistence
- **Commands**: Custom Tauri commands for file tree and modules

### Claude Integration

Claude Code CLI is spawned as a subprocess using Tauri's shell plugin. Communication happens via stdout/stdin with JSON output format for reliable parsing.

## Theme

The app uses a VSCode-inspired dark theme with Catppuccin Mocha colors:

| Element | Color |
|---------|-------|
| Background | `#1e1e2e` |
| Secondary | `#181825` |
| Text | `#cdd6f4` |
| Accent | `#cba6f7` |
| Success | `#a6e3a1` |
| Error | `#f38ba8` |
| Warning | `#f9e2af` |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Focus prompt input |
| `Cmd/Ctrl + N` | New session |
| `Cmd/Ctrl + W` | Close current tab |
| `Cmd/Ctrl + 1-9` | Switch project tabs |
| `Enter` | Send prompt |
| `Shift + Enter` | New line in prompt |

## Configuration

Settings are stored in `~/.wynter-code/` including:

- Default Claude model
- Sidebar width
- Recent projects
- Favorites

## Building

```bash
# Build for current platform
pnpm tauri build

# Build outputs are in:
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/appimage/
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [Claude Code](https://claude.ai/code) - AI coding assistant
- [Catppuccin](https://catppuccin.com/) - Color palette inspiration
- [Lucide](https://lucide.dev/) - Icons
