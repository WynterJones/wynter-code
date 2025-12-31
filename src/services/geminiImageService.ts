/**
 * Gemini Image Generation Service
 * Uses Google's Gemini API for AI-powered image generation
 */

export type GeminiAspectRatio =
  | "1:1"
  | "16:9"
  | "9:16"
  | "4:3"
  | "3:4"
  | "3:2"
  | "2:3"
  | "5:4"
  | "4:5"
  | "21:9";

export interface GeminiImageRequest {
  prompt: string;
  aspectRatio?: GeminiAspectRatio;
  negativePrompt?: string;
}

export interface GeminiImageResponse {
  imageData: string; // Base64 encoded
  mimeType: string;
}

const GEMINI_MODEL = "gemini-2.5-flash-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Generate an image using the Gemini API
 */
export async function generateImage(
  request: GeminiImageRequest,
  apiKey: string
): Promise<GeminiImageResponse> {
  if (!apiKey) {
    throw new Error("Gemini API key is required");
  }

  if (!request.prompt || request.prompt.trim().length === 0) {
    throw new Error("Prompt is required");
  }

  // Build the prompt with optional negative prompt
  let fullPrompt = request.prompt;
  if (request.negativePrompt) {
    fullPrompt += `\n\nAvoid: ${request.negativePrompt}`;
  }

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: fullPrompt
          }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(request.aspectRatio && {
        imageConfig: {
          aspectRatio: request.aspectRatio
        }
      })
    }
  };

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `API request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract the image from the response
  const candidates = data.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No image generated. The API returned no candidates.");
  }

  const parts = candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("No image data in response");
  }

  // Find the inlineData part (the image)
  const imagePart = parts.find((part: { inlineData?: { data: string; mimeType: string } }) => part.inlineData);

  if (!imagePart || !imagePart.inlineData) {
    // Check if there's a text response explaining why no image was generated
    const textPart = parts.find((part: { text?: string }) => part.text);
    if (textPart?.text) {
      throw new Error(`Image generation failed: ${textPart.text}`);
    }
    throw new Error("No image data in response");
  }

  return {
    imageData: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || "image/png",
  };
}

/**
 * Convert base64 image data to a Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert base64 image data to a data URL
 */
export function base64ToDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Download an image from base64 data
 */
export function downloadImage(base64: string, mimeType: string, filename: string): void {
  const blob = base64ToBlob(base64, mimeType);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get the file extension for a given MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return mimeToExt[mimeType] || "png";
}

/**
 * Test the API key by making a simple request
 */
export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    // Make a minimal request to verify the key works
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET" }
    );
    return response.ok;
  } catch {
    return false;
  }
}
