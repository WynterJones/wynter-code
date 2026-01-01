import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Vite config for building Farmwork Tycoon as a standalone bundle
 * This bundle is served to mobile devices via the desktop's mobile API
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  root: path.resolve(__dirname, "./src/farmwork-standalone"),
  base: "/farmwork/",
  build: {
    outDir: path.resolve(__dirname, "./dist-farmwork"),
    emptyOutDir: true,
    // Generate a single HTML file with inlined critical CSS
    rollupOptions: {
      input: path.resolve(__dirname, "./src/farmwork-standalone/index.html"),
      output: {
        // Use content hashes for cache busting
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
    // Optimize for mobile
    target: "es2020",
    minify: "esbuild",
    // Keep bundle size reasonable
    chunkSizeWarningLimit: 1000,
  },
  // Copy game assets to the output
  publicDir: path.resolve(__dirname, "./public"),
  // Ensure assets are properly resolved
  assetsInclude: ["**/*.png", "**/*.jpg", "**/*.svg"],
});
