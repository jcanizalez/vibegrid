import { useEffect, useState } from 'react'
import { isMac, isWeb } from '../lib/platform'

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (isMac || isWeb) return
    window.api.isWindowMaximized().then(setIsMaximized)
    return window.api.onWindowMaximizedChange(setIsMaximized)
  }, [])

  if (isMac || isWeb) return null
  return (
    <div className="flex items-center titlebar-no-drag ml-2">
      <button
        onClick={() => window.api.windowMinimize()}
        className="w-[46px] h-[32px] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
        title="Minimize"
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor" className="text-gray-400">
          <rect width="10" height="1" />
        </svg>
      </button>
      <button
        onClick={() => window.api.windowMaximize()}
        className="w-[46px] h-[32px] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-400"
          >
            <rect x="2.5" y="0.5" width="7" height="7" />
            <rect x="0.5" y="2.5" width="7" height="7" fill="#1a1a1e" />
          </svg>
        ) : (
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-400"
          >
            <rect x="0.5" y="0.5" width="9" height="9" />
          </svg>
        )}
      </button>
      <button
        onClick={() => window.api.windowClose()}
        className="w-[46px] h-[32px] flex items-center justify-center hover:bg-red-500/80 transition-colors group"
        title="Close"
        aria-label="Close"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="text-gray-400 group-hover:text-white"
        >
          <path d="M1 1l8 8M9 1l-8 8" />
        </svg>
      </button>
    </div>
  )
}
