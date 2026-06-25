import fs from 'fs'
import { EventEmitter } from 'events'

export interface Whisper {
  playerName: string
  message: string
  timestamp: string
}

export class WhisperWatcher extends EventEmitter {
  private logPath: string
  private fileSize: number = 0
  private watcher: fs.FSWatcher | null = null

  constructor(logPath: string) {
    super()
    this.logPath = logPath
  }

  start(): void {
    if (!fs.existsSync(this.logPath)) {
      console.error(`Log file not found: ${this.logPath}`)
      return
    }

    this.fileSize = fs.statSync(this.logPath).size
    
    // Initial read from current end of file
    this.watcher = fs.watch(this.logPath, (event) => {
      if (event === 'change') {
        this.processChange()
      }
    })
    
    console.log(`Started watching log: ${this.logPath}`)
  }

  stop(): void {
    this.watcher?.close()
  }

  private processChange(): void {
    const stats = fs.statSync(this.logPath)
    if (stats.size < this.fileSize) {
      // File was likely truncated/rotated
      this.fileSize = 0
    }

    if (stats.size === this.fileSize) return

    const stream = fs.createReadStream(this.logPath, {
      start: this.fileSize,
      end: stats.size
    })

    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk.toString()
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        this.parseLine(line)
      }
    })

    stream.on('end', () => {
      this.fileSize = stats.size
    })
  }

  private parseLine(line: string): void {
    // Standard POE log format: 2024/05/14 12:49:00 123 456 [INFO Client 1234] @From <Guild> Player: Message
    const whisperMatch = line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*@From\s+(?:<[^>]+>\s+)?([^:]+):\s+(.*)$/)
    
    if (whisperMatch) {
      const whisper: Whisper = {
        timestamp: whisperMatch[1],
        playerName: whisperMatch[2].trim(),
        message: whisperMatch[3].trim()
      }
      this.emit('whisper', whisper)
    }
  }
}