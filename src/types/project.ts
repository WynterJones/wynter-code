export interface Project {
  id: string;
  name: string;
  path: string;
  isFavorite: boolean;
  lastOpenedAt: Date | null;
  createdAt: Date;
}

export interface ProjectTab {
  id: string;
  projectId: string;
  isActive: boolean;
}
