/**
 * pixellabClient
 *
 * Thin client for the PixelLab AI v2 API (https://api.pixellab.ai/v2/docs).
 * Powers the Adventurer feature: generate pixel-art character options, turn a
 * chosen sprite into a reusable character, and animate that character into
 * emote/action clips.
 *
 * All image payloads are base64 PNG data URIs. The simple image generators are
 * synchronous; character creation and animation are asynchronous (return a
 * background-job id that we poll until completion).
 */

const BASE_URL = "https://api.pixellab.ai/v2";

/** Loosely-typed PixelLab JSON response — shapes vary per endpoint. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResponse = Record<string, any>;

export interface ImageSize {
  width: number;
  height: number;
}

/** Normalised, typed error surfaced to the UI. */
export class PixelLabError extends Error {
  status: number;
  code: "auth" | "credits" | "validation" | "rate_limit" | "server" | "unknown";

  constructor(status: number, message: string) {
    super(message);
    this.name = "PixelLabError";
    this.status = status;
    this.code =
      status === 401
        ? "auth"
        : status === 402
          ? "credits"
          : status === 422
            ? "validation"
            : status === 429 || status === 529
              ? "rate_limit"
              : status >= 500
                ? "server"
                : "unknown";
  }
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey.trim()}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...authHeaders(apiKey), ...(init?.headers ?? {}) },
    });
  } catch (e) {
    // Network/CORS failure — surface as a server-class error.
    throw new PixelLabError(0, `Network error contacting PixelLab: ${String(e)}`);
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail =
        (body?.detail && (typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail))) ||
        body?.message ||
        detail;
    } catch {
      /* non-JSON error body */
    }
    throw new PixelLabError(res.status, detail);
  }

  return (await res.json()) as T;
}

/** Pull a base64 image string out of the various shapes PixelLab returns. */
function extractBase64(image: unknown): string | null {
  if (!image) return null;
  if (typeof image === "string") return image;
  if (typeof image === "object") {
    const obj = image as Record<string, unknown>;
    if (typeof obj.base64 === "string") return obj.base64;
    if (typeof obj.image === "object") return extractBase64(obj.image);
  }
  return null;
}

