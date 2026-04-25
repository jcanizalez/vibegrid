import { memo, useMemo } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface StreamingMarkdownProps {
  text: string
  isStreaming?: boolean
}

/**
 * Renders markdown with a stable/unstable split for streaming.
 * The stable prefix (up to last complete paragraph) is memoized.
 * The unstable suffix is re-rendered on each delta.
 */
export const StreamingMarkdown = memo(function StreamingMarkdown({
  text,
  isStreaming = false
}: StreamingMarkdownProps) {
  const { stableText, unstableText } = useMemo(() => {
    if (!isStreaming) {
      return { stableText: text, unstableText: '' }
    }
    const idx = text.lastIndexOf('\n\n')
    if (idx <= 0) {
      return { stableText: '', unstableText: text }
    }
    return {
      stableText: text.slice(0, idx),
      unstableText: text.slice(idx)
    }
  }, [text, isStreaming])

  return (
    <div className="harness-markdown prose prose-invert prose-sm max-w-none">
      {stableText && <MemoizedMarkdown text={stableText} />}
      {unstableText && <Markdown remarkPlugins={[remarkGfm]}>{unstableText}</Markdown>}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-[var(--color-bronzo)] rounded-sm animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  )
})

const MemoizedMarkdown = memo(function MemoizedMarkdown({ text }: { text: string }) {
  return <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
})
