/**
 * Shared utility for detecting sensitive environment variable keys.
 * Used by both mcpStore and envStore for consistent sensitivity detection.
 */

const SENSITIVE_KEY_PATTERNS = [
  // Generic sensitive patterns
  /api[_-]?key/i,
  /secret/i,
  /password/i,
  /pass(?:wd)?$/i,
  /token/i,
  /private[_-]?key/i,
  /auth/i,
  /credential/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  // Service-specific patterns
  /^aws[_-]/i,
  /^stripe[_-]/i,
  /^github[_-]?token/i,
  /^npm[_-]?token/i,
  /^openai/i,
  /^anthropic/i,
  /^supabase/i,
  /^redis/i,
  /^mongo/i,
  /^postgres/i,
  /^mysql/i,
];

/**
 * Check if an environment variable key is likely sensitive.
 * @param key - The environment variable key to check
 * @returns true if the key matches any sensitive pattern
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}
