import { useEffect, useRef } from 'react'
import { registerSlot, unregisterSlot, focusTerminal, fitTerminal } from '../lib/terminal-registry'
import { useStatusDetection } from '../hooks/useStatusDetection'
import { useAppStore } from '../stores'

interface Props {
  terminalId: string
  isFocused: boolean
  className?: string
}

/**
 * A placeholder element that declares "this view wants the terminal rendered
 * here." The actual xterm DOM lives permanently in the singleton TerminalHost
 * and is positioned to overlay this element via fixed-position CSS. Unmounting
 * this component hides the terminal; it does not destroy or reparent it.
 */
export function TerminalSlot({ terminalId, isFocused, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useStatusDetection(terminalId)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    registerSlot(terminalId, el)
    return () => {
      unregisterSlot(terminalId, el)
    }
  }, [terminalId])

  useEffect(() => {
    if (!isFocused) return
    const timer = setTimeout(() => {
      fitTerminal(terminalId)
      focusTerminal(terminalId)
    }, 50)
    return () => clearTimeout(timer)
  }, [isFocused, terminalId])

  const rowHeight = useAppStore((s) => s.rowHeight)
  useEffect(() => {
    const timer = setTimeout(() => fitTerminal(terminalId), 50)
    return () => clearTimeout(timer)
  }, [rowHeight, terminalId])

  return <div ref={ref} className={className} />
}
