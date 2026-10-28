# SnapLite

**A lightweight, Windows-focused screenshot and annotation desktop app.**

SnapLite is an open-source project built with **Tauri 2, Rust, React, and TypeScript**. It brings screen capture, annotation tools, and image export into a desktop interface. The project is under active development; some Windows capture behaviors and editing workflows still need device-level testing.

> **Project status:** Early development (v0.1.0). The source code is available, but not all features are verified end to end. Treat this as a preview until the capture and packaging workflows have been tested on Windows.

## Features

The current codebase includes implementations for:

- **Screen capture:** region selection, fullscreen capture, window selection, and delayed capture workflows.
- **Annotation:** arrows, rectangles, circles, pen, highlighter, text, numbered markers, crop, blur, and pixelation.
- **Editing:** selection tools, configurable colors, and undo/redo state.
- **Windows integration:** native Rust capture routines, keyboard shortcut registration, system tray, and clipboard functionality.
- **Output:** image export paths for PNG, JPEG, and WebP.
- **UI:** modern React-based dashboard and editor with theme preferences.

Some features may not yet work reliably across all monitors, DPI configurations, and applications. Bug reports and reproducible test results are welcome.

## Screenshots

Screenshots of the current Windows build will be added after the user interface and capture workflow have been validated.

## Tech stack

| Layer | Technology |
| --- | --- |
| Desktop application | Tauri 2 |
| Native integration | Rust, Windows APIs |
| Frontend | React 19, TypeScript, Vite |
| Styling and icons | Tailwind CSS, Lucide React |
| Editing and state | Konva, Zustand |
| Image processing | Rust `image` crate and browser canvas utilities |

## Requirements

To build SnapLite on Windows, install:

- Windows 10 or 11
- Node.js and npm
- Rust (stable **MSVC** toolchain)
- Visual Studio 2022 C++ Build Tools with **Desktop development with C++** and a Windows SDK
- Microsoft Edge WebView2 Runtime (available on most modern Windows installations)

For installation and setup, see the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Run locally

Clone the repository and install the JavaScript dependencies:

```powershell
git clone https://github.com/XAffanX/SnapLite.git
cd SnapLite
npm install
```

Check the frontend and Rust code:

```powershell
npm run lint
cargo check --manifest-path src-tauri/Cargo.toml
```

Launch the desktop app in development mode:

```powershell
npm run tauri dev
```

> Run these commands from a terminal where the Visual Studio MSVC tools are available. On Windows, the **x64 Native Tools Command Prompt for VS 2022** is a reliable choice. The first Rust build downloads and compiles dependencies.

## Build a Windows installer

```powershell
npm run tauri build
```

When packaging succeeds, look under:

```text
src-tauri/target/release/bundle/
```

The output may include MSI and/or NSIS installers depending on your Tauri configuration. The release executable is generally located at `src-tauri/target/release/snaplite.exe`. A successful build does not, by itself, confirm capture features are working on every Windows display configuration.

## Keyboard shortcuts

The project defines the following defaults; availability can depend on Windows/global-shortcut conflicts and application focus.

| Shortcut | Intended action |
| --- | --- |
| `Ctrl + Shift + S` | Region capture |
| `Ctrl + Shift + F` | Fullscreen capture |
| `Ctrl + Shift + W` | Window capture |
| `Ctrl + C` | Copy an image (context-dependent) |
| `Ctrl + S` | Save the current screenshot |
| `Ctrl + Z` / `Ctrl + Y` | Undo / redo |
| `Esc` | Cancel selection |

## Project structure

```text
SnapLite/
├── src/                       # React UI, editor, stores, Tauri bridge
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── stores/
│   └── types/
├── src-tauri/                 # Tauri and native Rust code
│   ├── capabilities/
│   ├── icons/
│   └── src/
│       ├── capture/          # Region, monitor, and window capture
│       ├── image/            # Image processing and export
│       ├── commands.rs
│       ├── shortcuts.rs
│       └── tray.rs
├── package.json
└── README.md
```

## Testing and known limitations

Before distributing a release, test at least:

1. Region capture on a single display, including confirming and cancelling the selection.
2. Multi-monitor and mixed-DPI selection coordinates.
3. Fullscreen and individual window capture.
4. Clipboard paste into Paint or another application.
5. Saving annotated PNG/JPEG/WebP images and undo/redo behavior.
6. Global shortcuts when the main window is minimized to the tray.
7. Running the **packaged installer**, not just `tauri dev`.

The browser UI preview is **not** a substitute for native Windows screenshot testing. Some protected content or applications may restrict screen capture. Please file issues with Windows version, monitor layout/scaling, reproduction steps, and relevant logs. **Remove private data and captured sensitive images from logs/screenshots before sharing.**

## Privacy

SnapLite is designed for local screenshot workflows. Review the source and dependencies before deploying it in security-sensitive environments; an independent privacy/security audit has not been completed.

## Contributing

Bug reports, testing notes, documentation improvements, and pull requests are welcome. For major changes, open an issue describing your proposal before implementation.

---

Built as a learning and engineering project exploring **Rust, Tauri, Windows APIs, and modern desktop UI development**.
