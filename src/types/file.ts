export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isExpanded?: boolean;
  size?: number;
  modifiedAt?: Date;
  isIgnored?: boolean;
}

export type SidebarTab = "files" | "modules" | "package" | "git" | "docs" | "info";
