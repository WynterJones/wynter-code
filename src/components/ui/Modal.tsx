import { ReactNode, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";
import { usePopupRegistryStore } from "@/stores/popupRegistryStore";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  overlayClassName?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  headerActions?: ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  overlayClassName,
  size = "lg",
  showCloseButton = true,
  headerActions,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { registerModal, unregisterModal } = usePopupRegistryStore();

  // Register modal in popup registry for mini player visibility
  useEffect(() => {
    if (isOpen) {
      registerModal();
      return () => unregisterModal();
    }
  }, [isOpen, registerModal, unregisterModal]);

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
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150",
        overlayClassName
      )}
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          "bg-bg-secondary rounded-lg border border-border shadow-2xl w-full animate-in zoom-in-95 duration-150 flex flex-col",
          sizeClasses[size],
          size === "full" && "h-[95vh]",
          className
        )}
      >
        {(title || showCloseButton || headerActions) && (
          <div
            data-tauri-drag-region
            className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0 cursor-grab active:cursor-grabbing"
          >
            {title && (
              <h2 id={titleId} className="text-sm font-semibold text-text-primary">{title}</h2>
            )}
            <div className="flex items-center gap-2 ml-auto">
              {headerActions}
              {showCloseButton && (
                <IconButton size="sm" onClick={onClose} aria-label="Close dialog">
                  <X className="w-4 h-4" />
                </IconButton>
              )}
            </div>
          </div>
        )}
        <div className="overflow-hidden flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>,
    document.body
  );
}
