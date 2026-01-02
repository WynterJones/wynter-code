/**
 * @vitest-environment node
 *
 * Using node environment for full Web Crypto API support.
 * jsdom does not fully implement crypto.subtle.
 */
import { describe, it, expect } from "vitest";
import { encrypt, decrypt, computeDataHash } from "./encryption";
import type { EncryptedPayload } from "@/types/webBackup";

// Helper to convert string to Uint8Array
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper to convert Uint8Array to string
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe("encrypt", () => {
  it("encrypts data and returns valid payload structure", async () => {
    const data = stringToBytes("Hello, World!");
    const password = "testPassword123";

    const payload = await encrypt(data, password);

    expect(payload).toHaveProperty("version", 1);
    expect(payload).toHaveProperty("salt");
    expect(payload).toHaveProperty("iv");
    expect(payload).toHaveProperty("ciphertext");
    expect(payload).toHaveProperty("checksum");
    expect(typeof payload.salt).toBe("string");
    expect(typeof payload.iv).toBe("string");
    expect(typeof payload.ciphertext).toBe("string");
    expect(typeof payload.checksum).toBe("string");
  });

  it("generates different salt and IV for each encryption", async () => {
    const data = stringToBytes("Same data");
    const password = "samePassword";

    const payload1 = await encrypt(data, password);
    const payload2 = await encrypt(data, password);

    expect(payload1.salt).not.toBe(payload2.salt);
    expect(payload1.iv).not.toBe(payload2.iv);
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);
  });

  it("generates consistent checksum for same data", async () => {
    const data = stringToBytes("Checksum test");
    const password = "password123";

    const payload1 = await encrypt(data, password);
    const payload2 = await encrypt(data, password);

    // Checksum should be the same since it's based on the plaintext
    expect(payload1.checksum).toBe(payload2.checksum);
  });

  it("produces 8-character hex checksum", async () => {
    const data = stringToBytes("Test data");
    const password = "pass";

    const payload = await encrypt(data, password);

    expect(payload.checksum).toHaveLength(8);
    expect(payload.checksum).toMatch(/^[0-9a-f]{8}$/);
  });

  it("encrypts empty data", async () => {
    const data = new Uint8Array(0);
    const password = "password";

    const payload = await encrypt(data, password);

    expect(payload).toHaveProperty("version", 1);
    expect(payload.ciphertext).toBeDefined();
  });

  it("handles unicode data", async () => {
    const data = stringToBytes("Hello \u{1F600} World \u4E2D\u6587");
    const password = "password";

    const payload = await encrypt(data, password);

    expect(payload.ciphertext).toBeDefined();
    expect(payload.ciphertext.length).toBeGreaterThan(0);
  });

  it("handles unicode passwords", async () => {
    const data = stringToBytes("Test");
    const password = "\u{1F512}SecretKey\u4E2D\u6587";

    const payload = await encrypt(data, password);

    expect(payload).toHaveProperty("version", 1);
  });

  it("encrypts large data", async () => {
    // 64KB of data (max size for crypto.getRandomValues)
    const data = new Uint8Array(64 * 1024);
    crypto.getRandomValues(data);
    const password = "password";

    const payload = await encrypt(data, password);

    expect(payload.ciphertext.length).toBeGreaterThan(0);
  });
});

