import { open } from "@tauri-apps/plugin-shell";

const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:"];

export function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isValidExternalUrl(url)) {
    console.warn(
      `Blocked attempt to open URL with disallowed protocol: ${url}`
    );
    throw new Error("Invalid URL protocol. Only http, https, and mailto are allowed.");
  }
  await open(url);
}
