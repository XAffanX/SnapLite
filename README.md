# SnapLite — Modern, Ultra-Lightweight Windows Screenshot & Annotation Application

SnapLite is a fast, offline Windows screenshot capture and annotation desktop utility built with **Tauri 2**, **Rust**, **React 19**, and **Tailwind CSS**. It combines the rapid workflow of the Windows Snipping Tool with the annotation depth of ShareX, wrapped in a polished Windows 11 Fluent design.

---

## Architecture & Multi-Window Pipeline

SnapLite uses a multi-window architecture designed for high-DPI and multi-monitor Windows environments:

1. **Main Window (`main`)**:
   - Host for `App.tsx` (Dashboard, Annotation Studio, Settings, History).
   - Coordinates global hotkeys, delay timers, and native events.
2. **Overlay Window (`overlay`)**:
   - Host for `OverlayWindow.tsx` (loaded via `index.html#overlay`).
   - Positioned borderless across the virtual desktop coordinates (`SM_XVIRTUALSCREEN`, `SM_YVIRTUALSCREEN`, `SM_CXVIRTUALSCREEN`, `SM_CYVIRTUALSCREEN`).
   - Renders the frozen desktop snapshot at 1:1 pixel fidelity with crosshair cursor, loupe magnifier, live dimension tags, and 8-point handles.
   - On confirm: Sends selection bounds (`{ x, y, width, height }`) to `confirm_region_crop` in Rust, crops the native pixel buffer, closes the overlay, restores the main window, and opens the editor.
   - On cancel (`Esc`): Calls `cancel_region_selection`, hides the overlay, and restores the main window.

---

## Features

### 1. High-Performance Screen Capture Engine
- **Region Capture (`Ctrl + Shift + S`)**:
  - Hides main window to prevent self-capture.
  - Precision crosshair overlay with pixel-level alignment and live coordinates.
  - Real-time Loupe magnifier with 4x zoom and hex RGB color readout.
  - Live selection dimensions badge (`W × H px`).
  - 8-point interactive resizing handles and drag-to-move.
  - Enter to confirm, Esc to cancel, Ctrl+C to copy directly.
- **Fullscreen Capture (`Ctrl + Shift + F`)**:
  - Instantly captures primary display, selected monitors, or virtual multi-monitor desktop.
- **Window Capture (`Ctrl + Shift + W`)**:
  - Enumerates and captures specific application windows by HWND.
- **Delayed Capture (3s, 5s, 10s)**:
  - Countdown HUD with Esc cancel that triggers the exact same native region-selection path upon completion.

### 2. Advanced Annotation Studio
- **Vector Tools**:
  - **Arrow**: Crisp vector arrows with arrowhead and adjustable thickness.
  - **Rectangle & Circle**: Outlined or semi-transparent filled shapes.
  - **Freehand Pen**: Smooth continuous drawing.
  - **Highlighter**: Translucent highlighter strokes with alpha blending.
  - **Text Tool**: Direct placement with adjustable font size and bold styling.
  - **Numbered Steps**: Auto-incrementing circular badges (`1`, `2`, `3`...) with custom colors.
- **Raster Manipulation**:
  - **Pixel Blur**: True pixel-level convolution blur directly applied to image data. First-class selectable and undoable annotation object.
  - **Mosaic Pixelate**: Block-level mosaic pixelation for redacting sensitive data.
  - **Crop Tool**: Interactive cropping with rule-of-thirds grid lines and resolution preservation.
- **Object Selection & Manipulation**:
  - Click on any annotation (vectors, text, numbers, blur, or pixelate) to select it, drag to move, and press `Delete` or `Backspace` to delete.
- **History & Undo/Redo**:
  - Complete state stack supporting vector annotations, pixel raster edits, and crops (`Ctrl + Z` / `Ctrl + Y`).

