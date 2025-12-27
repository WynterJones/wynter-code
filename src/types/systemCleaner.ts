export interface CleanableItem {
  id: string;
  path: string;
  name: string;
  size: number;
  formattedSize: string;
  lastModified: number;
  lastModifiedFormatted: string;
  itemType: string;
  description?: string;
}

export interface ScanResult {
  items: CleanableItem[];
  totalSize: number;
  totalSizeFormatted: string;
  scannedCount: number;
}

export interface InstalledApp {
  name: string;
  path: string;
  size: number;
  formattedSize: string;
  bundleId?: string;
  version?: string;
  iconData?: string;
}

export interface DeleteResult {
  deletedCount: number;
  failedCount: number;
  spaceRecovered: number;
  spaceRecoveredFormatted: string;
  failedPaths: string[];
}

export interface CacheLocation {
  path: string;
  name: string;
  category: string;
  size: number;
  formattedSize: string;
  exists: boolean;
}

export type CleanerCategory = "large-files" | "app-caches" | "installed-apps";

export type LargeFileThreshold = 50 | 100 | 500 | 1000;
