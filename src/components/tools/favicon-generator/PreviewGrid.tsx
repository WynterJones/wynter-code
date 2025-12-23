import { PreviewCard } from "./PreviewCard";
import type { ProcessedFavicons } from "./useImageProcessor";

interface PreviewGridProps {
  favicons: ProcessedFavicons | null;
}

interface FaviconItem {
  key: keyof ProcessedFavicons;
  label: string;
  filename: string;
  size: string;
  category: "browser" | "apple" | "android" | "microsoft";
}

const FAVICON_ITEMS: FaviconItem[] = [
  // Browser
  {
    key: "ico",
    label: "ICO",
    filename: "favicon.ico",
    size: "16/32/48",
    category: "browser",
  },
  {
    key: "favicon16",
    label: "PNG 16",
    filename: "favicon-16x16.png",
    size: "16x16",
    category: "browser",
  },
  {
    key: "favicon32",
    label: "PNG 32",
    filename: "favicon-32x32.png",
    size: "32x32",
    category: "browser",
  },
  // Apple
  {
    key: "appleTouchIcon",
    label: "Apple Touch",
    filename: "apple-touch-icon.png",
    size: "180x180",
    category: "apple",
  },
  // Android
  {
    key: "androidChrome192",
    label: "Android 192",
    filename: "android-chrome-192x192.png",
    size: "192x192",
    category: "android",
  },
  {
    key: "androidChrome512",
    label: "Android 512",
    filename: "android-chrome-512x512.png",
    size: "512x512",
    category: "android",
  },
  // Microsoft
  {
    key: "mstile150",
    label: "MS Tile",
    filename: "mstile-150x150.png",
    size: "150x150",
    category: "microsoft",
  },
];

const CATEGORY_LABELS: Record<FaviconItem["category"], string> = {
  browser: "Browser",
  apple: "Apple",
  android: "Android",
  microsoft: "Microsoft",
};

export function PreviewGrid({ favicons }: PreviewGridProps) {
  if (!favicons) return null;

  const categories = ["browser", "apple", "android", "microsoft"] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const items = FAVICON_ITEMS.filter((item) => item.category === category);
        if (items.length === 0) return null;

        return (
          <div key={category}>
            <h4 className="text-xs font-medium text-neutral-400 mb-2 uppercase tracking-wide">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {items.map((item) => (
                <PreviewCard
                  key={item.key}
                  label={item.label}
                  filename={item.filename}
                  size={item.size}
                  imageBlob={favicons[item.key]}
                  compact
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
