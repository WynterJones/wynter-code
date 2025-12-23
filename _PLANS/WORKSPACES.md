# Plan: Workspaces Feature

## Overview

Add a **Workspaces** layer above Projects to organize work by context. Each workspace contains its own set of project tabs, enabling users to switch between different work contexts (e.g., "Client Work", "Personal Projects", "Learning").

**New Hierarchy:**
```
Workspace → Projects → Sessions → Terminals
```

## UI Design

### Workspace Selector (Left of Project Tabs)
- **Pill button** with: circle icon badge + workspace name
- Located at the **far left of ProjectTabBar**, before project tabs
- Click opens **WorkspaceSelectorPopup**

### WorkspaceSelectorPopup
- **Dropdown style** (like ToolsDropdown, anchored below pill)
- Search input at top
- Scrollable list of workspaces with:
  - Avatar (icon or image with shape)
  - Workspace name
  - Project count
  - Hover-revealed Edit/Delete buttons
- Active workspace highlighted with `accent/10` background
- "New Workspace" button at bottom
- Inline add/edit form (like CategoryManager pattern)

### Avatar Customization (in edit mode)
- **Color picker**: Grid of 8 predefined colors (like ProjectTabBar)
- **Icon picker**: Search through lucide icons (like ProjectTabBar)
- **Image upload**: Button to upload custom logo image
  - Accepts PNG, JPG, SVG
  - Stored as base64 in localStorage
  - Recommend max 128x128 for performance
- **Shape selector**: Three toggle buttons
  - Circle (fully rounded)
  - Rounded (rounded-lg corners)
  - Square (no rounding)

## Data Model

### New Type: `Workspace`
```typescript
// src/types/workspace.ts
type AvatarShape = 'circle' | 'rounded' | 'square';

interface WorkspaceAvatar {
  type: 'icon' | 'image';
  icon?: string;              // Lucide icon name (when type='icon')
  imageData?: string;         // Base64 image data (when type='image')
  shape: AvatarShape;         // How to display: circle, rounded corners, or square
}

interface Workspace {
  id: string;
  name: string;
  color: string;              // Hex color for badge/background
  avatar: WorkspaceAvatar;    // Icon or custom image with shape
  projectIds: string[];       // Ordered list of project IDs
  lastActiveProjectId: string | null; // Remember active project per workspace
  createdAt: Date;
  lastOpenedAt: Date | null;
}
```

### Store Changes

**New: `workspaceStore.ts`**
```typescript
interface WorkspaceState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

  // Actions
  addWorkspace: (name: string, color: string) => void;
  removeWorkspace: (id: string) => void;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  setActiveWorkspace: (id: string) => void;
  addProjectToWorkspace: (workspaceId: string, projectId: string) => void;
  removeProjectFromWorkspace: (workspaceId: string, projectId: string) => void;
  reorderProjects: (workspaceId: string, fromIndex: number, toIndex: number) => void;
}
```

**Modify: `projectStore.ts`**
- Remove `projects` array (moved to workspaces)
- Keep project-level actions that delegate to workspace store
- Add `getProjectsForWorkspace(workspaceId)` helper

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/workspace.ts` | Workspace type definition |
| `src/stores/workspaceStore.ts` | Zustand store for workspaces |
| `src/components/workspaces/WorkspaceSelectorPopup.tsx` | Main popup component |
| `src/components/workspaces/WorkspaceListItem.tsx` | Individual workspace row |
| `src/components/workspaces/WorkspacePill.tsx` | Pill button in tab bar |
| `src/components/workspaces/WorkspaceAvatar.tsx` | Avatar display (icon or image with shape) |
| `src/components/workspaces/WorkspaceAvatarEditor.tsx` | Color, icon, image, shape picker |
| `src/components/workspaces/index.ts` | Barrel export |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/layout/ProjectTabBar.tsx` | Add WorkspacePill at left, filter projects by workspace |
| `src/stores/projectStore.ts` | Integrate with workspaceStore |
| `src/types/project.ts` | Add optional `workspaceId` field (for migration) |

## Implementation Steps

### Phase 1: Data Layer
1. Create `src/types/workspace.ts` with Workspace interface
2. Create `src/stores/workspaceStore.ts` with Zustand + persist
3. Add migration logic for existing projects → "Default" workspace

### Phase 2: UI Components
4. Create `WorkspaceAvatar.tsx` - display icon or image with shape
5. Create `WorkspaceAvatarEditor.tsx` - color, icon, image, shape picker
6. Create `WorkspacePill.tsx` - pill button with avatar + name
7. Create `WorkspaceSelectorPopup.tsx` - popup with search + list
8. Create `WorkspaceListItem.tsx` - row with hover actions

### Phase 3: Integration
9. Modify `ProjectTabBar.tsx`:
   - Add WorkspacePill at far left
   - Filter projects by `activeWorkspaceId`
   - Wire up popup open/close
10. Update `projectStore.ts` to work with workspace-scoped projects

### Phase 4: CRUD Operations
11. Add inline form for creating new workspace
12. Add edit mode for renaming/recoloring workspace
13. Add delete with confirmation (deletes projects too)

### Phase 5: Polish
14. Add keyboard shortcuts (maybe Cmd+Shift+W to open)
15. Add empty state when no projects in workspace
16. Add drag-drop to move projects between workspaces (future)

## Migration Strategy

For existing users:
1. On first load with workspaces feature, create "Default" workspace
2. Move all existing projects into Default workspace
3. Set Default as active workspace
4. Preserve all project order and settings

## Risks & Considerations

- **Data migration**: Must not lose existing project data
- **Session preservation**: Sessions remain tied to projects (no change needed)
- **Performance**: Filtering projects by workspace should be O(1) with proper indexing
- **Empty workspaces**: Need to handle gracefully (show "Add project" prompt)

## Design Decisions (Confirmed)

1. **Delete behavior**: Deleting a workspace deletes its projects too (with confirmation dialog)
2. **Popup style**: Dropdown anchored below the workspace pill (like ToolsDropdown)
3. **State memory**: Each workspace remembers its last active project; restored when switching back
4. **Avatar customization**: Icon or custom image upload with shape options (circle/rounded/square)
