import { app, shell, BrowserWindow, ipcMain, clipboard, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { findPoe1LogPath, findPoe2LogPath } from './discovery'
import { WhisperWatcher } from './whisper-watcher'

let watcher: WhisperWatcher | null = null
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron.whisperhub')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC Handlers
  ipcMain.on('copy-to-clipboard', (_, text) => {
    clipboard.writeText(text)
  })

  ipcMain.on('quit-app', () => {
    app.quit()
  })

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.setIgnoreMouseEvents(ignore, options)
    }
  })

  ipcMain.on('change-game', (_, game: 'poe1' | 'poe2', customPath?: string | null) => {
    let logPath = customPath
    const isCustom = !!customPath

    if (!logPath) {
      logPath = game === 'poe1' ? findPoe1LogPath() : findPoe2LogPath()
    }
    
    if (watcher) {
      watcher.stop()
      watcher = null
    }

    if (logPath && fs.existsSync(logPath) && mainWindow) {
      watcher = new WhisperWatcher(logPath)
      watcher.on('whisper', (whisper) => {
        mainWindow?.webContents.send('new-whisper', whisper)
      })
      watcher.start()
      mainWindow.webContents.send('game-status', { game, path: logPath, watching: true, isCustom })
    } else if (mainWindow) {
      mainWindow.webContents.send('game-status', { game, path: logPath || null, watching: false, isCustom })
    }
  })

  ipcMain.handle('select-log-file', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Path of Exile Client.txt Log File',
      filters: [{ name: 'Log Files', extensions: ['txt'] }],
      properties: ['openFile']
    })
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0]
    }
    return null
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})