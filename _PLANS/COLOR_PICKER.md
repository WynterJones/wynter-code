# Color Picker Feature Plan

## Overview

A comprehensive Color Picker feature for Wynter Code with:
- Mac menu bar (system tray) icon for quick access
- Screen-wide color picking (eyedropper)
- Floating mini window with color adjustments
- Recent colors history with persistence
- Colors tab in Settings for management

---

## Architecture

| Component | Technology | Notes |
|-----------|------------|-------|
| System Tray | Tauri 2.0 built-in `tray-icon` | No plugin needed |
| Screen Color Picking | macOS `NSColorSampler` via Rust FFI | Native API, no screen recording permission needed |
| Color Window | Separate Tauri WebviewWindow | Floating, always-on-top, frameless |
| State | Zustand + localStorage | Follows `settingsStore.ts` pattern |
| Color Utils | TypeScript | HEX/RGB/HSL/RGBA conversions |

---

## Files to Create

### Rust Backend
```
src-tauri/src/color_picker.rs           # NSColorSampler FFI, commands
src-tauri/icons/colorpicker-tray.png    # Tray icon (16x16, 32x32)
```

### Frontend
```
src/types/color.ts                       # Color type definitions
src/lib/colorUtils.ts                    # Color conversion utilities
src/stores/colorPickerStore.ts           # Zustand store for colors
src/pages/color-picker.tsx               # Color picker window entry

src/components/colorpicker/
  ColorPickerWindow.tsx                  # Main window component
  ColorPreview.tsx                       # Large color swatch
  ColorFormatSelector.tsx                # Format dropdown (HEX/RGB/HSL)
  ColorSliders.tsx                       # H/S/L/A sliders
  RecentColors.tsx                       # Grid of recent swatches

src/components/settings/ColorsTab.tsx    # Settings tab content
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/Cargo.toml` | Add `objc`, `objc-foundation`, `block` crates |
| `src-tauri/tauri.conf.json` | Add `color-picker` window config, enable tray |
| `src-tauri/capabilities/default.json` | Add window permissions |
| `src-tauri/src/main.rs` | Tray setup, register color commands, mod color_picker |
| `src/components/tools/ToolsDropdown.tsx` | Add Color Picker tool entry |
| `src/components/settings/SettingsPopup.tsx` | Add Colors tab |

---

## Implementation Steps

### Phase 1: Rust Backend Foundation
1. Add Rust dependencies to `Cargo.toml`:
   ```toml
   objc = "0.2"
   objc-foundation = "0.1"
   block = "0.1"
   ```

2. Create `src-tauri/src/color_picker.rs`:
   - `ColorResult` struct (r, g, b, a, hex)
   - `pick_screen_color()` command using NSColorSampler
   - `open_color_picker_window()` command
   - `close_color_picker_window()` command

3. Update `main.rs`:
   - Add `mod color_picker;`
   - Register commands in `invoke_handler!`

### Phase 2: System Tray
4. Add tray icon asset to `src-tauri/icons/`

5. Update `tauri.conf.json`:
   ```json
   "app": {
     "trayIcon": {
       "iconPath": "icons/colorpicker-tray.png",
       "iconAsTemplate": true
     }
   }
   ```

6. Add tray setup in `main.rs` setup closure:
   - Create tray menu (Pick Color, Show Picker, Quit)
   - Handle tray menu events

### Phase 3: Frontend Foundation
7. Create `src/types/color.ts`:
   ```typescript
   export interface ColorValue { r, g, b, a }
   export interface SavedColor { id, value, hex, createdAt, name? }
   export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla'
   ```

8. Create `src/lib/colorUtils.ts`:
   - `rgbToHex()`, `hexToRgb()`
   - `rgbToHsl()`, `hslToRgb()`
   - `formatColor()`, `parseColor()`

9. Create `src/stores/colorPickerStore.ts`:
   - `currentColor`, `selectedFormat`
   - `recentColors[]` (max 20)
   - `savedColors[]`
   - Actions: setCurrentColor, addRecentColor, saveColor, deleteColor

