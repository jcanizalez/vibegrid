import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, ClipboardPaste } from 'lucide-react'
import {
  getTerminalSelection,
  clearTerminalSelection,
  pasteToTerminal,
  focusTerminal
} from '../lib/terminal-registry'

interface Props {
  terminalId: string
  position: { x: number; y: number }
  onClose: () => void
}

export function TerminalContextMenu({ terminalId, position, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const selection = getTerminalSelection(terminalId)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const close = () => {
    onClose()
    focusTerminal(terminalId)
  }

  const handleCopy = () => {
    if (selection) {
      navigator.clipboard.writeText(selection)
      clearTerminalSelection(terminalId)
    }
    close()
  }

  const handlePaste = () => {
    navigator.clipboard.readText().then((text) => {
      if (text) pasteToTerminal(terminalId, text)
    })
    close()
  }

  const menuWidth = 160
  const menuHeight = 2 * 32 + 16
  const left = Math.max(8, Math.min(position.x, window.innerWidth - menuWidth - 8))
  const top = Math.max(8, Math.min(position.y, window.innerHeight - menuHeight - 8))

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="fixed z-[150] rounded-lg border border-white/[0.1] py-1 shadow-2xl"
        style={{ top, left, background: '#1e1e22', minWidth: menuWidth }}
      >
        <button
          onClick={handleCopy}
          disabled={!selection}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300
                     hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors
                     disabled:opacity-40 disabled:pointer-events-none"
        >
          <Copy size={14} className="text-gray-500" />
          <span>Copy</span>
        </button>
        <button
          onClick={handlePaste}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-gray-300
                     hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors"
        >
          <ClipboardPaste size={14} className="text-gray-500" />
          <span>Paste</span>
        </button>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
