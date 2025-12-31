import type { GeminiAspectRatio } from "@/services/geminiImageService";

export interface ImagePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  aspectRatio: GeminiAspectRatio;
  description: string;
  category: "social" | "web" | "custom";
}

export const IMAGE_PRESETS: ImagePreset[] = [
  {
    id: "favicon",
    name: "Small Square",
    width: 512,
    height: 512,
    aspectRatio: "1:1",
    description: "App icons & favicons",
    category: "web",
  },
  {
    id: "og-image",
    name: "OG Image",
    width: 1200,
    height: 630,
    aspectRatio: "16:9",
    description: "Facebook & LinkedIn",
    category: "social",
  },
  {
    id: "twitter-card",
    name: "Twitter Card",
    width: 1200,
    height: 600,
    aspectRatio: "16:9",
    description: "Twitter/X large image",
    category: "social",
  },
  {
    id: "instagram-post",
    name: "Instagram Post",
    width: 1080,
    height: 1080,
    aspectRatio: "1:1",
    description: "Square post",
    category: "social",
  },
  {
    id: "instagram-story",
    name: "Instagram Story",
    width: 1080,
    height: 1920,
    aspectRatio: "9:16",
    description: "Vertical story",
    category: "social",
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube Thumbnail",
    width: 1280,
    height: 720,
    aspectRatio: "16:9",
    description: "Video thumbnail",
    category: "social",
  },
  {
    id: "banner-wide",
    name: "Wide Banner",
    width: 1920,
    height: 480,
    aspectRatio: "16:9",
    description: "Website hero banner",
    category: "web",
  },
  {
    id: "square",
    name: "Square",
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    description: "General purpose square",
    category: "web",
  },
];

export interface GeneratedImage {
  id: string;
  prompt: string;
  presetId: string;
  imageData: string;
  mimeType: string;
  createdAt: Date;
  width: number;
  height: number;
}
