# Favicon Generator Tool

**Status:** Implemented
**Date:** 2025-12-23

## Overview

A client-side utility tool that converts a single high-resolution image into a complete favicon package for web projects. All image processing happens in the browser using Canvas API.

## Output Package

| Filename | Size | Purpose |
|----------|------|---------|
| favicon.ico | 16, 32, 48 (multi-layer) | Legacy browser support |
| favicon-16x16.png | 16x16 | Modern browsers |
| favicon-32x32.png | 32x32 | Browser tabs |
| apple-touch-icon.png | 180x180 | iOS home screen |
| android-chrome-192x192.png | 192x192 | Android/PWA |
| android-chrome-512x512.png | 512x512 | Android splash/PWA |
| mstile-150x150.png | 150x150 | Windows tiles |
| site.webmanifest | JSON | PWA manifest |

## Implementation

### Files Created

```
src/components/tools/favicon-generator/
  index.ts                    # Barrel export
  FaviconGeneratorPopup.tsx   # Main modal component
  DropZone.tsx                # Drag & drop file input
  PreviewGrid.tsx             # Preview all generated sizes
  PreviewCard.tsx             # Individual preview item
  useImageProcessor.ts        # Canvas-based resizing hook
  icoEncoder.ts               # Multi-size ICO generator
  manifestGenerator.ts        # webmanifest JSON
  htmlGenerator.ts            # HTML link tags for clipboard
```

### Files Modified

1. `src/components/tools/ToolsDropdown.tsx` - Added to TOOL_DEFINITIONS
2. `src/components/tools/index.ts` - Added export
3. `src/components/layout/ProjectTabBar.tsx` - State, handler, render

### Dependencies

- `jszip` - ZIP archive generation

## Technical Notes

### ICO Encoding
Modern browsers accept PNG data embedded in ICO files. The encoder creates:
- 6-byte header (reserved, type=1, count)
- 16-byte directory entries per image
- Concatenated PNG data

### Canvas Resizing
- Uses `imageSmoothingQuality = 'high'`
- Center-crops non-square images
- Processes sizes sequentially to manage memory

### SVG Handling
- Rasterizes SVG at high resolution first (512x512)
- Then processes from rasterized version
