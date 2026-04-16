import { useEffect, useRef, useState } from 'react'
import {
  setHostRoot,
  syncTerminalOverlay,
  getRegisteredTerminalIds,
  onRegistryChange
} from '../lib/terminal-registry'
import { TerminalContextMenu } from './TerminalContextMenu'

interface CtxMenuState {
  terminalId: string
  x: number
  y: number
}

/**
 * Singleton that owns every xterm DOM element. Consumers render a
 * <TerminalSlot> placeholder that registers itself with the registry;
 * this host reads each slot's bounding rect on every animation frame and
 * positions a fixed-position wrapper to overlay it. The xterm DOM never
 * moves between containers — eliminating flicker from WebGL context
 * interruption and layout reflow when views switch.
 *
 * A per-frame rAF loop is used (not ResizeObserver) because Framer Motion
 * springs animate `transform`, which does not trigger RO. The loop is
 * cheap: syncTerminalOverlay early-returns when the slot rect is unchanged.
 */
export function TerminalHost() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    setHostRoot(el)

    const handleContextMenu = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null
      const wrapper = target?.closest('[data-terminal-id]') as HTMLElement | null
      if (!wrapper) return
      e.preventDefault()
      const terminalId = wrapper.dataset.terminalId
      if (!terminalId) return
      setCtxMenu({ terminalId, x: e.clientX, y: e.clientY })
    }
    el.addEventListener('contextmenu', handleContextMenu)

    // Tick every animation frame so transform-based layout changes
    // (grid reorder springs, card enter/exit) keep the overlay glued to
    // its slot. syncTerminalOverlay is a no-op when nothing changed.
    let rafId = requestAnimationFrame(function tick(): void {
      const ids = getRegisteredTerminalIds()
      for (const id of ids) syncTerminalOverlay(id)
      rafId = requestAnimationFrame(tick)
    })

    // Force a re-sync pass whenever a terminal is created or destroyed so
    // freshly-created wrappers position correctly before their first frame.
    const unsubscribe = onRegistryChange(() => {
      for (const id of getRegisteredTerminalIds()) syncTerminalOverlay(id)
    })

    return () => {
      el.removeEventListener('contextmenu', handleContextMenu)
      cancelAnimationFrame(rafId)
      unsubscribe()
      setHostRoot(null)
    }
  }, [])

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 40
        }}
        aria-hidden="true"
      />
      {ctxMenu && (
        <TerminalContextMenu
          terminalId={ctxMenu.terminalId}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  )
}
