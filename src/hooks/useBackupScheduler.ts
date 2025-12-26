/**
 * Backup Scheduler Hook - Handles automatic backup scheduling and on-close backup
 */

import { useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useWebBackupStore } from "@/stores/webBackupStore";

interface BackupSchedulerOptions {
  onBackupNeeded?: () => void;
  onCloseBackupPrompt?: () => Promise<boolean>;
}

/**
 * Hook to manage backup scheduling and on-close backup prompts
 */
export function useBackupScheduler(options: BackupSchedulerOptions = {}) {
  const { onBackupNeeded, onCloseBackupPrompt } = options;
  const checkIntervalRef = useRef<number | null>(null);
  const lastNotificationRef = useRef<number>(0);

  const {
    enabled,
    autoBackupInterval,
    lastBackupAt,
    backupOnClose,
    needsBackup,
  } = useWebBackupStore();

  // Check if backup is needed and notify
  const checkBackupSchedule = useCallback(() => {
    if (!enabled || autoBackupInterval === 0) return;

    const shouldBackup = needsBackup();
    const now = Date.now();

    // Debounce notifications (min 1 hour between)
    const timeSinceLastNotification = now - lastNotificationRef.current;
    const oneHour = 60 * 60 * 1000;

    if (shouldBackup && timeSinceLastNotification > oneHour) {
      lastNotificationRef.current = now;
      onBackupNeeded?.();
    }
  }, [enabled, autoBackupInterval, needsBackup, onBackupNeeded]);

  // Set up periodic check
  useEffect(() => {
    if (!enabled || autoBackupInterval === 0) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Check every 5 minutes
    checkIntervalRef.current = window.setInterval(
      checkBackupSchedule,
      5 * 60 * 1000
    );

    // Check immediately on mount
    checkBackupSchedule();

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, autoBackupInterval, checkBackupSchedule]);

  // Handle window close
  useEffect(() => {
    if (!enabled || !backupOnClose) return;

    let unlisten: (() => void) | null = null;

    const setupCloseListener = async () => {
      try {
        unlisten = await listen("tauri://close-requested", async () => {
          const shouldBackup = needsBackup();

          if (shouldBackup && onCloseBackupPrompt) {
            // Ask user if they want to backup
            const confirmed = await onCloseBackupPrompt();

            if (confirmed) {
              // User confirmed, backup handled by the prompt callback
              // The window close will be handled after backup completes
              return;
            }
          }

          // No backup needed or user declined, close window
          const currentWindow = getCurrentWindow();
          await currentWindow.destroy();
        });
      } catch {
        // Listener setup failed, window close will work normally
      }
    };

    setupCloseListener();

    return () => {
      unlisten?.();
    };
  }, [enabled, backupOnClose, needsBackup, onCloseBackupPrompt]);

  return {
    needsBackup: needsBackup(),
    lastBackupAt,
    checkNow: checkBackupSchedule,
  };
}

/**
 * Get formatted time until next backup
 */
export function getTimeUntilBackup(): string | null {
  const { enabled, autoBackupInterval, lastBackupAt } =
    useWebBackupStore.getState();

  if (!enabled || autoBackupInterval === 0 || !lastBackupAt) {
    return null;
  }

  const intervalMs = autoBackupInterval * 60 * 60 * 1000;
  const nextBackupAt = lastBackupAt + intervalMs;
  const now = Date.now();
  const remaining = nextBackupAt - now;

  if (remaining <= 0) {
    return "Due now";
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
