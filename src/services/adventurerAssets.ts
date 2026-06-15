/**
 * adventurerAssets
 *
 * Persists adventurer animation frames to disk (under the app data dir) instead
 * of bloating localStorage with base64. Frames are written as PNGs and rendered
 * through the Tauri asset protocol via `convertFileSrc`. The store keeps only
 * file paths.
 *
 * Back-compat: characters created before this change still carry base64 frames
 * in the store; the `*Src` helpers fall back to those so they keep rendering.
 */

import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile, remove, exists } from "@tauri-apps/plugin-fs";
import type { Adventurer, AnimationClip } from "@/stores/adventurerStore";

const ROOT_DIR = "adventurers";

/** Decode a base64 (or data-URI) PNG into raw bytes. */
function dataUriToBytes(uri: string): Uint8Array {
  const base64 = uri.includes(",") ? uri.slice(uri.indexOf(",") + 1) : uri;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function clipDir(adventurerId: string, clipId: string): Promise<string> {
  return join(await appDataDir(), ROOT_DIR, adventurerId, clipId);
}

/** Write a clip's frames to disk, returning their absolute file paths. */
export async function saveFrames(
  adventurerId: string,
  clipId: string,
  frames: string[]
): Promise<string[]> {
  const dir = await clipDir(adventurerId, clipId);
  await mkdir(dir, { recursive: true });
  const paths: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    const path = await join(dir, `frame_${i}.png`);
    await writeFile(path, dataUriToBytes(frames[i]));
    paths.push(path);
  }
  return paths;
}

/** Remove all on-disk assets for an adventurer (called on delete). */
export async function deleteAdventurerAssets(adventurerId: string): Promise<void> {
  try {
    const dir = await join(await appDataDir(), ROOT_DIR, adventurerId);
    if (await exists(dir)) await remove(dir, { recursive: true });
  } catch {
    /* best-effort cleanup */
  }
}

/** Renderable <img> srcs for a clip — disk paths preferred, base64 fallback. */
export function clipSrcs(clip: Pick<AnimationClip, "framePaths" | "frames">): string[] {
  if (clip.framePaths && clip.framePaths.length > 0) {
    return clip.framePaths.map((p) => convertFileSrc(p));
  }
  return clip.frames ?? [];
}

/** Renderable src for an adventurer's base sprite — disk path preferred. */
export function baseSpriteSrc(
  adv: Pick<Adventurer, "baseSpritePath" | "baseSprite">
): string | undefined {
  if (adv.baseSpritePath) return convertFileSrc(adv.baseSpritePath);
  return adv.baseSprite;
}
