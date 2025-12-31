export interface Project {
  id: string;
  name: string;
  path: string;
  color?: string;
  icon?: string;
  minimized?: boolean;
  lastOpenedAt: Date | null;
  createdAt: Date;
}
