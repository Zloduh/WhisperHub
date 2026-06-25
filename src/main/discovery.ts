import fs from 'fs'
import path from 'path'

const STEAM_POE1_APP_ID = '238960' // POE 1
const STEAM_POE2_APP_ID = '2694490' // POE 2
const LOG_RELATIVE_PATH = 'logs/Client.txt'

interface SteamLibrary {
  path: string
}

function getSteamRoots(): string[] {
  const candidates = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\SteamLibrary'
  ]
  return candidates.filter((p) => fs.existsSync(path.join(p, 'steamapps')))
}

function getSteamLibraries(roots: string[]): string[] {
  const libraries: string[] = [...roots]

  for (const root of roots) {
    const libraryFile = path.join(root, 'steamapps', 'libraryfolders.vdf')
    if (!fs.existsSync(libraryFile)) continue

    try {
      const content = fs.readFileSync(libraryFile, 'utf8')
      const matches = content.matchAll(/"path"\s+"([^"]+)"/g)
      for (const match of matches) {
        const p = match[1].replace(/\\\\/g, '\\')
        if (fs.existsSync(path.join(p, 'steamapps'))) {
          libraries.push(p)
        }
      }
    } catch (e) {
      console.error('Error reading libraryfolders.vdf:', e)
    }
  }

  return Array.from(new Set(libraries))
}

function findPoeLogPathForApp(appId: string): string | null {
  const roots = getSteamRoots()
  const libraries = getSteamLibraries(roots)

  for (const lib of libraries) {
    const manifestRoot = path.join(lib, 'steamapps')
    const manifestPath = path.join(manifestRoot, `appmanifest_${appId}.acf`)

    if (fs.existsSync(manifestPath)) {
      try {
        const content = fs.readFileSync(manifestPath, 'utf8')
        const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/)
        if (installDirMatch) {
          const installPath = path.join(manifestRoot, 'common', installDirMatch[1])
          const logPath = path.join(installPath, LOG_RELATIVE_PATH)
          if (fs.existsSync(logPath)) {
            return logPath
          }
        }
      } catch (e) {
        console.error(`Error reading manifest ${manifestPath}:`, e)
      }
    }
  }

  return null
}

function findPoe1LogPath(): string | null {
  return findPoeLogPathForApp(STEAM_POE1_APP_ID)
}

function findPoe2LogPath(): string | null {
  return findPoeLogPathForApp(STEAM_POE2_APP_ID)
}

export { findPoe1LogPath, findPoe2LogPath }