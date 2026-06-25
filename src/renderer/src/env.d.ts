import { ElectronAPI } from '@electron-toolkit/preload'

interface Whisper {
  playerName: string
  message: string
  timestamp: string
}

interface CustomAPI {
  onNewWhisper: (callback: (whisper: Whisper) => void) => void
  copyToClipboard: (text: string) => void
  quitApp: () => void
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void
  changeGame: (game: 'poe1' | 'poe2', customPath?: string | null) => void
  onGameStatus: (callback: (status: { game: 'poe1' | 'poe2'; path: string | null; watching: boolean; isCustom: boolean }) => void) => void
  selectLogFile: () => Promise<string | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: CustomAPI
  }
}