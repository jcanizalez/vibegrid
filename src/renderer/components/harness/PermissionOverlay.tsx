import { useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../stores'
import type { HarnessSlice } from '../../stores/harness-slice'

export function PermissionOverlay({ sessionId }: { sessionId?: string } = {}) {
  const permissionCount = useAppStore((s) => (s as unknown as HarnessSlice).pendingPermissions.size)
  const fallbackId = useAppStore((s) => (s as unknown as HarnessSlice).activeHarnessSessionId)
  const activeSessionId = sessionId ?? fallbackId

  const entries = useMemo(() => {
    if (permissionCount === 0) return []
    const hs = useAppStore.getState() as unknown as HarnessSlice
    return Array.from(hs.pendingPermissions.values())
  }, [permissionCount])

  if (entries.length === 0) return null

  return (
    <AnimatePresence>
      {entries.map((perm) => (
        <PermissionCard key={perm.requestId} {...perm} sessionId={activeSessionId!} />
      ))}
    </AnimatePresence>
  )
}

function PermissionCard({
  requestId,
  toolName,
  input,
  description,
  sessionId
}: {
  requestId: string
  toolName: string
  input: Record<string, unknown>
  description: string
  sessionId: string
}) {
  const handleResolve = async (allowed: boolean): Promise<void> => {
    try {
      await window.api.harnessResolvePermission(sessionId, requestId, allowed)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleResolve(false)
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleResolve(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  const detail = getToolDetail(toolName, input)
  const title = `Allow ${toolName}${description && description !== `${toolName} wants to execute` ? ` — ${description}` : ''}?`

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="max-w-[760px] mx-auto px-5 mb-2 w-full"
    >
      <div className="rounded-md border border-white/[0.08] bg-[#1a1a1e]/95 backdrop-blur-sm">
        <div className="px-3 pt-2 pb-1 text-[12px] text-gray-200">{title}</div>

        {detail && (
          <div className="px-3 pb-1.5">
            <code
              className="block text-[11px] text-gray-400 font-mono
                       overflow-x-auto whitespace-nowrap"
            >
              {detail}
            </code>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2 py-1.5 border-t border-white/[0.04]">
          <button
            onClick={() => handleResolve(false)}
            className="px-2 py-0.5 rounded text-[11px] text-gray-500 hover:text-gray-200
                     hover:bg-white/[0.05] transition-colors"
          >
            Deny <kbd className="ml-1 text-[9px] text-gray-600">esc</kbd>
          </button>
          <span className="flex-1" />
          <button
            onClick={() => handleResolve(true)}
            className="px-2.5 py-0.5 rounded text-[11px] font-medium
                     text-[var(--color-bronzo)] bg-[var(--color-bronzo)]/10
                     hover:bg-[var(--color-bronzo)]/20 transition-colors"
          >
            Allow <kbd className="ml-1 text-[9px] opacity-60">⌘⏎</kbd>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function getToolDetail(toolName: string, input: Record<string, unknown>): string | null {
  switch (toolName) {
    case 'Bash':
      return String(input.command ?? '')
    case 'Edit':
    case 'Write':
      return String(input.file_path ?? input.path ?? '')
    case 'Read':
      return String(input.file_path ?? input.path ?? '')
    default: {
      const keys = Object.keys(input)
      if (keys.length === 0) return null
      return keys.map((k) => `${k}: ${JSON.stringify(input[k]).slice(0, 100)}`).join(' · ')
    }
  }
}
