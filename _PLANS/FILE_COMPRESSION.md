# File Compression Feature

## Overview

Add file compression functionality with two modes:
1. **Archive Compression** - Create .zip archives from files/folders
2. **Media Optimization** - Lossless optimization of images, videos, PDFs

## Integration Points

- **FileBrowserPopup** - Right-click context menu
- **FileTree (Sidebar)** - Right-click context menu
- **Settings** - New "Compression" tab

## Files to Create

| File | Purpose |
|------|---------|
| `/src/types/compression.ts` | TypeScript types for compression results |
| `/src/hooks/useCompression.ts` | Hook wrapping Tauri compression commands |
| `/src/components/settings/CompressionSettings.tsx` | Settings tab component |

## Files to Modify

| File | Changes |
|------|---------|
| `/src-tauri/Cargo.toml` | Add `zip`, `oxipng`, `image` crates |
| `/src-tauri/src/commands/mod.rs` | Add compression commands |
| `/src-tauri/src/main.rs` | Register new commands |
| `/src/stores/settingsStore.ts` | Add compression settings |
| `/src/components/settings/SettingsPopup.tsx` | Add Compression tab |
| `/src/components/files/ContextMenu.tsx` | Add compression menu builder |
| `/src/components/files/FileTree.tsx` | Add compression handlers + menu items |
| `/src/components/files/FileBrowserPopup.tsx` | Add compression handlers + menu items |

## Implementation Steps

### Step 1: Rust Backend

**Cargo.toml dependencies:**
```toml
zip = "0.6"
oxipng = "9"
image = "0.25"
lopdf = "0.33"
```

**New commands in `/src-tauri/src/commands/mod.rs`:**
- `create_zip_archive(paths: Vec<String>, output_path: Option<String>, overwrite: bool)`
- `optimize_image(path: String, overwrite: bool)`
- `optimize_pdf(path: String, overwrite: bool)`
- `optimize_video(path: String, overwrite: bool)` - requires ffmpeg

### Step 2: TypeScript Types

Create `/src/types/compression.ts`:
```typescript
export interface CompressionResult {
  success: boolean;
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  savingsPercent: number;
  error?: string;
}
```

### Step 3: Settings Store

Add to `/src/stores/settingsStore.ts`:
```typescript
compressionArchiveOverwrite: boolean;  // default: false
compressionMediaOverwrite: boolean;    // default: false
```

### Step 4: Compression Hook

Create `/src/hooks/useCompression.ts` with:
- `createArchive(paths: string[])`
- `optimizeImage(path: string)`
- `optimizePdf(path: string)`
- `optimizeVideo(path: string)`
- `getCompressionType(path: string)` - helper to detect file type

### Step 5: Context Menu Updates

Add to ContextMenu.tsx:
```typescript
export function buildCompressionMenuItems(
  node: FileNode,
  onCreateArchive: () => void,
  onOptimize: () => void,
): ContextMenuItem[]
```

Menu items:
- **Folders/Files**: "Compress to Zip" (Archive icon)
- **Optimizable files only**: "Optimize File Size" (ImageMinus icon)

Optimizable extensions: `png`, `jpg`, `jpeg`, `gif`, `webp`, `pdf`, `mp4`, `mov`

### Step 6: Settings Tab

Create `/src/components/settings/CompressionSettings.tsx`:
- Archive section with overwrite toggle
- Media section with overwrite toggle
- Info box showing supported formats

Add to SettingsPopup.tsx:
- Tab type: `"compression"`
- Tab entry: `{ id: "compression", label: "Compression", icon: Archive }`

## Settings Behavior

| Setting | Default | Effect |
|---------|---------|--------|
| Archive Overwrite | false | Creates `filename.zip` alongside original |
| Media Overwrite | false | Creates `filename_optimized.ext` alongside original |

When overwrite is **true**, replaces original file.

## Context Menu Layout

**For directories:**
```
New File
New Folder
Rename
─────────────
Compress to Zip
─────────────
Delete
```

**For optimizable files (images/PDFs/videos):**
```
Rename
─────────────
Compress to Zip
Optimize File Size
─────────────
Delete
```

**For other files:**
```
Rename
─────────────
Compress to Zip
─────────────
Delete
```

## Notes

- Video optimization requires ffmpeg installed on system
- Check for ffmpeg availability before showing video optimize option
- All compression operations are async (non-blocking)
- Show before/after size comparison in success toast
