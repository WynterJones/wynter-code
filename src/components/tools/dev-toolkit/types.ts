import type { LucideIcon } from "lucide-react";

export interface MiniTool {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
}

export interface MiniToolLayoutProps {
  inputLabel?: string;
  inputPlaceholder?: string;
  outputLabel?: string;
  value: string;
  onChange: (value: string) => void;
  output: string;
  error?: string | null;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "primary";
    disabled?: boolean;
  }>;
  onClear?: () => void;
}
