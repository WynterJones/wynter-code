import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface SessionConflictPopupProps {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  onCloseSession: () => void;
  isClosing: boolean;
}

export function SessionConflictPopup({
  isOpen,
  sessionId,
  onClose,
  onCloseSession,
  isClosing,
}: SessionConflictPopupProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-warning/10">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-text-primary mb-2">
              Session Already Running
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              A previous session is still active. This can happen if the app crashed or closed unexpectedly.
            </p>
            <p className="text-xs text-text-tertiary font-mono mb-4 truncate">
              Session: {sessionId}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="ghost" onClick={onClose} disabled={isClosing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onCloseSession}
            disabled={isClosing}
          >
            {isClosing ? "Closing..." : "Close Session"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
