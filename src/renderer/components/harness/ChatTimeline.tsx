import { useRef, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Brain } from 'lucide-react'
import { useAppStore } from '../../stores'
import type { HarnessSlice } from '../../stores/harness-slice'
import type { HarnessMessage } from '../../../shared/harness-types'
import { buildTimeline } from './timeline-utils'
import { StreamingMarkdown } from './StreamingMarkdown'
import { ToolGroupRow } from './ToolGroupRow'

const EMPTY_MESSAGES: HarnessMessage[] = []

export function ChatTimeline({ sessionId }: { sessionId?: string } = {}) {
  const fallbackId = useAppStore((s) => (s as unknown as HarnessSlice).activeHarnessSessionId)
  const activeSessionId = sessionId ?? fallbackId
  // Scalar selectors avoid Map reference instability
  const messageCount = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return activeSessionId ? (hs.harnessMessages.get(activeSessionId)?.length ?? 0) : 0
  })
  const streamingText = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return activeSessionId ? (hs.streamingText.get(activeSessionId) ?? '') : ''
  })
  const streamingThinking = useAppStore((s) => {
    const hs = s as unknown as HarnessSlice
    return activeSessionId ? (hs.streamingThinking.get(activeSessionId) ?? '') : ''
  })
  // Read messages imperatively — messageCount triggers re-derive
  const messages = useMemo(() => {
    if (!activeSessionId) return EMPTY_MESSAGES
    const hs = useAppStore.getState() as unknown as HarnessSlice
    return hs.harnessMessages.get(activeSessionId) ?? EMPTY_MESSAGES
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, messageCount])

  const scrollRef = useRef<HTMLDivElement>(null)

  const timeline = useMemo(
    () => buildTimeline(messages, streamingText, streamingThinking),
    [messages, streamingText, streamingThinking]
  )

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [timeline.length, streamingText])

  if (!activeSessionId) {
    return <EmptyState />
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="max-w-[760px] mx-auto px-6 py-6 space-y-4">
        {timeline.map((item, i) => {
          switch (item.type) {
            case 'user':
              return (
                <motion.div
                  key={`user-${item.message.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end pt-2"
                >
                  <div
                    className="max-w-[78%] px-3.5 py-2 rounded-2xl
                               bg-[var(--color-bronzo)]/12 text-[14px] text-gray-200
                               whitespace-pre-wrap break-words"
                  >
                    {item.message.parts
                      .filter((p) => p.type === 'text')
                      .map((p, j) => (
                        <span key={j}>{p.type === 'text' ? p.text : ''}</span>
                      ))}
                  </div>
                </motion.div>
              )

            case 'assistant':
              return (
                <motion.div
                  key={`asst-${item.message.id}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[14px] text-gray-300 leading-relaxed"
                >
                  <StreamingMarkdown
                    text={item.textParts.map((p) => (p.type === 'text' ? p.text : '')).join('')}
                  />
                </motion.div>
              )

            case 'thinking':
              return <ThinkingBlock key={`think-${item.messageId}-${i}`} text={item.text} />

            case 'tool_group':
              return (
                <motion.div key={`tools-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <ToolGroupRow toolName={item.toolName} items={item.items} />
                </motion.div>
              )

            case 'streaming':
              return (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[14px] text-gray-300 leading-relaxed"
                >
                  {item.thinking && <ThinkingBlock text={item.thinking} isStreaming />}
                  {item.text && <StreamingMarkdown text={item.text} isStreaming />}
                  {!item.text && !item.thinking && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-bronzo)] animate-pulse" />
                      Thinking…
                    </div>
                  )}
                </motion.div>
              )
          }
        })}
      </div>
    </div>
  )
}

function ThinkingBlock({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="my-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-400 transition-colors"
      >
        <Brain size={11} />
        <span>Thinking{isStreaming ? '…' : ''}</span>
        {!expanded && (
          <span className="text-gray-600 ml-1">
            (
            {text.length > 1000
              ? `${(text.length / 1000).toFixed(1)}k chars`
              : `${text.length} chars`}
            )
          </span>
        )}
      </button>
      {expanded && (
        <div className="mt-1 px-3 py-2 rounded-md bg-white/[0.02] text-[11px] text-gray-500 italic max-h-40 overflow-y-auto whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <div className="w-12 h-12 rounded-full bg-[var(--color-bronzo)]/10 flex items-center justify-center mb-4">
        <Sparkles size={24} className="text-[var(--color-bronzo)]" />
      </div>
      <h2 className="text-lg font-medium text-gray-200 mb-1">Vorn AI</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        Start a conversation to harness AI directly in your project.
      </p>
    </div>
  )
}
