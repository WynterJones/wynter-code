import type { ReactNode } from "react";

export type CommandItemType = "tool" | "project" | "session";

export interface CommandItem {
  id: string;
  type: CommandItemType;
  label: string;
  description?: string;
  icon: ReactNode;
  keywords?: string[];
  category: string;
  action: () => void;
}
