/**
 * Storage utility functions for data management
 */

/**
 * Calculate the size of a localStorage item in bytes
 */
export function getStorageSize(key: string): number {
  const item = localStorage.getItem(key);
  if (!item) return 0;
  // Calculate size in bytes (2 bytes per character for UTF-16)
  return new Blob([item]).size;
}

/**
 * Calculate total localStorage usage in bytes
 */
export function getTotalStorageSize(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += getStorageSize(key);
    }
  }
  return total;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

/**
 * Get data for multiple localStorage keys
 */
export function getCategoryData(keys: string[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const key of keys) {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        data[key] = JSON.parse(item);
      } catch {
        data[key] = item;
      }
    }
  }

  return data;
}

/**
 * Export data as JSON file download
 */
export function exportToJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get combined size for multiple localStorage keys
 */
export function getCategorySize(keys: string[]): number {
  return keys.reduce((total, key) => total + getStorageSize(key), 0);
}

/**
 * Clear multiple localStorage keys
 */
export function clearStorageKeys(keys: string[]): void {
  for (const key of keys) {
    localStorage.removeItem(key);
  }
}

/**
 * Data category definitions
 */
export interface DataCategory {
  id: string;
  name: string;
  description: string;
  keys: string[];
  canExport: boolean;
  canClear: boolean;
  isProtected?: boolean;
}

export const DATA_CATEGORIES: DataCategory[] = [
  {
    id: "sessions",
    name: "Sessions & Conversations",
    description: "Claude chat history, messages, and streaming state",
    keys: ["wynter-code-sessions"],
    canExport: true,
    canClear: true,
  },
  {
    id: "workspaces",
    name: "Workspaces & Projects",
    description: "Workspace configurations, project associations, and subscriptions",
    keys: ["wynter-code-workspaces", "wynter-code-subscriptions"],
    canExport: true,
    canClear: true,
  },
  {
    id: "tools",
    name: "Tools Data",
    description: "API tester requests, database connections, Storybook configs",
    keys: ["wynter-code-api-tester", "database-viewer-storage", "wynter-code-storybook"],
    canExport: true,
    canClear: true,
  },
  {
    id: "ui",
    name: "UI State",
    description: "Panel layouts, terminal state, saved colors, live preview settings",
    keys: ["panel-layout-storage", "terminal-storage", "wynter-code-colors", "wynter-code-live-preview"],
    canExport: false,
    canClear: true,
  },
  {
    id: "settings",
    name: "App Settings",
    description: "Theme, fonts, editor preferences (protected)",
    keys: ["wynter-code-settings"],
    canExport: true,
    canClear: false,
    isProtected: true,
  },
  {
    id: "system",
    name: "System Data",
    description: "Environment variables, onboarding progress, service monitors",
    keys: ["wynter-code-env", "wynter-code-onboarding", "wynter-code-overwatch"],
    canExport: false,
    canClear: true,
  },
  {
    id: "backup",
    name: "Backup Config",
    description: "Encrypted web backup configuration (Netlify token, site info)",
    keys: ["wynter-code-web-backup"],
    canExport: false,
    canClear: true,
  },
];
