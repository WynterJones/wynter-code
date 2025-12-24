import { invoke } from "@tauri-apps/api/core";

interface AudioProxyInfo {
  port: number;
  base_url: string;
}

let proxyStarted = false;

/**
 * Start the audio proxy server if not already running
 */
export async function startAudioProxy(): Promise<AudioProxyInfo> {
  const info = await invoke<AudioProxyInfo>("start_audio_proxy");
  proxyStarted = true;
  return info;
}

/**
 * Stop the audio proxy server
 */
export async function stopAudioProxy(): Promise<void> {
  await invoke("stop_audio_proxy");
  proxyStarted = false;
}

/**
 * Get a proxied URL for a stream that bypasses CORS
 * This allows Web Audio API to analyze the audio
 */
export async function getProxiedStreamUrl(streamUrl: string): Promise<string> {
  return invoke<string>("get_audio_proxy_url", { streamUrl });
}

/**
 * Check if the audio proxy is running
 */
export async function isAudioProxyRunning(): Promise<boolean> {
  return invoke<boolean>("is_audio_proxy_running");
}

/**
 * Ensure proxy is started and get proxied URL
 */
export async function ensureProxiedUrl(streamUrl: string): Promise<string> {
  if (!proxyStarted) {
    await startAudioProxy();
  }
  return getProxiedStreamUrl(streamUrl);
}
