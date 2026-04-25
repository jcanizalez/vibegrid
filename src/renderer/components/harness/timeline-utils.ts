import type { HarnessMessage, HarnessContentPart } from '../../../shared/harness-types'

/**
 * Grouped display item for the chat timeline.
 * Tool uses with the same name in sequence get collapsed into one group.
 */
export type TimelineItem =
  | { type: 'user'; message: HarnessMessage }
  | { type: 'assistant'; message: HarnessMessage; textParts: HarnessContentPart[] }
  | { type: 'thinking'; text: string; messageId: string }
  | { type: 'tool_group'; toolName: string; items: ToolGroupItem[] }
  | { type: 'streaming'; text: string; thinking: string }

export interface ToolGroupItem {
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
  output?: string
  isError?: boolean
}

/**
 * Groups sequential messages into renderable timeline items.
 * Consecutive tool_use/tool_result messages with the same tool name
 * are collapsed into a single group row.
 */
export function buildTimeline(
  messages: HarnessMessage[],
  streamingText?: string,
  streamingThinking?: string
): TimelineItem[] {
  const items: TimelineItem[] = []
  let pendingToolGroup: ToolGroupItem[] | null = null
  let pendingToolName = ''

  const flushToolGroup = () => {
    if (pendingToolGroup && pendingToolGroup.length > 0) {
      items.push({
        type: 'tool_group',
        toolName: pendingToolName,
        items: pendingToolGroup
      })
      pendingToolGroup = null
      pendingToolName = ''
    }
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      flushToolGroup()
      items.push({ type: 'user', message: msg })
      continue
    }

    // Assistant messages — check what parts they contain
    const textParts = msg.parts.filter((p) => p.type === 'text' || p.type === 'thinking')
    const toolUseParts = msg.parts.filter((p) => p.type === 'tool_use')
    const toolResultParts = msg.parts.filter((p) => p.type === 'tool_result')

    // Thinking parts
    for (const part of msg.parts) {
      if (part.type === 'thinking' && part.text) {
        flushToolGroup()
        items.push({ type: 'thinking', text: part.text, messageId: msg.id })
      }
    }

    // Text-only assistant message
    if (
      textParts.some((p) => p.type === 'text') &&
      toolUseParts.length === 0 &&
      toolResultParts.length === 0
    ) {
      flushToolGroup()
      items.push({
        type: 'assistant',
        message: msg,
        textParts: textParts.filter((p) => p.type === 'text')
      })
      continue
    }

    // Tool use
    for (const part of toolUseParts) {
      if (part.type !== 'tool_use') continue

      if (pendingToolName === part.toolName) {
        // Same tool name — group together
        pendingToolGroup!.push({
          toolUseId: part.toolUseId,
          toolName: part.toolName,
          input: part.input
        })
      } else {
        flushToolGroup()
        pendingToolName = part.toolName
        pendingToolGroup = [
          {
            toolUseId: part.toolUseId,
            toolName: part.toolName,
            input: part.input
          }
        ]
      }
    }

    // Tool results — attach to matching items in current group
    for (const part of toolResultParts) {
      if (part.type !== 'tool_result') continue
      if (pendingToolGroup) {
        const match = pendingToolGroup.find((t) => t.toolUseId === part.toolUseId)
        if (match) {
          match.output = part.output
          match.isError = part.isError
        }
      }
    }
  }

  flushToolGroup()

  // Append streaming content if active
  if (streamingText || streamingThinking) {
    items.push({
      type: 'streaming',
      text: streamingText ?? '',
      thinking: streamingThinking ?? ''
    })
  }

  return items
}

/** Summarize a tool group for collapsed display, returning a structured label. */
export interface ToolGroupSummary {
  /** Verb prefix, e.g. "Ran" / "Running" / "Read" / "Reading" */
  verb: string
  /** Inline detail (path/command/pattern) — rendered as monospace chip when present */
  detail?: string
  /** Suffix shown after detail, e.g. " (×3)" for multiple items */
  suffix?: string
}

export function toolGroupSummary(items: ToolGroupItem[], isRunning: boolean): ToolGroupSummary {
  if (items.length === 1) {
    const item = items[0]
    return {
      verb: toolVerb(item.toolName, isRunning),
      detail: toolDetail(item.toolName, item.input)
    }
  }
  // Multiple items of same tool → collapse
  return {
    verb: toolVerb(items[0].toolName, isRunning),
    suffix: ` ${items.length} ${pluralize(items[0].toolName, items.length)}`
  }
}

function toolVerb(name: string, running: boolean): string {
  const verbs: Record<string, [string, string]> = {
    Read: ['Reading', 'Read'],
    Edit: ['Editing', 'Edited'],
    Write: ['Writing', 'Wrote'],
    MultiEdit: ['Editing', 'Edited'],
    Bash: ['Running', 'Ran'],
    Grep: ['Searching', 'Searched'],
    Glob: ['Finding', 'Found'],
    Task: ['Delegating', 'Delegated'],
    WebFetch: ['Fetching', 'Fetched'],
    WebSearch: ['Searching', 'Searched']
  }
  const pair = verbs[name] ?? [name, name]
  return running ? pair[0] : pair[1]
}

function pluralize(name: string, n: number): string {
  const nouns: Record<string, [string, string]> = {
    Bash: ['command', 'commands'],
    Read: ['file', 'files'],
    Edit: ['edit', 'edits'],
    Write: ['file', 'files'],
    MultiEdit: ['edit', 'edits'],
    Grep: ['search', 'searches'],
    Glob: ['pattern', 'patterns']
  }
  const pair = nouns[name] ?? ['item', 'items']
  return n === 1 ? pair[0] : pair[1]
}

function toolDetail(toolName: string, input: Record<string, unknown>): string | undefined {
  switch (toolName) {
    case 'Read':
    case 'Edit':
    case 'Write':
    case 'MultiEdit': {
      const path = String(input.file_path ?? input.path ?? '')
      return path ? shortenPath(path) : undefined
    }
    case 'Bash': {
      const cmd = String(input.command ?? '').trim()
      if (!cmd) return undefined
      const firstLine = cmd.split('\n')[0]
      return firstLine.length > 64 ? firstLine.slice(0, 64) + '…' : firstLine
    }
    case 'Grep':
      return input.pattern ? `"${String(input.pattern).slice(0, 40)}"` : undefined
    case 'Glob':
      return String(input.pattern ?? input.glob ?? '') || undefined
    case 'WebFetch':
    case 'WebSearch':
      return String(input.url ?? input.query ?? '').slice(0, 60) || undefined
    case 'Task':
      return String(input.description ?? input.subagent_type ?? '').slice(0, 60) || undefined
    default:
      return undefined
  }
}

/** Shorten a long absolute path to its last 2 segments. */
function shortenPath(path: string): string {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 2) return path
  return '…/' + parts.slice(-2).join('/')
}
