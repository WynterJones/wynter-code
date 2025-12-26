/**
 * Web Backup Types - Encrypted cloud backup via Netlify
 */

/**
 * Encrypted payload structure stored in the recovery HTML
 */
export interface EncryptedPayload {
  version: 1;
  salt: string; // Base64 encoded
  iv: string; // Base64 encoded
  ciphertext: string; // Base64 encoded
  checksum: string; // First 8 chars of SHA-256 of plaintext for password validation
}

/**
 * Metadata included in the backup
 */
export interface BackupMetadata {
  exportedAt: number;
  version: string;
  appVersion: string;
  categories: string[];
}

/**
 * Full backup data structure
 */
export interface BackupData {
  metadata: BackupMetadata;
  data: Record<string, unknown>;
}

/**
 * Connection status for Netlify API
 */
export type BackupConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Backup operation status
 */
export type BackupStatus =
  | "idle"
  | "collecting"
  | "compressing"
  | "encrypting"
  | "generating"
  | "uploading"
  | "complete"
  | "error";

/**
 * Auto-backup interval options (in hours)
 */
export type BackupInterval = 0 | 12 | 24 | 48 | 72;

export const BACKUP_INTERVAL_OPTIONS: { value: BackupInterval; label: string }[] = [
  { value: 0, label: "Manual only" },
  { value: 12, label: "Every 12 hours" },
  { value: 24, label: "Every 24 hours" },
  { value: 48, label: "Every 48 hours" },
  { value: 72, label: "Every 72 hours" },
];

/**
 * Backup progress step info
 */
export interface BackupProgress {
  status: BackupStatus;
  progress: number;
  message: string;
}

/**
 * Netlify site info (minimal subset we need)
 */
export interface BackupSite {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
}

/**
 * Web backup store state
 */
export interface WebBackupState {
  // Configuration (persisted)
  enabled: boolean;
  netlifyToken: string | null;
  siteId: string | null;
  siteName: string | null;
  siteUrl: string | null;
  lastBackupAt: number | null;
  lastBackupHash: string | null;
  autoBackupInterval: BackupInterval;
  backupOnClose: boolean;

  // Runtime state (not persisted)
  connectionStatus: BackupConnectionStatus;
  connectionError: string | null;
  isBackingUp: boolean;
  backupProgress: number;
  backupMessage: string;
  backupError: string | null;
  availableSites: BackupSite[];
  isLoadingSites: boolean;
}

/**
 * Web backup store actions
 */
export interface WebBackupActions {
  // Configuration
  setEnabled: (enabled: boolean) => void;
  setNetlifyToken: (token: string | null) => void;
  setAutoBackupInterval: (interval: BackupInterval) => void;
  setBackupOnClose: (enabled: boolean) => void;

  // Connection
  testConnection: () => Promise<boolean>;
  disconnect: () => void;

  // Sites
  fetchSites: () => Promise<void>;
  createBackupSite: (siteName: string) => Promise<BackupSite | null>;
  selectSite: (siteId: string) => Promise<void>;

  // Backup operations
  performBackup: (password: string) => Promise<boolean>;
  setProgress: (progress: number, message: string) => void;

  // Recovery
  importFromUrl: (url: string, password: string) => Promise<boolean>;

  // Utilities
  clearError: () => void;
  reset: () => void;
  needsBackup: () => boolean;
}

export type WebBackupStore = WebBackupState & WebBackupActions;