describe("decrypt", () => {
  it("decrypts data correctly with matching password", async () => {
    const originalData = stringToBytes("Secret message");
    const password = "correctPassword";

    const payload = await encrypt(originalData, password);
    const decrypted = await decrypt(payload, password);

    expect(bytesToString(decrypted)).toBe("Secret message");
  });

  it("throws error with incorrect password", async () => {
    const data = stringToBytes("Secret");
    const payload = await encrypt(data, "correctPassword");

    await expect(decrypt(payload, "wrongPassword")).rejects.toThrow(
      "Incorrect password"
    );
  });

  it("throws error for unsupported version", async () => {
    const payload: EncryptedPayload = {
      version: 1,
      salt: Buffer.from("fakesalt12345678").toString("base64"),
      iv: Buffer.from("fakeiv123456").toString("base64"),
      ciphertext: Buffer.from("fakeciphertext").toString("base64"),
      checksum: "abcd1234",
    };

    // Create a payload with invalid version
    const invalidPayload = { ...payload, version: 2 as 1 };

    await expect(decrypt(invalidPayload, "password")).rejects.toThrow(
      "Unsupported backup version: 2"
    );
  });

  it("decrypts empty data correctly", async () => {
    const data = new Uint8Array(0);
    const password = "password";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    expect(decrypted.length).toBe(0);
  });

  it("handles unicode data round-trip", async () => {
    const originalText = "Hello \u{1F600} World \u4E2D\u6587 \u{1F389}";
    const data = stringToBytes(originalText);
    const password = "password";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    expect(bytesToString(decrypted)).toBe(originalText);
  });

  it("handles unicode password round-trip", async () => {
    const data = stringToBytes("Secret data");
    const password = "\u{1F512}SecretKey\u4E2D\u6587";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    expect(bytesToString(decrypted)).toBe("Secret data");
  });

  it("decrypts large data correctly", async () => {
    // 64KB of data (max size for crypto.getRandomValues)
    const data = new Uint8Array(64 * 1024);
    crypto.getRandomValues(data);
    const password = "password";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    expect(decrypted.length).toBe(data.length);
    expect(decrypted).toEqual(data);
  });

  it("fails with tampered ciphertext", async () => {
    const data = stringToBytes("Original data");
    const password = "password";

    const payload = await encrypt(data, password);

    // Tamper with ciphertext (flip a bit in the middle)
    const ciphertextBuffer = Buffer.from(payload.ciphertext, "base64");
    if (ciphertextBuffer.length > 10) {
      ciphertextBuffer[10] ^= 0xff; // Flip all bits of a byte
    }
    const tamperedCiphertext = ciphertextBuffer.toString("base64");

    const tamperedPayload = { ...payload, ciphertext: tamperedCiphertext };

    await expect(decrypt(tamperedPayload, password)).rejects.toThrow();
  });

  it("fails with tampered IV", async () => {
    const data = stringToBytes("Original data");
    const password = "password";

    const payload = await encrypt(data, password);

    // Tamper with IV
    const ivBuffer = Buffer.from(payload.iv, "base64");
    ivBuffer[0] ^= 0xff;
    const tamperedIv = ivBuffer.toString("base64");

    const tamperedPayload = { ...payload, iv: tamperedIv };

    await expect(decrypt(tamperedPayload, password)).rejects.toThrow();
  });

  it("fails with tampered salt", async () => {
    const data = stringToBytes("Original data");
    const password = "password";

    const payload = await encrypt(data, password);

    // Tamper with salt (this will derive a different key)
    const saltBuffer = Buffer.from(payload.salt, "base64");
    saltBuffer[0] ^= 0xff;
    const tamperedSalt = saltBuffer.toString("base64");

    const tamperedPayload = { ...payload, salt: tamperedSalt };

    // Tampered salt leads to wrong key, which fails authentication
    await expect(decrypt(tamperedPayload, password)).rejects.toThrow(
      "Incorrect password"
    );
  });
});

describe("encrypt and decrypt round-trip", () => {
  it("preserves binary data exactly", async () => {
    // Generate random binary data with all possible byte values
    const data = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      data[i] = i;
    }
    const password = "binaryTest";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    expect(decrypted).toEqual(data);
  });

  it("works with various password lengths", async () => {
    const data = stringToBytes("Test data");

    const passwords = [
      "", // Empty password
      "a", // Single character
      "short", // Short password
      "mediumLengthPassword123!", // Medium password
      "a".repeat(1000), // Very long password
    ];

    for (const password of passwords) {
      const payload = await encrypt(data, password);
      const decrypted = await decrypt(payload, password);
      expect(bytesToString(decrypted)).toBe("Test data");
    }
  });

  it("works with special characters in password", async () => {
    const data = stringToBytes("Test");
    const specialPasswords = [
      "!@#$%^&*()",
      "password with spaces",
      "line\nbreak",
      "tab\there",
      "\x00null\x00bytes",
      "<>&\"'",
    ];

    for (const password of specialPasswords) {
      const payload = await encrypt(data, password);
      const decrypted = await decrypt(payload, password);
      expect(bytesToString(decrypted)).toBe("Test");
    }
  });

  it("handles JSON data correctly", async () => {
    const jsonData = JSON.stringify({
      settings: { theme: "dark", language: "en" },
      apiKeys: ["key1", "key2"],
      nested: { deep: { value: 42 } },
    });
    const data = stringToBytes(jsonData);
    const password = "jsonPassword";

    const payload = await encrypt(data, password);
    const decrypted = await decrypt(payload, password);

    const parsed = JSON.parse(bytesToString(decrypted));
    expect(parsed.settings.theme).toBe("dark");
    expect(parsed.apiKeys).toEqual(["key1", "key2"]);
    expect(parsed.nested.deep.value).toBe(42);
  });
});