### 3. Native Windows & System Tray Integration
- **Direct Clipboard Copy**: Writes true PNG image byte buffers to Windows clipboard via `arboard` / Clipboard API.
- **System Tray Mode**: Runs silently in background; minimize to tray on close, left-click to restore, right-click context menu (Capture Region, Fullscreen, Window, Settings, Quit).
- **Startup Conflict Handling**: Non-fatal conflict detection for global shortcuts (`Ctrl+Shift+S`, etc.) reporting conflicts to the UI without crashing.
- **Export Formats**: PNG (lossless), JPEG (compressed), and WebP with quality sliders and timestamped filenames (`SnapLite_YYYY-MM-DD_HH-mm-ss.png`).
- **100% Offline & Private**: Zero analytics, zero external network calls, zero telemetry.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + S` | Capture Region (Crosshair Overlay) |
| `Ctrl + Shift + F` | Capture Fullscreen |
| `Ctrl + Shift + W` | Capture Active Window |
| `Ctrl + C` | Copy screenshot to Clipboard |
| `Ctrl + S` | Save screenshot to file |
| `Ctrl + Z` | Undo last action |
| `Ctrl + Y` | Redo action |
| `Delete` / `Backspace` | Delete selected annotation object |
| `V` | Selection tool |
| `A` | Arrow tool |
| `P` | Pen tool |
| `R` | Rectangle tool |
| `O` | Circle / Ellipse tool |
| `H` | Highlighter tool |
| `T` | Text tool |
| `B` | Blur tool |
| `X` | Pixelate tool |
| `N` | Numbered marker tool |
| `C` | Crop tool |
| `Esc` | Cancel overlay or return to dashboard |

---

## Project Structure

```
├── src-tauri/                 # Native Rust & Tauri 2 backend
│   ├── Cargo.toml            # Rust dependencies (tauri 2, windows, arboard, image, tokio)
│   ├── build.rs              # Tauri 2 build script
│   ├── tauri.conf.json       # Multi-window (main, overlay) & system tray config
│   ├── capabilities/         # Scoped desktop permissions (default.json)
│   ├── icons/                # Windows icon assets (32x32, 128x128, 256x256, 512x512, .ico)
│   └── src/
│       ├── main.rs           # Windows binary entrypoint
│       ├── lib.rs            # Tauri 2 app setup, DPI awareness & plugin registration
│       ├── commands.rs       # Native IPC commands (start_region, confirm_crop, etc.)
│       ├── clipboard.rs      # Native image clipboard writer
│       ├── shortcuts.rs      # Global hotkey registration & conflict handling
│       ├── tray.rs           # System tray icon & unified context menu handlers
│       ├── settings.rs       # Local JSON configuration persistence
│       ├── capture/          # Windows GDI BitBlt & window enumeration
│       └── image/            # Rust blur, pixelate, and format encoding
├── src/                      # Frontend (React 19 + TypeScript + Tailwind)
│   ├── main.tsx              # Multi-window router (App vs OverlayWindow)
│   ├── App.tsx               # Main application controller
│   ├── components/
│   │   ├── TitleBar.tsx              # Windows 11 Fluent titlebar & window controls
│   │   ├── CaptureOverlay.tsx        # Crosshair region selector & live loupe
│   │   ├── AnnotationToolbar.tsx     # Floating tool palette & color pickers
│   │   ├── ScreenshotCanvas.tsx      # Vector & raster annotation canvas
│   │   ├── CaptureCountdown.tsx      # Delayed capture countdown ring
│   │   ├── WindowSelectorModal.tsx   # Active window picker
│   │   ├── RecentScreenshots.tsx     # Gallery of recent captures
│   │   ├── SettingsPanel.tsx         # Preferences, shortcuts & build options
│   │   └── SystemTraySimulator.tsx   # Taskbar tray simulation
│   ├── pages/
│   │   ├── Dashboard.tsx             # Main SnapLite dashboard
│   │   ├── EditorPage.tsx            # Annotation studio
│   │   └── OverlayWindow.tsx         # Dedicated overlay window entry point
│   ├── services/
│   │   ├── tauriBridge.ts            # Tauri IPC & web fallback screen capture
│   │   └── imageProcessing.ts        # Canvas convolution blur, pixelate & export
│   └── stores/
│       ├── editorStore.ts            # Zustand editor & undo/redo history store
│       ├── recentStore.ts            # Recent captures store
│       └── settingsStore.ts          # Persistent settings store
```

---

## Windows Packaging & Compilation

To build the native Windows `.exe` and `.msi` standalone installer:

```powershell
# 1. Install frontend packages
npm install

# 2. Run in development mode
npm run tauri dev

# 3. Compile optimized production release
npm run tauri build
```

Generated outputs:
- `src-tauri/target/release/snaplite.exe` (Standalone portable executable)
- `src-tauri/target/release/bundle/msi/SnapLite_0.1.0_x64_en-US.msi` (Windows Installer)
- `src-tauri/target/release/bundle/nsis/SnapLite_0.1.0_x64-setup.exe` (NSIS setup wizard)
