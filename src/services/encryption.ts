/**
 * Encryption Service - Web Crypto API based encryption for backups
 *
 * Uses PBKDF2 for key derivation and AES-256-GCM for encryption.
 * This provides authenticated encryption ensuring both confidentiality
 * and integrity of the backup data.
 */

import type { EncryptedPayload } from "@/types/webBackup";

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  // Create a new ArrayBuffer and copy to ensure proper type
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Generate a random salt for key derivation
 */
function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generate a random IV for AES-GCM
 */
function generateIV(): Uint8Array {
  const iv = new Uint8Array(IV_LENGTH);
  crypto.getRandomValues(iv);
  return iv;
}

/**
 * Compute SHA-256 hash and return first 8 hex characters
 * Used for password validation on decryption
 */
async function computeChecksum(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 8);
}

/**
 * Derive an AES-256 key from a password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt data using AES-256-GCM with a password-derived key
 *
 * @param data - The data to encrypt as Uint8Array
 * @param password - The user's backup password
 * @returns EncryptedPayload containing all data needed for decryption
 */
export async function encrypt(
  data: Uint8Array,
  password: string
): Promise<EncryptedPayload> {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKey(password, salt);
  const checksum = await computeChecksum(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    data as unknown as BufferSource
  );

  return {
    version: 1,
    salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    ciphertext: arrayBufferToBase64(ciphertext),
    checksum,
  };
}

/**
 * Decrypt an encrypted payload using the provided password
 *
 * @param payload - The encrypted payload from backup
 * @param password - The user's backup password
 * @returns Decrypted data as Uint8Array
 * @throws Error if password is incorrect or data is corrupted
 */
export async function decrypt(
  payload: EncryptedPayload,
  password: string
): Promise<Uint8Array> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported backup version: ${payload.version}`);
  }

  const salt = new Uint8Array(base64ToArrayBuffer(payload.salt));
  const iv = new Uint8Array(base64ToArrayBuffer(payload.iv));
  const ciphertext = base64ToArrayBuffer(payload.ciphertext);
  const key = await deriveKey(password, salt);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      ciphertext
    );

    const decryptedData = new Uint8Array(decrypted);

    // Verify checksum to confirm correct password
    const checksum = await computeChecksum(decryptedData);
    if (checksum !== payload.checksum) {
      throw new Error("Data integrity check failed - backup may be corrupted");
    }

    return decryptedData;
  } catch (error) {
    // AES-GCM will throw if authentication fails (wrong password)
    if (error instanceof Error && error.name === "OperationError") {
      throw new Error("Incorrect password");
    }
    throw error;
  }
}

/**
 * Compute SHA-256 hash of data for change detection
 */
export async function computeDataHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

