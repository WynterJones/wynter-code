# Project Starter Templates Feature Plan

## Overview
Add a new "Project Templates" icon button (Rocket icon) next to the meditation mode (moon) icon in the top bar. When clicked, shows a popup allowing users to scaffold new projects from popular templates with **live terminal output** using the app's existing Terminal component.

## Templates to Support
| Name | Icon | Command |
|------|------|---------|
| Chrome Extension (WXT) | `Chrome` | `npx wxt@latest init` |
| CLI Tool (oclif) | `Terminal` | `npx oclif generate` |
| Next.js | `Globe` | `npx create-next-app@latest` |
| Rails | `Train` | `rails new` |
| Express | `Zap` | `npx express-generator` |
| Tauri | `Box` | `npm create tauri-app@latest` |
| Electron | `MonitorSmartphone` | `npx create-electron-app@latest` |
| React + Vite | `Atom` | `npm create vite@latest -- --template react-ts` |

## Technical Approach

### 1. Frontend Components

**New Popup Component**: `src/components/tools/ProjectTemplatesPopup.tsx`
- Grid of template cards with icons and descriptions
- Two workflow options:
  - "Create in new folder" → opens FileBrowserPopup to select destination
  - "Create in current project" → uses active project path
- Input field for project name
- **Embedded Terminal component** for live output during generation

**Icon Button in ProjectTabBar**: Add after meditation mode section (line 501)
- Icon: `Rocket` from lucide-react
- Tooltip: "New Project from Template"

### 2. Backend - Use Existing PTY System
Leverage the existing PTY infrastructure (`src-tauri/src/terminal.rs`):
- `create_pty` - spawns shell in pseudo-terminal
- `write_pty` - sends commands to terminal
- `pty-output` event - streams output to frontend

**No new Rust command needed** - use existing PTY to run scaffold commands interactively.

### 3. State Management
- Local component state for popup open/closed
- Local state for: selected template, project name, destination, generation phase
- PTY session ID for terminal communication

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/ProjectTabBar.tsx` | Add Rocket icon button + popup trigger (after line 501) |
| `src/components/tools/ProjectTemplatesPopup.tsx` | **NEW** - Main popup with embedded Terminal |

## Implementation Steps

1. **Create ProjectTemplatesPopup.tsx**
   - Template definitions array: `{ id, name, icon, command, description }`
   - Two-phase UI:
     - **Phase 1**: Template selection grid + project name + destination picker
     - **Phase 2**: Embedded Terminal showing live scaffold output
   - FileBrowserPopup integration for folder selection
   - On "Create": spawn PTY in destination, write scaffold command
   - Success: offer to open new project in app

2. **Add icon button to ProjectTabBar.tsx**
   - Import `Rocket` icon and `ProjectTemplatesPopup`
   - Add `useState` for `showTemplatesPopup`
   - Add IconButton after meditation mode div (line 501):
   ```tsx
   {/* Project Templates */}
   <div className="border-l border-border px-2 h-full flex items-center">
     <Tooltip content="New Project from Template">
       <IconButton size="sm" onClick={() => setShowTemplatesPopup(true)}>
         <Rocket className="w-4 h-4" />
       </IconButton>
     </Tooltip>
   </div>
   ```
   - Add popup render at bottom of component

3. **Add to ToolsDropdown**
   - Add entry in TOOL_DEFINITIONS for command palette access

## UI Flow

```
[Click Rocket] → Popup opens
    ↓
[Select Template] → Card highlights
    ↓
[Enter Project Name] → Text input
    ↓
[Choose Destination] → "New Folder" / "Current Project" toggle
    ↓
[Click "Create"] → Terminal appears, command runs
    ↓
[Complete] → "Open Project" button appears
```

## Design Notes

- Modal size: `lg` or `xl` to accommodate terminal
- Template cards: 2-column grid with icon + name + description
- Terminal: reuse existing Terminal component with fixed height
- Follow existing popup styling patterns