### Phase 4: Color Picker Window
10. Add window config to `tauri.conf.json`:
    ```json
    {
      "label": "color-picker",
      "title": "Color Picker",
      "url": "/color-picker",
      "width": 280,
      "height": 420,
      "resizable": false,
      "alwaysOnTop": true,
      "decorations": false,
      "transparent": true,
      "visible": false,
      "skipTaskbar": true
    }
    ```

11. Create `src/pages/color-picker.tsx` - window entry point

12. Create ColorPickerWindow components:
    - `ColorPreview.tsx` - Large swatch at top
    - `ColorFormatSelector.tsx` - Format dropdown
    - `ColorSliders.tsx` - 4 sliders (H/S/L/A)
    - `RecentColors.tsx` - Grid of swatches
    - Eyedropper button (re-pick) + Copy button in header

### Phase 5: Integration
13. Modify `ToolsDropdown.tsx`:
    - Add Color Picker entry with Pipette icon

14. Create `ColorsTab.tsx` for Settings:
    - View saved colors grid
    - Delete/clear colors
    - Export/import options

15. Modify `SettingsPopup.tsx`:
    - Add Colors tab with Palette icon

### Phase 6: Polish
16. Add copy-to-clipboard with toast feedback
17. Add close button (X) to picker window
18. Test standalone tray behavior (works when main app hidden)
19. Test signed macOS build

---

## Color Picker Window UI (280x420px)

Based on user's reference screenshot:

```
+---------------------------+
|  [X]      [Eyedropper]    |  <- Close + re-pick button
+---------------------------+
|                           |
|   [Large Color Preview]   |  <- ~150px tall
|                           |
+---------------------------+
|  7A52F5      [HSL v] [CP] |  <- Hex + format + copy
+---------------------------+
|  H: [==========O=====]    |  <- Hue slider (rainbow)
|  S: [==========O=====]    |  <- Saturation slider
|  L: [==========O=====]    |  <- Lightness slider
|  A: [==========O=====]    |  <- Alpha slider (checkerboard)
+---------------------------+
|  Recent Colors v          |
|  [#][#][#][#][#][#]       |  <- 6x2 grid
|  [#][#][#][#][#][#]       |
+---------------------------+
```

**Toolbar**: Simplified to Eyedropper (re-pick) + Copy button only

---

## Technical Notes

### NSColorSampler (macOS)
- Native macOS API for color picking
- Does NOT require screen recording permission
- Works with signed apps
- Returns NSColor which we convert to RGB

### Window Positioning
After picking a color, position window near cursor:
```typescript
const window = await WebviewWindow.getByLabel('color-picker');
await window?.setPosition(new LogicalPosition(cursorX, cursorY));
await window?.show();
```

### Color Format Conversions
```typescript
// Example: HSL to RGB
function hslToRgb(h: number, s: number, l: number) {
  // h: 0-360, s: 0-1, l: 0-1
  // returns { r: 0-255, g: 0-255, b: 0-255 }
}
```

---

## Tray Behavior

**Standalone tray picker**: The tray icon works independently of the main app.
- Clicking "Pick Color" from tray menu triggers color picking immediately
- Color picker window appears after selection, even if main app is hidden/closed
- Tray icon persists in menu bar when app is running

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Escape | Close color picker window |
| Cmd+C | Copy current color (when picker window focused) |

*No global keyboard shortcut - use tray icon or Tools menu*

---

## Settings > Colors Tab

Features:
- Grid view of all saved colors
- Click to copy color value
- Delete individual colors
- Clear all button
- Export as JSON/CSS variables
- Import colors

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| NSColorSampler FFI complexity | Use `objc` crate patterns, test thoroughly |
| Window focus stealing | Configure `focus: false` on picker window |
| App notarization issues | NSColorSampler is Apple-approved API |
| Color format precision | Use consistent float precision for HSL |
