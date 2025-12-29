import { invoke } from "@tauri-apps/api/core";

interface SystemCheckResults {
  node: string | null;
  npm: string | null;
  git: string | null;
  claude: string | null;
  codex: string | null;
  gemini: string | null;
}

let cachedResults: SystemCheckResults | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute cache

async function getSystemVersions(): Promise<SystemCheckResults> {
  const now = Date.now();
  if (cachedResults && now - cacheTimestamp < CACHE_TTL) {
    return cachedResults;
  }

  try {
    cachedResults = await invoke<SystemCheckResults>("check_system_requirements");
    cacheTimestamp = now;
    return cachedResults;
  } catch (error) {
    console.error("Failed to check system requirements:", error);
    return {
      node: null,
      npm: null,
      git: null,
      claude: null,
      codex: null,
      gemini: null,
    };
  }
}

export async function getCodexVersion(): Promise<string> {
  const results = await getSystemVersions();
  return results.codex || "unknown";
}

export async function getGeminiVersion(): Promise<string> {
  const results = await getSystemVersions();
  return results.gemini || "unknown";
}

export async function getClaudeVersion(): Promise<string> {
  const results = await getSystemVersions();
  return results.claude || "unknown";
}

export function clearVersionCache(): void {
  cachedResults = null;
  cacheTimestamp = 0;
}
