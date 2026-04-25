import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight,
  Terminal,
  FileEdit,
  Search,
  FolderOpen,
  Check,
  X,
  Loader2,
  FileText,
  Globe
} from 'lucide-react'
import type { ToolGroupItem } from './timeline-utils'
import { toolGroupSummary } from './timeline-utils'

const TOOL_ICONS: Record<string, typeof Terminal> = {
  Bash: Terminal,
  Edit: FileEdit,
  Write: FileEdit,
  MultiEdit: FileEdit,
  Read: FileText,
  Grep: Search,
  Glob: FolderOpen,
  WebFetch: Globe,
  WebSearch: Globe
}

interface ToolGroupRowProps {
  toolName: string
  items: ToolGroupItem[]
}

export function ToolGroupRow({ toolName, items }: ToolGroupRowProps) {
  const [expanded, setExpanded] = useState(false)
  const Icon = TOOL_ICONS[toolName] ?? Terminal
  const allDone = items.every((i) => i.output !== undefined)
  const hasError = items.some((i) => i.isError)
  const isRunning = !allDone
  const summary = toolGroupSummary(items, isRunning)

  return (
    <div className="my-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="group flex items-center gap-2 w-full py-1 -mx-2 px-2 rounded
                   hover:bg-white/[0.03] transition-colors text-left"
      >
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-gray-600 group-hover:text-gray-400"
        >
          <ChevronRight size={11} />
        </motion.span>
        <Icon size={12} className="text-gray-500 flex-shrink-0" />
        <span className="text-[13px] text-gray-400 leading-tight truncate min-w-0">
          {summary.verb}
          {summary.detail && (
            <>
              {' '}
              <span
                className="font-mono text-[12px] text-gray-300 bg-white/[0.05]
                           rounded px-1.5 py-0.5"
              >
                {summary.detail}
              </span>
            </>
          )}
          {summary.suffix && <span className="text-gray-500">{summary.suffix}</span>}
        </span>
        <span className="flex-1" />
        {isRunning ? (
          <Loader2 size={11} className="text-[var(--color-bronzo)] animate-spin flex-shrink-0" />
        ) : hasError ? (
          <X size={11} className="text-red-400/80 flex-shrink-0" />
        ) : (
          <Check size={11} className="text-green-500/60 flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/[0.05] pl-3">
              {items.map((item) => (
                <ToolItemDetail key={item.toolUseId} item={item} multi={items.length > 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ToolItemDetail({ item, multi }: { item: ToolGroupItem; multi: boolean }) {
  const [showOutput, setShowOutput] = useState(false)
  const label = getToolLabel(item.toolName, item.input)
  const hasOutput = item.output !== undefined

  return (
    <div className="text-xs">
      {multi && (
        <button
          onClick={() => hasOutput && setShowOutput(!showOutput)}
          className="flex items-center gap-2 w-full py-0.5 rounded
                     hover:bg-white/[0.03] transition-colors text-left"
          disabled={!hasOutput}
        >
          {!hasOutput ? (
            <Loader2 size={9} className="text-[var(--color-bronzo)] animate-spin flex-shrink-0" />
          ) : item.isError ? (
            <X size={9} className="text-red-400/80 flex-shrink-0" />
          ) : (
            <Check size={9} className="text-green-500/60 flex-shrink-0" />
          )}
          <span className="font-mono text-[11px] text-gray-400 truncate">{label}</span>
        </button>
      )}

      {(showOutput || (!multi && hasOutput)) && item.output && (
        <motion.pre
          initial={multi ? { height: 0, opacity: 0 } : false}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`${multi ? 'ml-4 mt-0.5' : ''} px-2.5 py-1.5 bg-white/[0.02]
                     rounded text-[11px] text-gray-500
                     overflow-x-auto max-h-48 overflow-y-auto font-mono
                     whitespace-pre-wrap break-words`}
        >
          {item.output.length > 4000
            ? item.output.slice(0, 4000) + `\n… (${item.output.length - 4000} more chars)`
            : item.output}
        </motion.pre>
      )}

      {!multi && !hasOutput && (
        <div className="flex items-center gap-2 py-0.5">
          <Loader2 size={9} className="text-[var(--color-bronzo)] animate-spin" />
          <span className="text-[11px] text-gray-500 italic">running…</span>
        </div>
      )}
    </div>
  )
}

function getToolLabel(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'MultiEdit':
      return String(input.file_path ?? input.path ?? 'file')
    case 'Bash':
      return String(input.command ?? 'command').slice(0, 120)
    case 'Grep':
      return `grep "${String(input.pattern ?? '').slice(0, 40)}"`
    case 'Glob':
      return String(input.pattern ?? input.glob ?? 'pattern')
    default:
      return toolName
  }
}
