/**
 * Debug logging utility with feature flag
 *
 * Logs are only emitted when:
 * 1. Running in development mode (import.meta.env.DEV), or
 * 2. DEBUG_MODE is enabled in localStorage
 *
 * Usage:
 *   import { debug } from '@/lib/debug';
 *   debug.log('message', data);
 *   debug.warn('warning');
 *   debug.error('error', error);
 *   debug.group('Label', () => { ... });
 */

const DEBUG_STORAGE_KEY = "wynter-debug-mode";

const isDebugEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem(DEBUG_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
};

export const debug = {
  log: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log("[DEBUG]", ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.warn("[DEBUG]", ...args);
    }
  },

  error: (...args: unknown[]): void => {
    // Errors always log regardless of debug mode
    console.error("[ERROR]", ...args);
  },

  group: (label: string, fn: () => void): void => {
    if (isDebugEnabled()) {
      console.group(`[DEBUG] ${label}`);
      fn();
      console.groupEnd();
    }
  },

  time: (label: string): void => {
    if (isDebugEnabled()) {
      console.time(`[DEBUG] ${label}`);
    }
  },

  timeEnd: (label: string): void => {
    if (isDebugEnabled()) {
      console.timeEnd(`[DEBUG] ${label}`);
    }
  },

  /** Enable debug mode in production */
  enable: (): void => {
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, "true");
      console.log("[DEBUG] Debug mode enabled");
    } catch (error) {
      console.warn("Could not enable debug mode");
    }
  },

  /** Disable debug mode */
  disable: (): void => {
    try {
      localStorage.removeItem(DEBUG_STORAGE_KEY);
      console.log("[DEBUG] Debug mode disabled");
    } catch (error) {
      console.warn("Could not disable debug mode");
    }
  },

  /** Check if debug mode is currently enabled */
  isEnabled: isDebugEnabled,
};

// Expose debug toggle on window for easy access in DevTools
if (typeof window !== "undefined") {
  (window as unknown as { wynterDebug: typeof debug }).wynterDebug = debug;
}
