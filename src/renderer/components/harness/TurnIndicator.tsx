import { useEffect, useState } from 'react'
import { Sparkle } from 'lucide-react'
import { useAppStore } from '../../stores'
import type { HarnessSlice } from '../../stores/harness-slice'

interface Props {
  sessionId: string
}

/**
 * Compact running-status row above the composer.
 * Shows a bronzo asterisk + elapsed seconds + "esc to interrupt" while a
 * turn is in flight. One row total — per-tool spinners aren't needed.
 */
export function TurnIndicator({ sessionId }: Props) {
  const status = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return hs.harnessSessions.get(sessionId)?.status
  })
  const startedAt = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return hs.turnStartedAt.get(sessionId) ?? null
  })

  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  if (!startedAt || (status !== 'streaming' && status !== 'waiting_permission')) {
    return null
  }

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  const label = status === 'waiting_permission' ? 'waiting on you' : formatElapsed(elapsed)

  return (
    <div className="max-w-[760px] mx-auto px-5 w-full">
      <div className="flex items-center gap-2 pb-1.5 pt-0.5 text-[11px] text-gray-500">
        <Sparkle size={11} className="text-[var(--color-bronzo)] animate-pulse" />
        <span>{label}</span>
        {status === 'streaming' && (
          <>
            <span className="text-gray-700">·</span>
            <span className="text-gray-600">esc to interrupt</span>
          </>
        )}
      </div>
    </div>
  )
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
