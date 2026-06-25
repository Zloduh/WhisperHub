import { useState, useEffect, useRef, useMemo } from 'react'

interface Whisper {
  playerName: string
  message: string
  timestamp: string
  count: number
}

interface GameStatus {
  game: 'poe1' | 'poe2'
  path: string | null
  watching: boolean
  isCustom: boolean
}

function App(): JSX.Element {
  // --- Persistent User Settings ---
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const saved = localStorage.getItem('wh_locked')
    return saved ? JSON.parse(saved) : false
  })
  const [selectedGame, setSelectedGame] = useState<'poe1' | 'poe2'>(() => {
    const saved = localStorage.getItem('wh_selected_game')
    return (saved as 'poe1' | 'poe2') || 'poe2'
  })
  
  // Custom Log File overrides (Epic Games, GGG Standalone, etc)
  const [customPathPoe1, setCustomPathPoe1] = useState<string | null>(() => {
    return localStorage.getItem('wh_custom_path_poe1') || null
  })
  const [customPathPoe2, setCustomPathPoe2] = useState<string | null>(() => {
    return localStorage.getItem('wh_custom_path_poe2') || null
  })

  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('wh_volume')
    return saved ? JSON.parse(saved) : 50
  })
  const [opacity, setOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('wh_opacity')
    return saved ? JSON.parse(saved) : 85
  })
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg'>(() => {
    const saved = localStorage.getItem('wh_textsize')
    return (saved as 'sm' | 'base' | 'lg') || 'base'
  })
  
  // Custom Macros
  const [macro1, setMacro1] = useState<string>(() => localStorage.getItem('wh_macro1') || '/invite {name}')
  const [macro2, setMacro2] = useState<string>(() => localStorage.getItem('wh_macro2') || '@{name} check out my build guide: https://pobb.in/...')
  const [macro3, setMacro3] = useState<string>(() => localStorage.getItem('wh_macro3') || '@{name} one sec, in map')

  const [macro1Label, setMacro1Label] = useState<string>(() => localStorage.getItem('wh_macro1_label') || 'Invite')
  const [macro2Label, setMacro2Label] = useState<string>(() => localStorage.getItem('wh_macro2_label') || 'Build')
  const [macro3Label, setMacro3Label] = useState<string>(() => localStorage.getItem('wh_macro3_label') || 'Wait')

  // --- UI States ---
  const [whispers, setWhispers] = useState<Record<string, Whisper>>({})
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'config' | 'guide'>('config')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [, setTick] = useState<number>(0) // Forces re-render for relative times

  // Refs for stale closures in subscriptions
  const volumeRef = useRef(volume)
  useEffect(() => { volumeRef.current = volume }, [volume])
  
  const isLockedRef = useRef(isLocked)
  useEffect(() => { isLockedRef.current = isLocked }, [isLocked])

  // --- Play synthesized chime sound using Web Audio API ---
  const playChime = (vol: number) => {
    if (vol <= 0) return
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return
      const ctx = new AudioContextClass()
      
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, startTime)
        
        const maxVolume = (vol / 100) * 0.15
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(maxVolume, startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        
        osc.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      // PoE double bell/metallic sound emulation
      playTone(987.77, ctx.currentTime, 0.3) // B5
      playTone(1318.51, ctx.currentTime + 0.07, 0.4) // E6
    } catch (e) {
      console.error('Audio chime failed:', e)
    }
  }

  // --- Save settings to localStorage & sync log watcher state ---
  useEffect(() => {
    localStorage.setItem('wh_locked', JSON.stringify(isLocked))
  }, [isLocked])

  // Unified effect to sync active game selectors and overrides
  useEffect(() => {
    localStorage.setItem('wh_selected_game', selectedGame)
    
    if (customPathPoe1) {
      localStorage.setItem('wh_custom_path_poe1', customPathPoe1)
    } else {
      localStorage.removeItem('wh_custom_path_poe1')
    }
    
    if (customPathPoe2) {
      localStorage.setItem('wh_custom_path_poe2', customPathPoe2)
    } else {
      localStorage.removeItem('wh_custom_path_poe2')
    }

    const activeCustomPath = selectedGame === 'poe1' ? customPathPoe1 : customPathPoe2
    window.api.changeGame(selectedGame, activeCustomPath)
  }, [selectedGame, customPathPoe1, customPathPoe2])

  useEffect(() => {
    localStorage.setItem('wh_volume', JSON.stringify(volume))
  }, [volume])
  useEffect(() => {
    localStorage.setItem('wh_opacity', JSON.stringify(opacity))
  }, [opacity])
  useEffect(() => {
    localStorage.setItem('wh_textsize', textSize)
  }, [textSize])
  useEffect(() => {
    localStorage.setItem('wh_macro1', macro1)
    localStorage.setItem('wh_macro1_label', macro1Label)
  }, [macro1, macro1Label])
  useEffect(() => {
    localStorage.setItem('wh_macro2', macro2)
    localStorage.setItem('wh_macro2_label', macro2Label)
  }, [macro2, macro2Label])
  useEffect(() => {
    localStorage.setItem('wh_macro3', macro3)
    localStorage.setItem('wh_macro3_label', macro3Label)
  }, [macro3, macro3Label])

  // --- Handle Click-Through events to Electron ---
  useEffect(() => {
    if (isLocked) {
      window.api.setIgnoreMouseEvents(true, { forward: true })
    } else {
      window.api.setIgnoreMouseEvents(false)
    }
    return () => {
      window.api.setIgnoreMouseEvents(false)
    }
  }, [isLocked])

  const handleMouseEnterBackground = () => {
    if (isLockedRef.current) {
      window.api.setIgnoreMouseEvents(true, { forward: true })
    }
  }

  const handleMouseEnterInteractive = () => {
    if (isLockedRef.current) {
      window.api.setIgnoreMouseEvents(false)
    }
  }

  // --- Ingest and Group new whispers ---
  const registerNewWhisper = (newWhisper: Omit<Whisper, 'count'>) => {
    setWhispers((prev) => {
      const existing = prev[newWhisper.playerName]
      return {
        ...prev,
        [newWhisper.playerName]: {
          ...newWhisper,
          count: (existing?.count || 0) + 1
        }
      }
    })
    playChime(volumeRef.current)
  }

  useEffect(() => {
    window.api.onNewWhisper((newWhisper) => {
      registerNewWhisper({
        playerName: newWhisper.playerName,
        message: newWhisper.message,
        timestamp: newWhisper.timestamp || new Date().toISOString()
      })
    })

    window.api.onGameStatus((status) => {
      setGameStatus(status)
    })

    // Relative time updater tick (every 10s)
    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 10000)

    // Keyboard bindings for general overlay comfort
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearInterval(interval)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // --- Relative Time Formatter ---
  const getRelativeTime = (timestampStr: string): string => {
    let date: Date
    if (timestampStr.includes('/')) {
      const parts = timestampStr.split(' ')
      const datePart = parts[0].replace(/\//g, '-')
      const timePart = parts[1]
      date = new Date(`${datePart}T${timePart}`)
    } else {
      date = new Date(timestampStr)
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    
    if (isNaN(diffSecs) || diffSecs < 10) return 'now'
    if (diffSecs < 60) return `${diffSecs}s`
    
    const diffMins = Math.floor(diffSecs / 60)
    if (diffMins < 60) return `${diffMins}m`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h`
    
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // --- Sorted and Filtered Whispers ---
  const filteredWhispers = useMemo(() => {
    return Object.values(whispers)
      .filter((w) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return w.playerName.toLowerCase().includes(query) || w.message.toLowerCase().includes(query)
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [whispers, searchQuery])

  const totalUnreadCount = useMemo(() => {
    return Object.values(whispers).reduce((acc, w) => acc + w.count, 0)
  }, [whispers])

  // --- Handlers ---
  const handleClear = (): void => {
    setWhispers({})
  }

  const handleRemove = (name: string): void => {
    setWhispers((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleMacroAction = (playerName: string, macroTemplate: string): void => {
    const command = macroTemplate.replace(/{name}/g, playerName)
    window.api.copyToClipboard(command)
  }

  const triggerMockWhisper = (): void => {
    const names = ['Viewer_42', 'ExileGamer', 'MapCler', 'LootGoblin', 'ShadowX', 'Mercenary_Main', 'WitchCraft']
    const msgs = [
      `Hey streamer, invite me to the party!`,
      `Can I get the build link please?`,
      `Is there any slot left in the group?`,
      `Nice build! Are you playing Mercenary or Witch?`,
      `Can you share the passive skill tree?`,
      `Hey, is there a viewer queue?`
    ]
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomMsg = msgs[Math.floor(Math.random() * msgs.length)]
    
    registerNewWhisper({
      playerName: randomName,
      message: randomMsg,
      timestamp: new Date().toISOString()
    })
  }

  const handleBrowseLog = async () => {
    try {
      const chosenPath = await window.api.selectLogFile()
      if (chosenPath) {
        if (selectedGame === 'poe1') {
          setCustomPathPoe1(chosenPath)
        } else {
          setCustomPathPoe2(chosenPath)
        }
      }
    } catch (e) {
      console.error('File selection canceled or failed:', e)
    }
  }

  const handleResetLogPath = () => {
    if (selectedGame === 'poe1') {
      setCustomPathPoe1(null)
    } else {
      setCustomPathPoe2(null)
    }
  }

  // Text Size Scale Styles
  const fontSizes = {
    sm: { name: 'text-[11px]', msg: 'text-[10px]', count: 'text-[9px]' },
    base: { name: 'text-sm', msg: 'text-xs', count: 'text-[10px]' },
    lg: { name: 'text-base', msg: 'text-sm', count: 'text-[11px]' }
  }

  // Log Watching Indicator Configuration
  const connectionStatus = useMemo(() => {
    if (!gameStatus) return { color: 'bg-slate-600', title: 'Connecting to log watcher...' }
    const gameLabel = gameStatus.game === 'poe1' ? 'PoE 1' : 'PoE 2'
    const sourceLabel = gameStatus.isCustom ? 'Manual Override' : 'Steam Auto-Discovery'
    if (gameStatus.watching) {
      return {
        color: 'bg-emerald-500 animate-pulse',
        title: `Active: Watching ${gameLabel} logs (${sourceLabel})\nFile: ${gameStatus.path}`
      }
    } else {
      return {
        color: 'bg-red-500',
        title: `Warning: ${gameLabel} log file not found (${sourceLabel}).\nClick settings to configure manually.`
      }
    }
  }, [gameStatus])

  // --- COLLAPSED UI MODE ---
  if (isCollapsed) {
    return (
      <div 
        onClick={() => setIsCollapsed(false)}
        onMouseEnter={handleMouseEnterInteractive}
        onMouseLeave={handleMouseEnterBackground}
        className="flex items-center justify-center w-14 h-14 bg-slate-950/95 hover:bg-slate-900 rounded-full border-2 border-[#84633d] shadow-2xl cursor-pointer select-none drag transition-all active:scale-95 animate-glow-pulse"
        title={`WhisperHub (${selectedGame === 'poe1' ? 'PoE 1' : 'PoE 2'}) - Click to Expand`}
      >
        <div className="no-drag flex flex-col items-center justify-center w-full h-full relative">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="24" height="24" className="text-[#e07a1b]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          {totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#e07a1b] text-slate-950 text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border border-slate-950 shadow-md">
              {totalUnreadCount}
            </span>
          )}
        </div>
      </div>
    )
  }

  // --- EXPANDED FULL UI ---
  return (
    <div 
      style={{ backgroundColor: `rgba(10, 10, 12, ${opacity / 100})` }}
      onMouseEnter={handleMouseEnterBackground}
      className={`flex flex-col h-screen text-[#f3e6d8] p-4 font-sans select-none border rounded-xl shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-150 ${
        isLocked ? 'border-[#84633d]/20' : 'border-[#84633d] ring-1 ring-[#84633d]/30'
      }`}
    >
      {/* Decorative Gold Header Top Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#84633d]/60 to-transparent" />

      {/* Header Panel */}
      <div 
        onMouseEnter={handleMouseEnterInteractive}
        className="flex justify-between items-center mb-3 no-drag"
      >
        {/* Left Side: Drag Handle & Lock Toggle */}
        <div className="flex items-center gap-2 flex-1">
          {/* Lock Icon Action Button (Always Interactive) */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            title={isLocked ? "Click to UNLOCK overlay position & drag window" : "Click to LOCK overlay position & enable click-through"}
            className={`p-1 rounded transition-colors ${
              isLocked 
                ? 'bg-amber-600/10 text-amber-500 border border-amber-600/30' 
                : 'bg-emerald-600/10 text-emerald-500 border border-emerald-600/30 hover:bg-emerald-600/20'
            }`}
          >
            {isLocked ? (
              // Locked Padlock SVG
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
            ) : (
              // Unlocked Padlock SVG
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M14.5 9V5.5a4.5 4.5 0 0 0-9 0V6a.75.75 0 0 1-1.5 0v-.5a6 6 0 1 1 12 0V9h.5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h9.5Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* DRAG HANDLE CONTAINER: Only draggable when UNLOCKED */}
          <div 
            title={isLocked ? "Overlay is Locked (Click lock icon to unlock and move)" : "Drag here to move WhisperHub"}
            className={`flex-1 flex items-center gap-2 py-1 pr-4 rounded transition-all ${
              isLocked 
                ? 'cursor-default opacity-85' 
                : 'drag cursor-grab active:cursor-grabbing hover:bg-slate-800/20'
            }`}
          >
            {/* Visual Grab Dots (only when unlocked to indicate drag capability) */}
            {!isLocked && (
              <div className="flex flex-col gap-0.5 opacity-60">
                <div className="flex gap-0.5"><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/></div>
                <div className="flex gap-0.5"><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/></div>
                <div className="flex gap-0.5"><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/><div className="w-0.5 h-0.5 bg-[#f3e6d8] rounded-full"/></div>
              </div>
            )}
            <h1 className="text-xs font-black tracking-widest text-[#e07a1b] drop-shadow-md select-none">
              WHISPERHUB
            </h1>
            <span className="text-[8px] bg-slate-900 text-slate-400 border border-slate-800 px-1 py-0.2 rounded font-black tracking-tighter uppercase select-none">
              {selectedGame === 'poe1' ? 'PoE 1' : 'PoE 2'}
            </span>
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="flex items-center gap-1.5 pl-2">
          {/* Active Log Watcher connection status */}
          <div 
            className={`w-2 h-2 rounded-full mr-1 cursor-help ${connectionStatus.color}`} 
            title={connectionStatus.title}
          />

          {/* Send Mock Whisper Button */}
          <button
            onClick={triggerMockWhisper}
            title="Inject Test Mock Whisper"
            className="p-1 hover:bg-slate-800/80 rounded transition-colors text-slate-400 hover:text-amber-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="14" height="14" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </button>

          {/* Minimize/Collapse Button */}
          <button
            onClick={() => setIsCollapsed(true)}
            title="Minimize to Floating Bubble"
            className="p-1 hover:bg-slate-800/80 rounded transition-colors text-slate-400 hover:text-amber-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="14" height="14" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </button>

          {/* Settings Toggle Gear */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            title="Toggle Customization & Usage Guide"
            className={`p-1 hover:bg-slate-800/80 rounded transition-colors ${isSettingsOpen ? 'text-[#e07a1b]' : 'text-slate-400 hover:text-[#e07a1b]'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width="14" height="14" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869L9.594 3.94ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          </button>

          {/* Close / Quit Application Button */}
          <button
            onClick={() => window.api.quitApp()}
            title="QUIT WhisperHub Application"
            className="w-5 h-5 flex items-center justify-center bg-red-950/40 border border-red-950 hover:bg-red-600 hover:text-white rounded transition-colors text-red-400 font-black text-xs cursor-pointer shadow"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Settings Drawer Panel */}
      {isSettingsOpen && (
        <div 
          onMouseEnter={handleMouseEnterInteractive}
          className="bg-[#0c0c0e]/98 border border-[#84633d]/40 rounded-lg p-3.5 mb-3 flex flex-col gap-3 max-h-[78%] overflow-y-auto no-drag shadow-2xl animate-slide-in relative z-20"
        >
          {/* Settings Tabs Header */}
          <div className="flex border-b border-slate-800 pb-1.5 items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveSettingsTab('config')}
                className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 px-1 transition-all ${activeSettingsTab === 'config' ? 'border-[#e07a1b] text-[#e07a1b]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Config Options
              </button>
              <button
                onClick={() => setActiveSettingsTab('guide')}
                className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 px-1 transition-all ${activeSettingsTab === 'guide' ? 'border-[#e07a1b] text-[#e07a1b]' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Usage Guide / Info
              </button>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="text-[10px] text-slate-500 hover:text-slate-300 font-bold"
            >
              Close ✕
            </button>
          </div>

          {/* Tab 1: Config Options */}
          {activeSettingsTab === 'config' && (
            <div className="flex flex-col gap-3">
              {/* Game Log Diagnostics Info */}
              {!gameStatus?.watching && gameStatus !== null && (
                <div className="text-[10px] bg-red-950/40 border border-red-900/60 text-red-300 p-2.5 rounded">
                  ⚠️ <strong>Log Discovery Failed:</strong> WhisperHub could not locate the active client log file for <strong>{selectedGame === 'poe1' ? 'Path of Exile 1' : 'Path of Exile 2'}</strong>. Click <strong>Browse Client.txt</strong> below to set it manually.
                </div>
              )}

              {/* Sliders Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Opacity Slider */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#7d7872] uppercase font-bold">Opacity ({opacity}%)</label>
                  <input 
                    type="range" min="35" max="100" value={opacity} 
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-[#e07a1b]"
                  />
                </div>

                {/* Volume Slider */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-[#7d7872] uppercase font-bold">Chime Alert ({volume}%)</label>
                  <input 
                    type="range" min="0" max="100" value={volume} 
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-[#e07a1b]"
                  />
                </div>
              </div>

              {/* Text Size Scale & Game selection */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Text Size Scale */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#7d7872] uppercase font-bold">Font Size</span>
                  <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                    {(['sm', 'base', 'lg'] as const).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setTextSize(sz)}
                        className={`flex-1 text-[9px] uppercase font-bold py-1 rounded text-center transition-colors ${textSize === sz ? 'bg-[#e07a1b] text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Game Selection Toggle */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-[#7d7872] uppercase font-bold">Active Game</span>
                  <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
                    {(['poe1', 'poe2'] as const).map((gameKey) => (
                      <button
                        key={gameKey}
                        onClick={() => setSelectedGame(gameKey)}
                        className={`flex-1 text-[9px] uppercase font-bold py-1 rounded text-center transition-colors ${selectedGame === gameKey ? 'bg-[#e07a1b] text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
                      >
                        {gameKey === 'poe1' ? 'PoE 1' : 'PoE 2'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Manual Client.txt Path Picker */}
              <div className="flex flex-col gap-1 border-t border-slate-900 pt-2 col-span-2">
                <span className="text-[10px] text-[#7d7872] uppercase font-bold">
                  Log Source: {gameStatus?.isCustom ? 'Manual Override' : 'Steam Auto-Discovery'}
                </span>
                
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={handleBrowseLog}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-[10px] px-2.5 py-1.5 rounded text-slate-300 font-bold uppercase transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="12" height="12" className="text-[#e07a1b]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776" />
                    </svg>
                    Browse Client.txt
                  </button>

                  {gameStatus?.isCustom && (
                    <button
                      onClick={handleResetLogPath}
                      className="bg-red-950/20 border border-red-900/20 hover:border-red-600/40 text-red-400 text-[9px] px-2 py-1.5 rounded font-black uppercase transition-colors cursor-pointer"
                    >
                      Reset to Steam
                    </button>
                  )}

                  <div className="text-[9px] text-[#7d7872] leading-none select-text truncate max-w-[50%] flex-1 font-mono" title={gameStatus?.path || 'Not watched'}>
                    {gameStatus?.path ? gameStatus.path.split(/[\\/]/).pop() : 'No file selected'}
                  </div>
                </div>
              </div>

              {/* Click-Through Toggle */}
              <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-900 pt-2">
                <div className="flex flex-col gap-1 justify-end col-span-2">
                  <button
                    onClick={() => setIsLocked(!isLocked)}
                    className={`w-full py-1.5 rounded text-[10px] font-bold uppercase transition-colors text-center border ${
                      isLocked 
                        ? 'bg-amber-600/30 text-amber-300 border-amber-600/60' 
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    Overlay Lock: {isLocked ? 'LOCKED' : 'UNLOCKED'}
                  </button>
                </div>
              </div>

              {isLocked && (
                <div className="text-[9px] leading-relaxed text-amber-500/90 bg-amber-500/5 p-2 rounded border border-amber-800/30">
                  ⚠️ <strong>Locked Mode:</strong> Empty background ignores clicks (allowing game click-through). Hovering over header controls, settings panel, and whisper cards temporarily captures mouse clicks.
                </div>
              )}

              {/* Display Watched Log Path */}
              {gameStatus?.watching && (
                <div className="text-[9px] text-[#7d7872] flex flex-col gap-0.5 border-t border-slate-900 pt-2 font-mono">
                  <span className="uppercase text-[8px] font-black text-[#84633d]">Watching File:</span>
                  <span className="truncate select-text" title={gameStatus.path || ''}>{gameStatus.path}</span>
                </div>
              )}

              {/* Customize Macros Section */}
              <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-850">
                <span className="text-[10px] text-[#7d7872] uppercase font-bold">Custom Action Macros</span>
                
                {/* Macro 1 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#f3e6d8]/70">Macro 1</span>
                    <input 
                      type="text" value={macro1Label} 
                      onChange={(e) => setMacro1Label(e.target.value.substring(0, 10))} 
                      placeholder="Label" 
                      className="w-16 bg-slate-900 text-[9px] border border-slate-800 px-1 py-0.5 rounded text-[#e07a1b] text-center" 
                    />
                  </div>
                  <input 
                    type="text" value={macro1} 
                    onChange={(e) => setMacro1(e.target.value)} 
                    className="bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded w-full text-slate-300 font-mono" 
                  />
                </div>

                {/* Macro 2 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#f3e6d8]/70">Macro 2</span>
                    <input 
                      type="text" value={macro2Label} 
                      onChange={(e) => setMacro2Label(e.target.value.substring(0, 10))} 
                      placeholder="Label" 
                      className="w-16 bg-slate-900 text-[9px] border border-slate-800 px-1 py-0.5 rounded text-[#e07a1b] text-center" 
                    />
                  </div>
                  <input 
                    type="text" value={macro2} 
                    onChange={(e) => setMacro2(e.target.value)} 
                    className="bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded w-full text-slate-300 font-mono" 
                  />
                </div>

                {/* Macro 3 */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#f3e6d8]/70">Macro 3</span>
                    <input 
                      type="text" value={macro3Label} 
                      onChange={(e) => setMacro3Label(e.target.value.substring(0, 10))} 
                      placeholder="Label" 
                      className="w-16 bg-slate-900 text-[9px] border border-slate-800 px-1 py-0.5 rounded text-[#e07a1b] text-center" 
                    />
                  </div>
                  <input 
                    type="text" value={macro3} 
                    onChange={(e) => setMacro3(e.target.value)} 
                    className="bg-slate-900 border border-slate-800 text-[10px] px-2 py-1 rounded w-full text-slate-300 font-mono" 
                  />
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => {
                    setMacro1('/invite {name}')
                    setMacro1Label('Invite')
                    setMacro2('@{name} check out my build guide: https://pobb.in/...')
                    setMacro2Label('Build')
                    setMacro3('@{name} one sec, in map')
                    setMacro3Label('Wait')
                  }}
                  className="text-[9px] text-[#7d7872] hover:text-[#e07a1b] uppercase font-bold self-start mt-1 transition-colors"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Usage Guide */}
          {activeSettingsTab === 'guide' && (
            <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-300 pr-1 select-text">
              <div>
                <h3 className="font-bold text-[#e07a1b] mb-1 text-[11px] uppercase">1. How to Move / Reposition</h3>
                <p className="text-[11px] text-slate-400">
                  Ensure the overlay is <strong>Unlocked</strong> by clicking the padlock icon in the top-left (looks like 🔓). Once unlocked, click and drag anywhere on the title bar or the header area labeled <strong>"DRAGGABLE"</strong> to reposition the overlay on your screen.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#e07a1b] mb-1 text-[11px] uppercase">2. Using Click-Through (Overlay Lock)</h3>
                <p className="text-[11px] text-slate-400">
                  Click the lock icon (🔒) in the header to activate <strong>Locked/Click-through</strong> mode. In this mode, the dark empty background ignores mouse clicks, letting you target monsters and items in Path of Exile 1 or 2 without closing the app. Moving your cursor over cards, buttons, or header controls temporarily focuses them so you can click them normally.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#e07a1b] mb-1 text-[11px] uppercase">3. Copying Invite & Response Actions</h3>
                <p className="text-[11px] text-slate-400">
                  Clicking the action buttons (e.g. <strong>Invite</strong>, <strong>Build</strong>, <strong>Wait</strong>) on any whisper card automatically replaces <code className="font-mono text-[10px] bg-slate-900 px-1 py-0.2 rounded text-amber-500">{`{name}`}</code> with the player's name and copies the command to your Windows clipboard. Press <kbd className="bg-slate-900 border border-slate-800 text-[10px] px-1 py-0.2 rounded text-slate-100">Enter</kbd> in-game, paste with <kbd className="bg-slate-900 border border-slate-800 text-[10px] px-1 py-0.2 rounded text-slate-100">Ctrl + V</kbd>, and press <kbd className="bg-slate-900 border border-slate-800 text-[10px] px-1 py-0.2 rounded text-slate-100">Enter</kbd> to execute!
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#e07a1b] mb-1 text-[11px] uppercase">4. How to Close / Exit</h3>
                <p className="text-[11px] text-slate-400">
                  Click the red cross button (<code className="text-red-500 font-bold bg-red-950/40 px-1 border border-red-950 rounded">✕</code>) in the top-right corner of the overlay to shut down WhisperHub. You can also close it by terminating the console or process in development.
                </p>
              </div>

              <div>
                <h3 className="font-bold text-[#e07a1b] mb-1 text-[11px] uppercase">5. Game Selection & Custom Clients</h3>
                <p className="text-[11px] text-slate-400">
                  WhisperHub supports both <strong>Path of Exile 1</strong> and <strong>Path of Exile 2</strong>. In the "Config Options" tab, choose the game you are running. If you are using the standalone client (GGG) or Epic Games Store client, click **Browse Client.txt** to point the app to your logs directory manually (typically `C:\Program Files (x86)\Grinding Gear Games\Path of Exile 2\logs\Client.txt` or equivalent).
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Input Bar (No Drag Area) */}
      <div 
        onMouseEnter={handleMouseEnterInteractive}
        className="mb-3 no-drag relative flex items-center"
      >
        <input
          type="text"
          placeholder={`Filter ${selectedGame === 'poe1' ? 'PoE 1' : 'PoE 2'} whispers...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#141519]/90 text-xs px-3 py-1.5 pl-8 rounded-md border border-[#84633d]/30 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#e07a1b]/60 transition-colors"
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width="14" height="14" className="w-3.5 h-3.5 text-slate-500 absolute left-2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
        </svg>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-[9px] uppercase font-bold text-slate-500 hover:text-slate-300 absolute right-2.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Whisper Scroll Queue */}
      <div className="flex-1 overflow-y-auto space-y-2 no-drag pr-0.5">
        {filteredWhispers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#7d7872] text-xs italic gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="32" height="32" className="w-8 h-8 text-slate-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
            </svg>
            <span>
              {searchQuery ? 'No matching whispers found' : 'Waiting for whispers...'}
            </span>
          </div>
        ) : (
          filteredWhispers.map((w) => (
            <div 
              key={w.playerName}
              onMouseEnter={handleMouseEnterInteractive}
              className="bg-[#161310]/95 hover:bg-[#1f1b16]/95 p-3 rounded-lg border border-[#84633d]/20 hover:border-[#84633d]/60 flex justify-between items-center gap-3 transition-all animate-slide-in relative group"
            >
              {/* Left Details Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-bold text-[#e07a1b] truncate ${fontSizes[textSize].name}`}>
                    {w.playerName}
                  </span>
                  
                  {/* Whisper Badge Count */}
                  <span className={`bg-amber-600/90 text-slate-950 font-black px-1.5 py-0.5 rounded leading-none ${fontSizes[textSize].count}`}>
                    {w.count}
                  </span>

                  {/* Relative Timestamp */}
                  <span className="text-[9px] text-[#7d7872] uppercase font-bold ml-auto">
                    {getRelativeTime(w.timestamp)}
                  </span>
                </div>

                {/* Message string */}
                <p className={`text-slate-400 font-normal italic leading-relaxed line-clamp-2 pr-2 ${fontSizes[textSize].msg}`}>
                  "{w.message}"
                </p>
              </div>

              {/* Action Buttons Right Deck */}
              <div className="flex flex-col gap-1.5 ml-2 self-center z-10 shrink-0">
                <div className="flex gap-1">
                  {/* Macro Button 1 */}
                  {macro1Label && (
                    <button 
                      onClick={() => handleMacroAction(w.playerName, macro1)}
                      title={`Copy: ${macro1.replace(/{name}/g, w.playerName)}`}
                      className="bg-[#e07a1b]/10 hover:bg-[#e07a1b] hover:text-slate-950 border border-amber-600/30 text-amber-400 px-2 py-1 rounded text-[9px] font-black uppercase transition-all transform active:scale-95 shadow-sm cursor-pointer"
                    >
                      {macro1Label}
                    </button>
                  )}

                  {/* Macro Button 2 */}
                  {macro2Label && (
                    <button 
                      onClick={() => handleMacroAction(w.playerName, macro2)}
                      title={`Copy: ${macro2.replace(/{name}/g, w.playerName)}`}
                      className="bg-[#e07a1b]/10 hover:bg-[#e07a1b] hover:text-slate-950 border border-amber-600/30 text-amber-400 px-2 py-1 rounded text-[9px] font-black uppercase transition-all transform active:scale-95 shadow-sm cursor-pointer"
                    >
                      {macro2Label}
                    </button>
                  )}
                </div>

                <div className="flex gap-1 justify-end">
                  {/* Macro Button 3 */}
                  {macro3Label && (
                    <button 
                      onClick={() => handleMacroAction(w.playerName, macro3)}
                      title={`Copy: ${macro3.replace(/{name}/g, w.playerName)}`}
                      className="bg-[#2d2822] hover:bg-[#84633d] hover:text-slate-950 border border-[#84633d]/30 text-slate-300 px-2 py-1 rounded text-[9px] font-black uppercase transition-all transform active:scale-95 cursor-pointer"
                    >
                      {macro3Label}
                    </button>
                  )}

                  {/* Individual Dismiss Button */}
                  <button 
                    onClick={() => handleRemove(w.playerName)}
                    title="Dismiss Whisper"
                    className="bg-red-950/20 border border-red-900/20 hover:border-red-600/40 text-red-500/60 hover:text-red-400 px-2 py-1 rounded text-[9px] uppercase font-bold transition-all transform active:scale-95 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Details Info Bar */}
      <div 
        onMouseEnter={handleMouseEnterInteractive}
        className="mt-3 pt-2 border-t border-slate-900 no-drag flex justify-between items-center text-[9px] text-[#7d7872] uppercase tracking-wider"
      >
        <span>
          {filteredWhispers.length} / {Object.keys(whispers).length} active
        </span>

        {/* Quick Clear All Button */}
        {Object.keys(whispers).length > 0 && (
          <button 
            onClick={handleClear}
            className="hover:text-red-400 transition-colors font-bold uppercase tracking-widest cursor-pointer"
          >
            Clear All Queue
          </button>
        )}

        <span className="text-right">
          {selectedGame === 'poe1' ? 'PoE 1' : 'PoE 2'} Overlay
        </span>
      </div>
    </div>
  )
}

export default App