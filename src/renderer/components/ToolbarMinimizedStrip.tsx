import { useEffect, useRef, useState } from 'react'
import { ChevronsLeft, ChevronsRight, Layers } from 'lucide-react'
import { useAppStore } from '../stores'
import { useVisibleTerminals } from '../hooks/useVisibleTerminals'
import { MinimizedPill } from './MinimizedPill'

const MAX_INLINE = 6

export function ToolbarMinimizedStrip() {
  const placement = useAppStore((s) => s.config?.defaults?.minimizedPlacement ?? 'toolbar')
  const collapsed = useAppStore((s) => s.toolbarMinimizedCollapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleToolbarMinimizedCollapsed)
  const { minimizedIds } = useVisibleTerminals()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!popoverOpen) return
    const onDown = (e: MouseEvent): void => {
      // Treat a missing anchor as "outside" so the popover still closes if the
      // overflow button (or collapsed badge) unmounts while open — e.g. the
      // user restored every minimized session.
      if (!popoverRef.current || !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [popoverOpen])

  if (placement === 'canvas' || minimizedIds.length === 0) return null

  const count = minimizedIds.length

  if (collapsed) {
    return (
      <div ref={popoverRef} className="relative flex items-center titlebar-no-drag">
        <button
          type="button"
          onClick={() => setPopoverOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-[26px] px-2
                     rounded-md border border-white/[0.06] bg-[#1a1a1e]
                     text-[11px] font-medium text-gray-300
                     hover:text-white hover:border-white/[0.12] transition-colors"
          title={`${count} minimized`}
          aria-haspopup="dialog"
          aria-expanded={popoverOpen}
          aria-label={`${count} minimized sessions`}
        >
          <Layers size={11} strokeWidth={1.5} />
          <span className="font-mono leading-none">{count}</span>
        </button>

        {popoverOpen && (
          <div
            role="dialog"
            aria-label="Minimized sessions"
            className="absolute top-full left-0 mt-1.5 z-50 p-1.5
                       flex flex-col gap-1 max-h-[60vh] overflow-y-auto min-w-[200px]
                       bg-[#1a1a1e] border border-white/[0.08] rounded-md shadow-lg"
          >
            <div className="flex items-center justify-between px-1.5 pb-1.5 mb-1 border-b border-white/[0.06]">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {count} minimized
              </span>
              <button
                type="button"
                onClick={() => {
                  setPopoverOpen(false)
                  toggleCollapsed()
                }}
                className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white transition-colors"
                title="Expand strip"
              >
                <ChevronsRight size={11} strokeWidth={1.75} />
                Expand
              </button>
            </div>
            <div onClick={() => setPopoverOpen(false)} className="flex flex-col gap-1">
              {minimizedIds.map((id) => (
                <MinimizedPill key={id} terminalId={id} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const inline = minimizedIds.slice(0, MAX_INLINE)
  const overflow = minimizedIds.slice(MAX_INLINE)

  return (
    <div className="flex items-center gap-1.5 min-w-0 titlebar-no-drag">
      <div className="flex items-center gap-1.5 overflow-hidden">
        {inline.map((id) => (
          <MinimizedPill key={id} terminalId={id} />
        ))}
      </div>

      {overflow.length > 0 && (
        <div ref={popoverRef} className="relative flex items-center">
          <button
            type="button"
            onClick={() => setPopoverOpen((v) => !v)}
            className="inline-flex items-center justify-center h-[26px] min-w-[28px] px-1.5
                       rounded-md border border-white/[0.06] bg-[#1a1a1e]
                       text-[11px] font-medium text-gray-400
                       hover:text-white hover:border-white/[0.12] transition-colors"
            title={`${overflow.length} more minimized`}
            aria-haspopup="dialog"
            aria-expanded={popoverOpen}
          >
            +{overflow.length}
          </button>

          {popoverOpen && (
            <div
              role="dialog"
              aria-label="Additional minimized sessions"
              className="absolute top-full right-0 mt-1.5 z-50 p-1.5
                         flex flex-col gap-1 max-h-[60vh] overflow-y-auto
                         bg-[#1a1a1e] border border-white/[0.08] rounded-md shadow-lg"
              onClick={() => setPopoverOpen(false)}
            >
              {overflow.map((id) => (
                <MinimizedPill key={id} terminalId={id} />
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggleCollapsed}
        className="inline-flex items-center justify-center h-[22px] w-[22px]
                   rounded text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
        title="Collapse to badge"
        aria-label="Collapse minimized strip"
      >
        <ChevronsLeft size={12} strokeWidth={1.75} />
      </button>
    </div>
  )
}
