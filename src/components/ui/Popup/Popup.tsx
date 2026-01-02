import { createContext, useContext } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "../Modal";
import { IconButton } from "../IconButton";
import { Tooltip } from "../Tooltip";
import { ScrollArea } from "../ScrollArea";
import type {
  PopupProps,
  PopupHeaderProps,
  PopupContentProps,
  PopupFooterProps,
  PopupContextValue,
  PopupSize,
} from "./types";

const PopupContext = createContext<PopupContextValue | null>(null);

function usePopupContext() {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("Popup compound components must be used within a Popup");
  }
  return context;
}

const SIZE_CLASSES: Record<PopupSize, string> = {
  small: "!w-[360px] max-h-[90vh]",
  medium: "!w-[760px] max-h-[90vh]",
  full: "!w-[calc(100vw-60px)] h-[calc(100vh-60px)]",
};

function PopupRoot({
  isOpen,
  onClose,
  size = "medium",
  className,
  children,
}: PopupProps) {
  // Use "xl" for Modal to avoid the h-[95vh] that "full" adds
  // We control sizing entirely via className
  // For "full" size, we want fixed height; for others, auto height
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      showCloseButton={false}
      className={cn(
        "!max-w-none flex flex-col overflow-hidden",
        size !== "full" && "!h-auto",
        SIZE_CLASSES[size],
        className
      )}
    >
      <PopupContext.Provider value={{ onClose, size }}>
        {children}
      </PopupContext.Provider>
    </Modal>
  );
}

function PopupHeader({
  icon: Icon,
  title,
  subtitle,
  showCloseButton = true,
  actions,
  onClose: onCloseProp,
  className,
}: PopupHeaderProps) {
  const { onClose } = usePopupContext();
  const handleClose = onCloseProp ?? onClose;

  return (
    <div
      data-tauri-drag-region
      className={cn(
        "flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0",
        "bg-bg-secondary cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <div className="flex items-center gap-3" data-tauri-drag-region>
        {Icon && <Icon className="w-5 h-5 text-accent" />}
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <h2
            className="text-sm font-semibold text-text-primary"
            data-tauri-drag-region
          >
            {title}
          </h2>
          {subtitle && (
            <span
              className="text-sm text-text-tertiary"
              data-tauri-drag-region
            >
              / {subtitle}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {actions}
        {showCloseButton && (
          <Tooltip content="Close (Esc)">
            <IconButton size="sm" onClick={handleClose} aria-label="Close popup">
              <X className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

const PADDING_CLASSES = {
  none: "",
  sm: "p-2",
  md: "p-4",
  lg: "p-6",
};

function PopupContent({
  children,
  scrollable = true,
  padding = "md",
  className,
}: PopupContentProps) {
  if (scrollable) {
    return (
      <ScrollArea className="flex-1 min-h-0" scrollbarVisibility="visible">
        <div className={cn(PADDING_CLASSES[padding], className)}>{children}</div>
      </ScrollArea>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 min-h-0 overflow-auto",
        PADDING_CLASSES[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

function PopupFooter({ left, right, children, className }: PopupFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 border-t border-border flex-shrink-0",
        "bg-bg-secondary",
        className
      )}
    >
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-center gap-2">{left}</div>
          <div className="flex items-center gap-2">{right}</div>
        </>
      )}
    </div>
  );
}

export const Popup = Object.assign(PopupRoot, {
  Header: PopupHeader,
  Content: PopupContent,
  Footer: PopupFooter,
});
