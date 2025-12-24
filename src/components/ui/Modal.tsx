import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  size = "lg",
  showCloseButton = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
    full: "max-w-[95vw] max-h-[95vh]",
  };

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleOverlayClick}
    >
      <div
        className={cn(
          "bg-bg-secondary rounded-lg border border-border shadow-2xl w-full animate-in zoom-in-95 duration-150 flex flex-col",
          sizeClasses[size],
          size === "full" && "h-[95vh]",
          className
        )}
      >
        {(title || showCloseButton) && (
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            {title && (
              <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
            )}
            {showCloseButton && (
              <IconButton size="sm" onClick={onClose} className="ml-auto">
                <X className="w-4 h-4" />
              </IconButton>
            )}
          </div>
        )}
        <div className="overflow-hidden flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>,
    document.body
  );
}
