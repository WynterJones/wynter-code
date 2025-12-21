import { cn } from "@/lib/utils";

interface FocusOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

export function FocusOverlay({ isActive, onClose }: FocusOverlayProps) {
  if (!isActive) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-40",
        "bg-black/80 backdrop-blur-sm",
        "transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    />
  );
}
