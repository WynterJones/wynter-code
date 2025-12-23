# Multi-Panel Layout System

**Status**: Implemented

## Overview
Add a multi-panel layout system to the main content area, allowing users to split the workspace horizontally or vertically with 2, 3, or 4 panels. Users select from predefined layout templates. Each panel is independent (own session/terminal) and can display: Claude Output, Terminal, File Viewer, or Browser Preview.

## Key Features
- **Layout Templates**: 8 predefined layouts (single, split-h, split-v, triple variants, quad)
- **Panel Types**: Claude Output, Terminal, File Viewer, Browser Preview
- **Close Protection**: Panels with running processes (PTY active, streaming response) show confirmation before closing
- **Independent Panels**: Each panel has its own session/terminal state
- **Persistent**: Layout state saved per project
- **Toggle**: Button in header to switch between classic and multi-panel mode

## Usage

1. Click the layout grid icon in the header to toggle multi-panel mode
2. Use the layout selector dropdown to choose a template
3. Click panel headers to change panel types
4. Drag dividers to resize panels
5. Panels with running processes show confirmation before closing

## Layout Templates

| Template | Description | Use Case |
|----------|-------------|----------|
| Single | Full width panel | Default, focused work |
| Split Horizontal | 2 side-by-side | Code + preview |
| Split Vertical | 2 stacked | Output + terminal |
| Triple Left | 1 large + 2 small right | Main work + references |
| Triple Right | 2 small left + 1 large | Multiple inputs + main |
| Triple Horizontal | 3 columns | Multi-file comparison |
| Quad | 2x2 grid | Complex workflows |
| Code + Terminal | 70/30 top/bottom | Development default |

## Files Created

| File | Purpose |
|------|---------|
| `src/types/panel.ts` | Type definitions |
| `src/stores/panelStore.ts` | Zustand store for layout state |
| `src/components/panels/PanelLayoutContainer.tsx` | Main container |
| `src/components/panels/LayoutNode.tsx` | Recursive split/panel renderer |
| `src/components/panels/Panel.tsx` | Panel wrapper with header |
| `src/components/panels/PanelHeader.tsx` | Type selector, title, close button |
| `src/components/panels/PanelContent.tsx` | Routes to panel type component |
| `src/components/panels/PanelCloseConfirmDialog.tsx` | Close confirmation modal |
| `src/components/panels/LayoutSelector.tsx` | Template picker dropdown |
| `src/components/panels/SplitResizer.tsx` | Draggable divider |
| `src/components/panels/panelRegistry.ts` | Panel type configurations |
| `src/components/panels/layoutTemplates.ts` | Template definitions |
| `src/components/panels/panel-types/ClaudeOutputPanel.tsx` | Claude output panel |
| `src/components/panels/panel-types/TerminalPanelContent.tsx` | Terminal panel |
| `src/components/panels/panel-types/FileViewerPanel.tsx` | File viewer panel |
| `src/components/panels/panel-types/BrowserPreviewPanel.tsx` | Browser preview panel |

## Files Modified

| File | Changes |
|------|---------|
| `src/components/layout/MainContent.tsx` | Added toggle button and conditional rendering |
| `src/stores/settingsStore.ts` | Added `useMultiPanelLayout` setting |
| `src/types/index.ts` | Export panel types |
