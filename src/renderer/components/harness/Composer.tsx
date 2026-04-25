import { useState, useRef, useCallback } from 'react'
import { Send, Square } from 'lucide-react'
import { useAppStore } from '../../stores'
import type { HarnessSlice } from '../../stores/harness-slice'

export function Composer({ sessionId }: { sessionId?: string } = {}) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fallbackId = useAppStore((s) => (s as unknown as HarnessSlice).activeHarnessSessionId)
  const activeSessionId = sessionId ?? fallbackId
  // Select only the scalar status to avoid Map reference churn
  const sessionStatus = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return activeSessionId ? hs.harnessSessions.get(activeSessionId)?.status : undefined
  })

  const isStreaming = sessionStatus === 'streaming'

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return

    if (!activeSessionId) {
      // Create a new session with the first message
      try {
        const config = useAppStore.getState().config
        const project = config?.projects?.[0]
        const cwd = project?.path ?? process.cwd?.() ?? '/'

        const newSession = await window.api.harnessCreateSession('claude', {
          cwd,
          initialMessage: text
        })

        const hs = useAppStore.getState() as unknown as HarnessSlice
        hs.setActiveHarnessSession(newSession.id)
        hs.addUserMessage(newSession.id, text)
      } catch (err) {
        console.error('[harness] failed to create session:', err)
      }
    } else {
      // Send to existing session
      const hs = useAppStore.getState() as unknown as HarnessSlice
      hs.addUserMessage(activeSessionId, text)
      try {
        await window.api.harnessSendMessage(activeSessionId, text)
      } catch (err) {
        console.error('[harness] failed to send message:', err)
      }
    }

    setInput('')
    textareaRef.current?.focus()
  }, [input, activeSessionId])

  const handleInterrupt = useCallback(async () => {
    if (!activeSessionId) return
    try {
      await window.api.harnessInterrupt(activeSessionId)
    } catch (err) {
      console.error('[harness] failed to interrupt:', err)
    }
  }, [activeSessionId])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (isStreaming) {
          handleInterrupt()
        } else {
          handleSend()
        }
        return
      }
      // Esc on empty composer aborts the in-flight turn (OpenCode pattern).
      if (e.key === 'Escape' && isStreaming && !input.trim()) {
        e.preventDefault()
        handleInterrupt()
      }
    },
    [handleSend, handleInterrupt, isStreaming, input]
  )

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [])

  return (
    <div className="px-5 pb-4 pt-2">
      <div className="max-w-[760px] mx-auto">
        <div
          className="flex items-end gap-2 rounded-2xl border border-white/[0.06]
                        bg-white/[0.025] focus-within:border-white/[0.12]
                        transition-colors px-3.5 py-2.5"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={activeSessionId ? 'Type / for commands' : 'Start a conversation…'}
            rows={1}
            className="flex-1 bg-transparent text-[14px] text-gray-200 placeholder-gray-600
                       resize-none outline-none min-h-[24px] max-h-[200px] leading-relaxed"
          />
          {isStreaming ? (
            <button
              onClick={handleInterrupt}
              className="flex items-center justify-center w-7 h-7 rounded-lg
                         bg-white/[0.06] text-gray-300 hover:bg-white/[0.10] transition-colors
                         flex-shrink-0"
              title="Interrupt (Enter)"
            >
              <Square size={11} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="flex items-center justify-center w-7 h-7 rounded-lg
                         bg-[var(--color-bronzo)]/15 text-[var(--color-bronzo)]
                         hover:bg-[var(--color-bronzo)]/25 transition-colors
                         disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
              title="Send (Enter)"
            >
              <Send size={11} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5 px-1 h-3.5">
          <span className="text-[10px] text-gray-600">
            {sessionStatus === 'waiting_permission' && '⏳ Waiting for permission…'}
            {isStreaming && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-[var(--color-bronzo)] animate-pulse" />
                Streaming
              </span>
            )}
          </span>
          <span className="text-[10px] text-gray-700">
            {activeSessionId ? '↵ send · ⇧↵ newline' : '↵ to start'}
          </span>
        </div>
      </div>
    </div>
  )
}
