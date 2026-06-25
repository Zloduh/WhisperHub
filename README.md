# WhisperHub

**WhisperHub** is a lightweight, standalone, always-on-top Electron overlay for **Path of Exile 2 (PoE 2)**. It aggregates in-game audience/player whispers (`@From`) into a clean, grouped list. This allows streamers, traders, and players to manage repetitive whisper requests (such as build info, trades, or group invites) efficiently without tab-targeting out of the game.

---

## Table of Contents
1. [Key Features](#key-features)
2. [How It Works](#how-it-works)
3. [Window Controls & Dragging](#window-controls--dragging)
4. [Getting Started & Installation](#getting-started--installation)
5. [Project Architecture](#project-architecture)
6. [Shortcut Reference](#shortcut-reference)
7. [Privacy & Anti-Cheat Safety](#privacy--anti-cheat-safety)
8. [Developer Resources & References](#developer-resources--references)

---

## Key Features

- **Frameless Overlay:** Runs as a transparent, borderless window that floats on top of the PoE 2 client.
- **Smart Aggregation:** Group whispers dynamically by `PlayerName`. Shows a notification count badge, the latest received message, and automatically sorts the list so that the most recent message is at the top.
- **Invite Macro:** Click **Invite** next to any player name to instantly copy `/invite <PlayerName>` to your clipboard. Simply press enter in-game and paste (`Ctrl + V`) to send an invite.
- **List Management:** Individual **Dismiss** to remove a single player, and a **Clear All** button to purge the current session's queue.
- **Zero Game Hooks:** Operates passively by reading the local game log file, ensuring 100% compliance with game rules and safety policies.

---

## How It Works

1. **Auto-Discovery:** On startup, the app checks standard Windows Steam locations and parses Steam VDF library files (`libraryfolders.vdf` and `appmanifest_2694490.acf`) to find the Path of Exile 2 installation folder and locate the `Client.txt` log.
2. **Log Tailing:** Using a Node.js filesystem watcher, WhisperHub tails `Client.txt` passively. It detects when new lines are appended without holding file locks or consuming significant CPU resources.
3. **Whisper Parsing:** The app matches incoming lines against PoE 2's chat format:
   ```regex
   @From (?:<Guild> )?PlayerName: message
   ```
4. **IPC Communication:** The main process parses the whispers and passes them to the React frontend in real-time.

---

## Window Controls & Dragging

Since WhisperHub is completely borderless and frameless, it uses custom CSS regions for movement:
- **Move Window:** You can click and drag **any empty area** of the overlay window (such as the header bar or the container background) to reposition it on your monitor.
- **Interactive Buttons:** Buttons (Invite, Dismiss, Clear All, and Exit) are exempted from dragging so that you can click them normally.
- **Quit Application:** Click the red cross (`✕`) button in the top-right corner to exit WhisperHub.

---

## Getting Started & Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Path of Exile 2** installed via Steam on Windows (the app will auto-detect the Steam installation path).

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

---

## Project Architecture

The application is structured as a standard Electron + Vite + React + TypeScript project:

*   **[`src/main/`](file:///D:/Projekti/WhisperHub/src/main)**: Contains the main process code.
    *   **[`discovery.ts`](file:///D:/Projekti/WhisperHub/src/main/discovery.ts)**: Handles searching for Steam root directories and libraries to find the PoE 2 install path and the `Client.txt` file.
    *   **[`whisper-watcher.ts`](file:///D:/Projekti/WhisperHub/src/main/whisper-watcher.ts)**: Watches/tails the log file in real-time, matching lines using regular expressions to emit parsed whispers.
    *   **[`index.ts`](file:///D:/Projekti/WhisperHub/src/main/index.ts)**: Initializes the Electron windows, sets window parameters (transparency, always-on-top), handles application IPC commands (clipboard copy, quit), and hooks the whisper watcher to the renderer.
*   **[`src/preload/`](file:///D:/Projekti/WhisperHub/src/preload)**: Contains the context-bridge.
    *   **[`index.ts`](file:///D:/Projekti/WhisperHub/src/preload/index.ts)**: Exposes APIs to the renderer window, including clipboard operations and log watchers under `window.api`.
*   **[`src/renderer/`](file:///D:/Projekti/WhisperHub/src/renderer)**: Contains the frontend code.
    *   **[`src/App.tsx`](file:///D:/Projekti/WhisperHub/src/renderer/src/App.tsx)**: The React component managing state, list aggregation, sorting, and UI layout.
    *   **[`src/index.css`](file:///D:/Projekti/WhisperHub/src/renderer/src/index.css)**: Custom Tailwind CSS classes, styling the custom webkit scrollbar and specifying drag/no-drag regions.
*   **[`package.json`](file:///D:/Projekti/WhisperHub/package.json)**: Scripts, configuration, and dependencies.

---

## Shortcut Reference

- **Development DevTools:** Press `F12` while the app is in focus (only during development mode) to toggle the Chrome Developer Tools window for debugging.
- **Reload Window:** Press `Ctrl + R` (in development mode) to reload the application window.
- **Pasting Invites:** After clicking **Invite**, use `Ctrl + V` inside the PoE 2 chat bar to paste the generated invite command.

---

## Privacy & Anti-Cheat Safety

- **100% Client-Side:** WhisperHub operates entirely on your local machine. It does not contact any external APIs, analytics servers, or databases.
- **Log-Based Only:** It reads the game log file (`Client.txt`) created by PoE 2 itself. It **does not** hook into the game process, inject DLLs, or modify memory. This keeps it completely safe from anti-cheat bans.
- **Safe Copy/Paste:** The macro relies on the Windows clipboard rather than automating keystrokes directly into the game client, avoiding any rule violations regarding automated multi-action macros.

---

## Developer Resources & References

If you need to research or modify game log ingestion or discovery, the following specifications and scripts are available in the workspace:
- **[`PLAN.md`](file:///D:/Projekti/WhisperHub/PLAN.md)**: The original project roadmap, detailing design requirements, architecture, and overlay interactions.
- **[`log-requirements-reference.md`](file:///D:/Projekti/WhisperHub/log-requirements-reference.md)**: Detailed specifications on log ingestion boundaries, validation workflows, and privacy guidelines.
- **[`discover-game-reference.ps1`](file:///D:/Projekti/WhisperHub/discover-game-reference.ps1)**: A reference PowerShell script containing initial path discovery algorithms using Steam's library format.
- **[`classify-poe2-reference.ps1`](file:///D:/Projekti/WhisperHub/classify-poe2-reference.ps1)**: A helper script containing common regex match classifications for rendering devices, network events, and client startup logs.
