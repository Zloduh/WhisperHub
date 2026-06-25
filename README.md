# WhisperHub

**WhisperHub** is a lightweight, standalone, always-on-top Electron overlay for **Path of Exile 1** and **Path of Exile 2**. It aggregates in-game viewer/player whispers (`@From`) into a clean, grouped list. Designed specifically for streamers, trade runners, and group leads, it helps manage viewer party invites, build link distribution, and audience questions without tab-targeting out of the game client.

---

## Key Features

- **Multi-Game Support:** Seamlessly switch between monitoring **Path of Exile 1** and **Path of Exile 2** log sources.
- **Overlay Position Lock & Click-Through:** Toggle lock states (🔓 / 🔒) in the header. 
  - **Unlocked (🔓):** Drag the header bar to reposition the overlay anywhere on your screen.
  - **Locked (🔒):** Click-through is active. The empty dark background ignores mouse clicks, passing inputs straight to the game client so you can play without hindrance. Hovering over list cards or buttons temporarily recaptures focus so you can click them.
- **Custom Client Support (Standalone & Epic):** Override Steam auto-discovery by browsing and selecting your GGG Standalone client or Epic Games Store `Client.txt` file manually.
- **Grouped Whisper Queue:** Automatically groups whispers by `PlayerName`, updates the card with the latest message, increments a notification badge count, and sorts active players so that the most recent whisper rises to the top.
- **Fuzzy Search Filters:** Instantly filter active queue cards by player name or query keywords (e.g. "invite", "build").
- **Customizable Action Macros:** Configure three separate macro buttons next to each player (e.g. `Invite`, `Build Link`, `Wait Reply`). The commands are fully editable in the settings and automatically replace the `{name}` placeholder with the viewer's character name.
- **Notification Audio Chimes:** Emulates a pleasant retro-metallic bell notification chime using the Web Audio API (completely client-side, zero assets needed, adjustable volume).
- **Test Mock Ingest:** Inject random test whispers using the `+` button in the header bar to preview active layouts, font sizes, and check notification sounds without needing to manually generate whispers.
- **Design Tokens System:** Styled according to the [DESIGN.md](file:///d:/Projekti/WhisperHub/DESIGN.md) specification, matching the dark fantasy bronze, slate, and glowing amber aesthetics of the GGG games.


---

## How It Works

1. **Log Discovery:** On startup, WhisperHub checks standard Steam roots and manifests to find installation folders. If a manual path override is set in the UI, GGG standalone or Epic directory paths are tail-monitored instead.
2. **Log Tailing:** Using a Node.js filesystem watcher, WhisperHub tails `Client.txt` passively, matching incoming lines against PoE log formats:
   ```regex
   @From (?:<Guild> )?PlayerName: message
   ```
3. **IPC Channel:** Whispers and game connection statuses are communicated between the Electron main process and the React front-end bridge in real-time.
4. **Mouse Events Forwarding:** Hover event bindings toggle Electron's `setIgnoreMouseEvents` dynamically when Click-Through is active.

---

## Window Controls & Interaction

- **Toggle Lock (Padlock Icon):** Click the 🔓/🔒 icon to toggle between Unlocked (movable) and Locked (click-through) modes.
- **Move Window:** When unlocked, click and drag the header bar labeled **"DRAGGABLE"** to reposition the panel.
- **Minimize Overlay (Collapse Icon):** Click the minimize button to collapse the interface into a small, floating circular bubble showing the total active whisper count. Click it again to expand.
- **Customization Settings (Gear Icon):** Open the settings drawer to adjust:
  - Background Opacity (35% to 100%).
  - Audio Alert Volume (0% to 100%).
  - Typography Font Sizes (Small, Base, Large).
  - Active Game Profile (PoE 1 vs PoE 2).
  - Custom log file paths (via native folder explorer).
  - Customizable macros label and templates.
- **Help Sheet:** Switch to the "Usage Guide" tab inside Settings for quick directions.
- **Test Ingest (➕ Icon):** Click the plus sign icon in the header to immediately simulate an incoming whisper for checking layout sizing and audio volume.
- **Quit Application (✕ Icon):** Click the red close cross in the top-right corner to exit the app.


---

## Getting Started & Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Path of Exile 1 or 2** installed on Windows.

### 1. Install Dependencies
Navigate to the root directory of the application and run:
```bash
npm install
```

### 2. Run in Development Mode
To start the Electron application in hot-reloading development mode:
```bash
npm run dev
```

### 3. Build & Package
To compile and package the app for production (generating a standalone installer/executable):
```bash
npm run build
```

### 4. Preview Build
To run the built version of the application:
```bash
npm run preview
```

### 5. Local Packaging
To compile and package the app into standalone Windows executables (NSIS Setup installer and Portable executable) locally:
```bash
npm run package
```
This generates the installers under the `/dist` directory.

---

## Releasing New Versions

WhisperHub features automated release builds using GitHub Actions:
1. **Tag your commit** locally when ready for a new version:
   ```bash
   git tag v1.0.0
   ```
2. **Push the tag** to your GitHub repository:
   ```bash
   git push origin v1.0.0
   ```
3. **Automated Publish:** GitHub Actions will detect the tag, spin up a Windows build runner, package the project, and automatically attach the compiled `.exe` files to a new **Draft Release** on your repository. Review the draft and hit publish to release!

---

## Project Architecture

The application is structured as a standard Electron + Vite + React + TypeScript project:

*   **[`src/main/`](file:///D:/Projekti/WhisperHub/src/main)**: Contains the main process code.
    *   **[`discovery.ts`](file:///D:/Projekti/WhisperHub/src/main/discovery.ts)**: Steam installation auto-discovery for PoE 1 (App ID `238960`) and PoE 2 (App ID `2694490`).
    *   **[`whisper-watcher.ts`](file:///D:/Projekti/WhisperHub/src/main/whisper-watcher.ts)**: Passive log file reader tailing logs and parsing `@From` patterns.
    *   **[`index.ts`](file:///D:/Projekti/WhisperHub/src/main/index.ts)**: Initializes the Electron windows, hooks native file selectors, toggles mouse input ignore states, and channels IPC events.
*   **[`src/preload/`](file:///D:/Projekti/WhisperHub/src/preload)**: Contains the context-bridge.
    *   **[`index.ts`](file:///D:/Projekti/WhisperHub/src/preload/index.ts)**: Exposes APIs to the renderer window, including clipboard operations and log watchers under `window.api`.
*   **[`src/renderer/`](file:///D:/Projekti/WhisperHub/src/renderer)**: Contains the frontend code.
    *   **[`src/App.tsx`](file:///D:/Projekti/WhisperHub/src/renderer/src/App.tsx)**: Main React component managing queue states, settings, Web Audio bell synthesis, custom macros, and mouse forwards.
    *   **[`src/index.css`](file:///D:/Projekti/WhisperHub/src/renderer/src/index.css)**: Custom Tailwind CSS styles, layout variables, animations, and custom scrollbar styles.
    *   **[`index.html`](file:///D:/Projekti/WhisperHub/src/renderer/index.html)**: Main HTML skeleton linking Google Fonts Outfit and Cinzel.
*   **[`DESIGN.md`](file:///D:/Projekti/WhisperHub/DESIGN.md)**: Google Stitch token specification mapping colors, layouts, and styles.

---

## Shortcuts Reference

- **Escape Key:** Press `Esc` while the app has focus to close the settings drawer.
- **F12 Key:** Toggle Chrome Developer Tools window during development.
- **Reload Window:** Press `Ctrl + R` (in development mode) to reload the application window.
- **Pasting Commands:** Clicking any macro button automatically copies the command. Press Enter inside the game client, paste (`Ctrl + V`), and press Enter again!

---

## Privacy & anti-Cheat Safety

- **100% Local:** WhisperHub does not communicate with external servers, cloud providers, or APIs. It is fully offline.
- **Log-Based Only:** It reads the game log file (`Client.txt`) created by PoE itself. It **does not** hook into the game process, inject DLLs, or modify memory. This keeps it completely safe from anti-cheat bans.
- **Safe Copy/Paste:** The macro relies on the Windows clipboard rather than automating keystrokes directly into the game client, avoiding any anti-cheat rule violations.
