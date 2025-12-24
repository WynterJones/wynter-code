# Wynter Code

The ultimate toolkit for Wynter's workflow with a plethora of tools, connected directly with Claude Code CLI (soon more).

Built with Tauri 2.0, React 18, and TypeScript featuring a VSCode-inspired dark theme with Catppuccin colors.

## Tools & Features

### Development
- Live Preview, Test Runner, Storybook Viewer
- API Tester, Beads Tracker, Claude Code Stats
- Farmwork Tycoon

### Dev Toolkit (28 Tools)
- **Encoding**: Base64, URL Encode/Decode, HTML Entities, String Escape
- **Data Formats**: JSON Formatter, JSON/YAML, CSV/JSON Converter
- **Crypto**: Hash Generator, HMAC, Bcrypt, Password Generator
- **Parsing**: JWT Debugger, URL Parser, Regex Tester, Cron Parser
- **Text**: Lorem Ipsum, Case Converter, Slug Generator, Word Counter, Text Diff
- **Generators**: UUID, QR Code, Timestamps, Number Base Converter
- **Reference**: HTTP Status Codes, User Agent Parser, IP Address, Byte Size

### Domain & SEO Tools
- WHOIS Lookup, Domain Availability Checker
- DNS Lookup, DNS Propagation Checker
- SSL Certificate Inspector, HTTP Headers Analyzer
- IP Geolocation, Redirect Chain Tracker

### Webcam & Streaming
- Floating webcam overlay with desktop pinning
- Customizable borders, effects, and shadows
- Crop selection and aspect ratio controls
- Decart AI integration for real-time effects

### Infrastructure
- Port Manager, Localhost Tunnel
- Background Services, System Health, Overwatch

### Utilities
- Node Modules Cleaner, Env Manager, MCP Servers
- Favicon Generator, Database Viewer

### Core Features
- Multi-Panel Layouts, Multi-Session Support
- Git-aware File Browser, Integrated Terminal
- Command Palette, Git Integration

## Built With

- Tauri 2.0 (Rust + Web)
- React 18 + TypeScript
- Tailwind CSS
- Monaco Editor
- Xterm.js (Terminal)
- Zustand (State)
- SQLx (Multi-database)
- Recharts + Pixi.js
- Claude Code CLI

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

## Building

```bash
# Build for current platform
pnpm tauri build

# Build outputs are in:
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/appimage/
```

## License

This project is licensed under the [Polyform Noncommercial License 1.0.0](LICENSE).

You are free to view, fork, and modify this software for any noncommercial purpose. Commercial use requires explicit permission from the author.

## Acknowledgments

- [Tauri](https://tauri.app/) - Desktop app framework
- [Claude Code](https://claude.ai/code) - AI coding assistant
- [Catppuccin](https://catppuccin.com/) - Color palette inspiration
- [Lucide](https://lucide.dev/) - Icons
