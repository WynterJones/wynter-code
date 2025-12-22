interface FocusOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

export function FocusOverlay({ isActive, onClose }: FocusOverlayProps) {
  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={onClose}
    />
  );
}
