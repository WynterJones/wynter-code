/**
 * Generate site.webmanifest content for PWA favicon support
 */

export interface ManifestOptions {
  name?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
}

export function generateManifest(options: ManifestOptions = {}): string {
  const manifest = {
    name: options.name || "App",
    short_name: options.shortName || options.name || "App",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: options.themeColor || "#ffffff",
    background_color: options.backgroundColor || "#ffffff",
    display: "standalone",
  };

  return JSON.stringify(manifest, null, 2);
}

export function generateManifestBlob(options: ManifestOptions = {}): Blob {
  return new Blob([generateManifest(options)], {
    type: "application/manifest+json",
  });
}
