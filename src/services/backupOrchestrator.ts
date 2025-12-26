/**
 * Backup Orchestrator - Coordinates data collection, encryption, and deployment
 */

import JSZip from "jszip";
import { invoke } from "@tauri-apps/api/core";
import { DATA_CATEGORIES, getCategoryData } from "@/lib/storageUtils";
import { encrypt, decrypt, computeDataHash } from "./encryption";
import { generateRecoveryHtml } from "./backupTemplateGenerator";
import { useWebBackupStore } from "@/stores/webBackupStore";
import type { BackupData, BackupMetadata, EncryptedPayload } from "@/types/webBackup";

const APP_VERSION = "1.0.0";

/**
 * Collect all exportable data from localStorage
 */
export function collectExportableData(): BackupData {
  const exportableCategories = DATA_CATEGORIES.filter((c) => c.canExport);
  const data: Record<string, unknown> = {};
  const categoryIds: string[] = [];

  for (const category of exportableCategories) {
    const categoryData = getCategoryData(category.keys);
    if (Object.keys(categoryData).length > 0) {
      data[category.id] = categoryData;
      categoryIds.push(category.id);
    }
  }

  const metadata: BackupMetadata = {
    exportedAt: Date.now(),
    version: "1.0.0",
    appVersion: APP_VERSION,
    categories: categoryIds,
  };

  return { metadata, data };
}

/**
 * Compress data using JSZip
 */
async function compressData(jsonString: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("backup.json", jsonString);

  const compressed = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });

  return compressed;
}

/**
 * Decompress data using JSZip
 */
async function decompressData(data: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const file = zip.file("backup.json");

  if (!file) {
    throw new Error("Invalid backup: missing backup.json");
  }

  return file.async("string");
}

/**
 * Deploy HTML to Netlify (via Tauri to avoid CORS)
 */
async function deployToNetlify(
  html: string,
  siteId: string,
  token: string
): Promise<string> {
  const zip = new JSZip();

  // Main HTML file
  zip.file("index.html", html);

  // robots.txt to prevent indexing
  zip.file("robots.txt", `User-agent: *
Disallow: /
`);

  // _headers file for proper content types and security
  zip.file("_headers", `/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self' 'unsafe-inline'

/index.html
  Content-Type: text/html; charset=utf-8
`);

  const zipData = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });

  // Use Tauri backend to deploy (avoids CORS)
  const deployUrl = await invoke<string>("netlify_deploy_zip", {
    token,
    siteId,
    zipData: Array.from(zipData), // Convert Uint8Array to array for Tauri
  });

  return deployUrl;
}

/**
 * Perform a full backup
 */
export async function performBackup(password: string): Promise<boolean> {
  const store = useWebBackupStore.getState();
  const { netlifyToken, siteId, lastBackupHash } = store;

  if (!netlifyToken || !siteId) {
    store.setProgress(0, "");
    throw new Error("Backup not configured");
  }

  try {
    // Step 1: Collect data
    store.setProgress(10, "Collecting data...");
    const backupData = collectExportableData();
    const jsonString = JSON.stringify(backupData, null, 2);

    // Check if data has changed
    const dataHash = await computeDataHash(jsonString);
    if (dataHash === lastBackupHash) {
      store.setProgress(100, "No changes to backup");
      return true;
    }

    // Step 2: Compress
    store.setProgress(30, "Compressing...");
    const compressed = await compressData(jsonString);

    // Step 3: Encrypt
    store.setProgress(50, "Encrypting...");
    const encrypted = await encrypt(compressed, password);

    // Step 4: Generate HTML
    store.setProgress(70, "Generating recovery page...");
    const html = generateRecoveryHtml(encrypted, backupData.metadata);

    // Step 5: Deploy
    store.setProgress(90, "Uploading to Netlify...");
    const deployUrl = await deployToNetlify(html, siteId, netlifyToken);

    // Update hash and URL to track changes
    useWebBackupStore.setState({
      lastBackupHash: dataHash,
      siteUrl: deployUrl || store.siteUrl,
    });
    store.setProgress(100, "Backup complete!");
    return true;
  } catch (error) {
    store.setProgress(0, "");
    throw error;
  }
}

/**
 * Extract encrypted payload from recovery HTML
 * Supports both new format (HTML comment) and legacy format (JS variable)
 */
function extractPayloadFromHtml(html: string): EncryptedPayload {
  // Try new format first: <!-- WYNTER:base64encodedpayload -->
  const newFormatMatch = html.match(/<!-- WYNTER:([\w+/=]+) -->/);
  if (newFormatMatch) {
    try {
      const decoded = atob(newFormatMatch[1]);
      return JSON.parse(decoded);
    } catch {
      throw new Error("Invalid backup page: could not decode encrypted data");
    }
  }

  // Fall back to legacy format: const ENCRYPTED_PAYLOAD = {...};
  const legacyMatch = html.match(
    /const\s+ENCRYPTED_PAYLOAD\s*=\s*(\{[\s\S]*?\});/
  );

  if (!legacyMatch) {
    throw new Error("Invalid backup page: could not find encrypted data");
  }

  try {
    return JSON.parse(legacyMatch[1]);
  } catch {
    throw new Error("Invalid backup page: could not parse encrypted data");
  }
}

/**
 * Import data from individual store
 */
async function importToStore(storeKey: string, data: unknown): Promise<void> {
  localStorage.setItem(storeKey, JSON.stringify(data));
}

/**
 * Import backup data to localStorage
 */
async function importBackupData(backupData: BackupData): Promise<void> {
  for (const [_categoryId, categoryData] of Object.entries(backupData.data)) {
    if (typeof categoryData === "object" && categoryData !== null) {
      for (const [storeKey, storeData] of Object.entries(
        categoryData as Record<string, unknown>
      )) {
        await importToStore(storeKey, storeData);
      }
    }
  }
}

/**
 * Import backup from URL
 */
export async function importFromUrl(
  url: string,
  password: string
): Promise<boolean> {
  const store = useWebBackupStore.getState();

  try {
    // Step 1: Fetch HTML
    store.setProgress(20, "Fetching backup...");
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch backup: ${response.status}`);
    }

    const html = await response.text();

    // Step 2: Extract payload
    store.setProgress(40, "Extracting data...");
    const payload = extractPayloadFromHtml(html);

    // Step 3: Decrypt
    store.setProgress(50, "Decrypting...");
    const decrypted = await decrypt(payload, password);

    // Step 4: Decompress
    store.setProgress(70, "Decompressing...");
    const jsonString = await decompressData(decrypted);
    const backupData: BackupData = JSON.parse(jsonString);

    // Step 5: Import
    store.setProgress(90, "Importing data...");
    await importBackupData(backupData);

    store.setProgress(100, "Import complete!");
    return true;
  } catch (error) {
    store.setProgress(0, "");
    throw error;
  }
}

/**
 * Download backup locally (for testing or manual backup)
 */
export async function downloadBackup(password: string): Promise<void> {
  const backupData = collectExportableData();
  const jsonString = JSON.stringify(backupData, null, 2);
  const compressed = await compressData(jsonString);
  const encrypted = await encrypt(compressed, password);
  const html = generateRecoveryHtml(encrypted, backupData.metadata);

  // Download as HTML file
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wynter-code-backup-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
