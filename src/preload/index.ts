import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  onNewWhisper: (callback) => ipcRenderer.on('new-whisper', (_, whisper) => callback(whisper)),
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  quitApp: () => ipcRenderer.send('quit-app'),
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) =>
    ipcRenderer.send('set-ignore-mouse-events', ignore, options),
  changeGame: (game: 'poe1' | 'poe2', customPath?: string | null) => ipcRenderer.send('change-game', game, customPath),
  onGameStatus: (callback) => ipcRenderer.on('game-status', (_, status) => callback(status)),
  selectLogFile: () => ipcRenderer.invoke('select-log-file')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in d.ts)
  window.electron = electronAPI
  // @ts-ignore (define in d.ts)
  window.api = api
}