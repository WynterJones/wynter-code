import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type PopupSize = "small" | "medium" | "full";

export interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  size?: PopupSize;
  className?: string;
  children: ReactNode;
}

export interface PopupHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  showCloseButton?: boolean;
  actions?: ReactNode;
  onClose?: () => void;
  className?: string;
}

export interface PopupContentProps {
  children: ReactNode;
  scrollable?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

export interface PopupFooterProps {
  left?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export interface PopupContextValue {
  onClose: () => void;
  size: PopupSize;
}
