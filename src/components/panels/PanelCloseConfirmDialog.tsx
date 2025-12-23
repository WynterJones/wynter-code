import type { PanelType } from "@/types/panel";
import { getPanelTypeConfig } from "./panelRegistry";

interface PanelCloseConfirmDialogProps {
  isOpen: boolean;
  panelType: PanelType;
  reason: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PanelCloseConfirmDialog({
  isOpen,
  panelType,
  reason,
  onConfirm,
  onCancel,
}: PanelCloseConfirmDialogProps) {
  if (!isOpen) return null;

  const config = getPanelTypeConfig(panelType);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-secondary border border-border rounded-lg p-4 shadow-xl max-w-sm mx-4">
        <h3 className="text-sm font-medium text-text-primary mb-2">
          Close {config.name}?
        </h3>
        <p className="text-xs text-text-secondary mb-4">{reason}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded bg-accent-red/20 hover:bg-accent-red/30 text-accent-red transition-colors"
          >
            Close Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
