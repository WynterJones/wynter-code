import { ReactNode } from "react";

export type LauncherItemType =
  | "tool"
  | "project"
  | "session"
  | "application"
  | "file"
  | "folder"
  | "system-setting";

export interface LauncherAction {
  id: string;
  title: string;
  icon: ReactNode;
  shortcut?: string;
  onExecute: () => void | Promise<void>;
}

export interface LauncherItem {
  id: string;
  type: LauncherItemType;
  title: string;
  subtitle?: string;
  icon: ReactNode | string;
  category: string;
  keywords?: string[];
  score?: number;
  actions: LauncherAction[];
  defaultAction: LauncherAction;
  metadata?: Record<string, unknown>;
}

export interface MacOSApp {
  name: string;
  path: string;
  bundle_id: string | null;
}
