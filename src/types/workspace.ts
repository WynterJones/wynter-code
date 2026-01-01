export type AvatarShape = "circle" | "rounded" | "square";

export interface WorkspaceAvatar {
  type: "icon" | "image";
  icon?: string; // Lucide icon name (when type='icon')
  imageData?: string; // Base64 image data (when type='image')
  shape: AvatarShape; // How to display: circle, rounded corners, or square
}

export interface Workspace {
  id: string;
  name: string;
  color: string; // Hex color for badge/background
  avatar: WorkspaceAvatar; // Icon or custom image with shape
  projectIds: string[]; // Ordered list of project IDs
  lastActiveProjectId: string | null; // Remember active project per workspace
  createdAt: Date;
  lastOpenedAt: Date | null;
}

// Default colors for workspaces (same as project colors)
export const WORKSPACE_COLORS = [
  "#cba6f7", // Purple (Mauve)
  "#89b4fa", // Blue
  "#a6e3a1", // Green
  "#f9e2af", // Yellow
  "#fab387", // Orange (Peach)
  "#f38ba8", // Red/Pink
  "#94e2d5", // Teal
  "#cdd6f4", // White/Light
] as const;

// Helper to create a default avatar
export function createDefaultAvatar(): WorkspaceAvatar {
  return {
    type: "icon",
    icon: "Briefcase",
    shape: "circle",
  };
}

// Helper to create a new workspace
export function createWorkspace(
  name: string,
  color: string = WORKSPACE_COLORS[0]
): Workspace {
  return {
    id: crypto.randomUUID(),
    name,
    color,
    avatar: createDefaultAvatar(),
    projectIds: [],
    lastActiveProjectId: null,
    createdAt: new Date(),
    lastOpenedAt: null,
  };
}

// Helper to create a workspace with a specific ID (for mobile API)
export function createWorkspaceWithId(
  id: string,
  name: string,
  color: string = WORKSPACE_COLORS[0]
): Workspace {
  return {
    id,
    name,
    color,
    avatar: createDefaultAvatar(),
    projectIds: [],
    lastActiveProjectId: null,
    createdAt: new Date(),
    lastOpenedAt: null,
  };
}