describe("computeDataHash", () => {
  it("returns consistent hash for same input", async () => {
    const data = "Hello, World!";

    const hash1 = await computeDataHash(data);
    const hash2 = await computeDataHash(data);

    expect(hash1).toBe(hash2);
  });

  it("returns different hash for different input", async () => {
    const hash1 = await computeDataHash("Hello");
    const hash2 = await computeDataHash("Hello!");
    const hash3 = await computeDataHash("hello");

    expect(hash1).not.toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash2).not.toBe(hash3);
  });

  it("returns 64-character hex string (SHA-256)", async () => {
    const hash = await computeDataHash("test");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles empty string", async () => {
    const hash = await computeDataHash("");

    // SHA-256 of empty string is well-known
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("handles unicode characters", async () => {
    const hash = await computeDataHash("Hello \u{1F600} \u4E2D\u6587");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles long strings", async () => {
    const longString = "a".repeat(100000);
    const hash = await computeDataHash(longString);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("handles special characters", async () => {
    const special = "\x00\x01\x02\n\r\t";
    const hash = await computeDataHash(special);

    expect(hash).toHaveLength(64);
  });

  it("produces known hash for known input", async () => {
    // "hello" SHA-256 is well-known
    const hash = await computeDataHash("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("is case-sensitive", async () => {
    const hashLower = await computeDataHash("test");
    const hashUpper = await computeDataHash("TEST");
    const hashMixed = await computeDataHash("Test");

    expect(hashLower).not.toBe(hashUpper);
    expect(hashLower).not.toBe(hashMixed);
    expect(hashUpper).not.toBe(hashMixed);
  });

  it("is sensitive to whitespace", async () => {
    const hash1 = await computeDataHash("test");
    const hash2 = await computeDataHash(" test");
    const hash3 = await computeDataHash("test ");
    const hash4 = await computeDataHash(" test ");

    expect(new Set([hash1, hash2, hash3, hash4]).size).toBe(4);
  });
});

describe("security properties", () => {
  it("ciphertext is at least as long as plaintext plus auth tag", async () => {
    const data = stringToBytes("Short");
    const password = "pass";

    const payload = await encrypt(data, password);
    const ciphertextBytes = Buffer.from(payload.ciphertext, "base64").length;

    // AES-GCM adds a 16-byte auth tag
    expect(ciphertextBytes).toBeGreaterThanOrEqual(data.length + 16);
  });

  it("salt is 16 bytes (128 bits)", async () => {
    const data = stringToBytes("Test");
    const password = "pass";

    const payload = await encrypt(data, password);
    const saltBytes = Buffer.from(payload.salt, "base64").length;

    expect(saltBytes).toBe(16);
  });

  it("IV is 12 bytes (96 bits) as recommended for GCM", async () => {
    const data = stringToBytes("Test");
    const password = "pass";

    const payload = await encrypt(data, password);
    const ivBytes = Buffer.from(payload.iv, "base64").length;

    expect(ivBytes).toBe(12);
  });

  it("same plaintext with same password produces different ciphertext", async () => {
    const data = stringToBytes("Identical data");
    const password = "samePass";

    const results = await Promise.all([
      encrypt(data, password),
      encrypt(data, password),
      encrypt(data, password),
    ]);

    const ciphertexts = results.map((r) => r.ciphertext);
    const uniqueCiphertexts = new Set(ciphertexts);

    expect(uniqueCiphertexts.size).toBe(3);
  });
});