/** Ensure a base64 payload is a usable data URI for an <img> src. */
export function toDataUri(base64: string): string {
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

/** Decode a base64 string (raw, not a data URI) into bytes. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Encode a raw RGBA pixel buffer into a PNG data URI via canvas.
 * PixelLab's animation jobs return frames as `rgba_bytes` (raw RGBA), not PNG —
 * these must be re-encoded before they can be used as an <img> src or saved.
 */
function rgbaBytesToPngDataUri(base64: string, width: number, height: number): string {
  const bytes = base64ToBytes(base64);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PixelLabError(0, "Canvas 2D context unavailable for frame encoding");
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(bytes.subarray(0, imageData.data.length));
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

/** A single image as returned by PixelLab jobs. */
interface PixelLabImage {
  type?: string;
  base64?: string;
  width?: number;
  height?: number;
}

function isFrameImage(o: unknown): o is PixelLabImage {
  return !!o && typeof o === "object" && typeof (o as PixelLabImage).base64 === "string";
}

/** Turn one PixelLab image (PNG base64 or raw rgba_bytes) into a PNG data URI. */
function imageToDataUri(img: PixelLabImage): string | null {
  if (!img.base64) return null;
  if (img.type === "rgba_bytes" && img.width && img.height) {
    return rgbaBytesToPngDataUri(img.base64, img.width, img.height);
  }
  return toDataUri(img.base64);
}

// ---------------------------------------------------------------------------
// Balance / key validation
// ---------------------------------------------------------------------------

export interface BalanceInfo {
  usd?: number;
  generations?: number;
  plan?: string;
}

export async function getBalance(apiKey: string): Promise<BalanceInfo> {
  const data = await request<ApiResponse>(apiKey, "/balance", {
    method: "GET",
  });
  return {
    usd: data?.credits?.usd ?? data?.usd,
    generations: data?.subscription?.generations,
    plan: data?.subscription?.plan,
  };
}

// ---------------------------------------------------------------------------
// Step 1 — generate pixel-art image options from text
// ---------------------------------------------------------------------------

export interface CreateImageOptions {
  description: string;
  size?: ImageSize;
  noBackground?: boolean;
}

/** One synchronous pixflux image. Call N times for N options. */
export async function createPixelImage(
  apiKey: string,
  { description, size = { width: 64, height: 64 }, noBackground = true }: CreateImageOptions
): Promise<string> {
  const data = await request<ApiResponse>(apiKey, "/create-image-pixflux", {
    method: "POST",
    body: JSON.stringify({
      description,
      image_size: size,
      no_background: noBackground,
    }),
  });
  const b64 = extractBase64(data?.image);
  if (!b64) throw new PixelLabError(0, "PixelLab returned no image data");
  return toDataUri(b64);
}

/** Generate `count` options in parallel, tolerating partial failures. */
export async function createPixelImageOptions(
  apiKey: string,
  opts: CreateImageOptions,
  count = 3
): Promise<string[]> {
  const results = await Promise.allSettled(
    Array.from({ length: count }, () => createPixelImage(apiKey, opts))
  );
  const images = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
    .map((r) => r.value);
  if (images.length === 0) {
    const firstReject = results.find((r) => r.status === "rejected") as
      | PromiseRejectedResult
      | undefined;
    throw firstReject?.reason ?? new PixelLabError(0, "All image generations failed");
  }
  return images;
}

// ---------------------------------------------------------------------------
// Step 3 — create a reusable character from the chosen sprite
// ---------------------------------------------------------------------------

export interface CreateCharacterOptions {
  description: string;
  /** Chosen sprite as a base64 data URI to seed the character. */
  referenceImage?: string;
  size?: ImageSize;
}

export interface JobHandle {
  jobId: string;
  characterId?: string;
}

export async function createCharacter(
  apiKey: string,
  { description, referenceImage, size = { width: 64, height: 64 } }: CreateCharacterOptions
): Promise<JobHandle> {
  const body: Record<string, unknown> = {
    description,
    image_size: size,
  };
  if (referenceImage) {
    body.reference_image = { base64: referenceImage };
  }
  const data = await request<ApiResponse>(apiKey, "/create-character-v3", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const jobId = data?.background_job_id ?? data?.job_id;
  if (!jobId) throw new PixelLabError(0, "PixelLab returned no background job id");
  return { jobId, characterId: data?.character_id };
}

// ---------------------------------------------------------------------------
// Step 3/4 — animate a character into an emote/action clip
// ---------------------------------------------------------------------------

export interface AnimateOptions {
  characterId: string;
  /** Free-text action, e.g. "wave", "walk", "cheer". */
  action: string;
  frameCount?: number;
  /** Facing direction(s) to render — defaults to a single south-facing clip. */
  directions?: string[];
}

export async function animateCharacter(
  apiKey: string,
  { characterId, action, frameCount = 4, directions = ["south"] }: AnimateOptions
): Promise<string[]> {
  const data = await request<ApiResponse>(apiKey, "/animate-character", {
    method: "POST",
    body: JSON.stringify({
      character_id: characterId,
      mode: "v3",
      action_description: action,
      frame_count: frameCount,
      directions,
    }),
  });
  const ids: string[] =
    data?.background_job_ids ??
    (data?.background_job_id ? [data.background_job_id] : []);
  if (ids.length === 0) throw new PixelLabError(0, "PixelLab returned no animation jobs");
  return ids;
}

// ---------------------------------------------------------------------------
// Background job polling
// ---------------------------------------------------------------------------

export interface PollOptions {
  signal?: AbortSignal;
  onProgress?: (status: string) => void;
  /** Max attempts before giving up. */
  maxAttempts?: number;
}

/**
 * Collect ordered animation frames from a completed job response.
 *
 * PixelLab animation jobs return `last_response.images` as an ordered array of
 * `{ type: "rgba_bytes", width, height, base64 }` — raw RGBA buffers that must
 * be re-encoded to PNG (their public `storage_urls` are not directly fetchable).
 * Older/simple shapes carry a single PNG base64; those are walked as a fallback.
 */
function collectFrames(response: unknown): string[] {
  // Preferred: an ordered `images` array of frame objects (animation jobs).
  let imagesArray: PixelLabImage[] | null = null;
  const findImages = (node: unknown) => {
    if (imagesArray || !node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every(isFrameImage)) {
        imagesArray = node as PixelLabImage[];
        return;
      }
      node.forEach(findImages);
      return;
    }
    const obj = node as Record<string, unknown>;
    if (
      Array.isArray(obj.images) &&
      obj.images.length > 0 &&
      obj.images.every(isFrameImage)
    ) {
      imagesArray = obj.images as PixelLabImage[];
      return;
    }
    Object.values(obj).forEach(findImages);
  };
  findImages(response);
  if (imagesArray) {
    return (imagesArray as PixelLabImage[])
      .map(imageToDataUri)
      .filter((s): s is string => !!s);
  }

  // Fallback: walk for a single base64 PNG image (non-animation shapes).
  const frames: string[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === "object") {
      const b64 = extractBase64(node);
      if (b64) {
        frames.push(toDataUri(b64));
        return;
      }
      if (Array.isArray(node)) node.forEach(visit);
      else Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };
  visit(response);
  return frames;
}

/** Poll a background job until completion, returning its image frames. */
export async function pollJob(
  apiKey: string,
  jobId: string,
  { signal, onProgress, maxAttempts = 120 }: PollOptions = {}
): Promise<string[]> {
  let delay = 1500;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new PixelLabError(0, "Cancelled");

    let data: ApiResponse;
    try {
      data = await request<ApiResponse>(apiKey, `/background-jobs/${jobId}`, {
        method: "GET",
        signal,
      });
    } catch (e) {
      if (e instanceof PixelLabError && e.code === "rate_limit") {
        delay = Math.min(delay * 2, 10000);
        await sleep(delay, signal);
        continue;
      }
      throw e;
    }

    const status = String(data?.status ?? "processing").toLowerCase();
    onProgress?.(status);

    if (status === "completed" || status === "success" || status === "done") {
      return collectFrames(data?.last_response ?? data?.result ?? data);
    }
    if (status === "failed" || status === "error") {
      throw new PixelLabError(0, data?.error ?? "PixelLab job failed");
    }

    await sleep(delay, signal);
    delay = Math.min(Math.round(delay * 1.25), 6000);
  }
  throw new PixelLabError(0, "Timed out waiting for PixelLab job");
}

/** Run an animation request through to completed frames. */
export async function animateAndCollect(
  apiKey: string,
  opts: AnimateOptions,
  poll?: PollOptions
): Promise<string[]> {
  const jobIds = await animateCharacter(apiKey, opts);
  const perJob = await Promise.all(jobIds.map((id) => pollJob(apiKey, id, poll)));
  return perJob.flat();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new PixelLabError(0, "Cancelled"));
      },
      { once: true }
    );
  });
}
