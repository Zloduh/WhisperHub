# Plan: POE 2 Whisper Overlay (Standalone)

## Objective
Create a fast, standalone Electron-based overlay for Path of Exile 2 that aggregates audience whispers for streamers, making it easy to see repetitive build requests and send party invites.

## Architecture & Tech Stack
- **Framework:** Electron (allows transparent, always-on-top overlay windows).
- **Frontend:** Vite + React + Tailwind CSS (for rapid UI development and clean styling).
- **Log Parsing:** Node.js `fs.watch` or `tail` module to continuously read the POE 2 `Client.txt` file.
- **Macro Execution:** 
  - **Primary (User Approved):** Automated keystroke injection (simulate `Enter` -> paste `/invite <PlayerName>` -> `Enter`) using a library like `nut.js` or `robotjs`.
  - **Fallback:** Copy `/invite <PlayerName>` to clipboard for manual pasting.

## Key Components

### 1. Log Discovery & Tailing
- Reuse the log discovery logic identified in WinMon (`scripts/discover-game.ps1`) to automatically find the POE 2 install directory via Steam VDF files.
- Monitor `logs/Client.txt`.

### 2. Whisper Parser
- **Target Regex:** Match lines containing `@From`. 
  - Format: `[INFO Client <PID>] @From <GuildName> PlayerName: The whisper message`
  - Regex: `@From\s+(?:<[^>]+>\s+)?([^\s:]+):\s+(.*)`
- Extract `PlayerName` and `Message`.

### 3. Aggregation Engine
- Maintain a state object grouping whispers by `PlayerName`.
- Update the state when a new whisper arrives:
  - Increment `count`.
  - Update `latestMessage`.
  - Update `timestamp` (to sort recent whispers to the top).

### 4. Overlay UI
- **Window:** Frameless, transparent background, always on top.
- **List View:** Clean list showing `PlayerName`, `Count` (e.g., a badge), and `latestMessage`.
- **Interactions:**
  - **Invite Button:** Triggers the macro sequence (`/invite <PlayerName>`).
  - **Dismiss Button:** Removes the player from the active list.
  - **Clear All:** Clears the entire list.

## Implementation Steps
1. **Initialize Project:** Scaffold a new Electron+Vite+React project.
2. **Implement Log Reader:** Port the file discovery and tailing logic to Node.js.
3. **Build Aggregation Logic:** Create the React state management for grouping whispers.
4. **Develop UI:** Build the transparent overlay and list components.
5. **Integrate Macro:** Add `nut.js` and implement the invite button logic.
6. **Package:** Build a standalone `.exe` for distribution.

## Verification
- Test against a mock `Client.txt` file appending `@From` messages.
- Test the overlay transparency and click-through (if needed).
- Verify the macro correctly inputs text into an active notepad/game window.