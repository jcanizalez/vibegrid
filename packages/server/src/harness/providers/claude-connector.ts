import { randomUUID } from 'node:crypto'
import type {
  ProviderConnector,
  HarnessProviderId,
  ProviderInfo,
  HarnessSession,
  HarnessEvent,
  StartSessionOpts,
  ResumeSessionOpts
} from '@vornrun/shared/harness-types'
import type {
  Query,
  SDKMessage,
  SDKUserMessage,
  CanUseTool,
  PermissionResult
} from '@anthropic-ai/claude-agent-sdk'
import { query as createQuery } from '@anthropic-ai/claude-agent-sdk'
import { permissionBridge } from '../permission-bridge'
import log from '../../logger'

type EventHandler = (event: HarnessEvent) => void

interface ActiveSession {
  session: HarnessSession
  query: Query
  abortController: AbortController
  /** Async iterable input for multi-turn */
  inputQueue: SDKUserMessage[]
  inputResolve: ((msg: SDKUserMessage) => void) | null
}

/**
 * Claude provider connector.
 * Uses @anthropic-ai/claude-agent-sdk to spawn Claude Code as a subprocess
 * and communicate via the full agent runtime (tools, permissions, streaming).
 */
export class ClaudeConnector implements ProviderConnector {
  readonly providerId: HarnessProviderId = 'claude'
  private sessions = new Map<string, ActiveSession>()
  private eventHandlers = new Set<EventHandler>()

  async isAvailable(): Promise<boolean> {
    try {
      const { execFileSync } = await import('node:child_process')
      execFileSync('claude', ['--version'], {
        encoding: 'utf-8',
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      })
      return true
    } catch {
      return false
    }
  }

  async getInfo(): Promise<ProviderInfo> {
    return {
      id: 'claude',
      name: 'Claude',
      available: await this.isAvailable(),
      models: [
        { id: 'sonnet', name: 'Claude Sonnet', supportsStreaming: true },
        { id: 'opus', name: 'Claude Opus', supportsStreaming: true },
        { id: 'haiku', name: 'Claude Haiku', supportsStreaming: true }
      ],
      capabilities: []
    }
  }

  async startSession(opts: StartSessionOpts): Promise<HarnessSession> {
    const sessionId = randomUUID()
    const abortController = new AbortController()

    const session: HarnessSession = {
      id: sessionId,
      providerId: 'claude',
      modelId: opts.modelId ?? 'sonnet',
      status: 'initializing',
      cwd: opts.cwd,
      createdAt: new Date().toISOString()
    }

    // Permission handler that bridges to our UI
    const canUseTool: CanUseTool = async (toolName, input, options) => {
      return this.handlePermissionRequest(sessionId, toolName, input, options)
    }

    // Create the input stream for multi-turn
    const inputQueue: SDKUserMessage[] = []
    // eslint-disable-next-line prefer-const
    let inputResolve: ((msg: SDKUserMessage) => void) | null = null

    // Queue the initial message before setting up the stream
    if (opts.initialMessage) {
      inputQueue.push({
        type: 'user',
        message: { role: 'user', content: opts.initialMessage },
        parent_tool_use_id: null
      })
    }

    // Register session first so the input stream can find it
    const active: ActiveSession = {
      session,
      query: null as unknown as Query,
      abortController,
      inputQueue,
      inputResolve
    }
    this.sessions.set(sessionId, active)

    const inputStream = this.createInputStream(sessionId)

    const q = createQuery({
      prompt: inputStream,
      options: {
        cwd: opts.cwd,
        model: opts.modelId,
        abortController,
        canUseTool,
        includePartialMessages: true,
        includeHookEvents: true,
        systemPrompt: opts.systemPrompt
      }
    })

    active.query = q

    // Start processing the stream in the background
    this.processStream(sessionId, q)

    session.status = 'ready'
    this.emit({
      type: 'session.started',
      sessionId,
      timestamp: now(),
      session
    })

    return session
  }

  async resumeSession(opts: ResumeSessionOpts): Promise<HarnessSession> {
    const abortController = new AbortController()

    const session: HarnessSession = {
      id: opts.sessionId,
      providerId: 'claude',
      modelId: 'sonnet',
      status: 'initializing',
      cwd: opts.cwd,
      createdAt: new Date().toISOString(),
      resumeCursor: opts.resumeCursor
    }

    const canUseTool: CanUseTool = async (toolName, input, options) => {
      return this.handlePermissionRequest(opts.sessionId, toolName, input, options)
    }

    const inputStream = this.createInputStream(opts.sessionId)

    const q = createQuery({
      prompt: inputStream,
      options: {
        cwd: opts.cwd,
        abortController,
        canUseTool,
        includePartialMessages: true,
        includeHookEvents: true,
        resume: opts.resumeCursor
      }
    })

    const active: ActiveSession = {
      session,
      query: q,
      abortController,
      inputQueue: [],
      inputResolve: null
    }
    this.sessions.set(opts.sessionId, active)

    this.processStream(opts.sessionId, q)

    session.status = 'ready'
    this.emit({
      type: 'session.started',
      sessionId: opts.sessionId,
      timestamp: now(),
      session
    })

    return session
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const active = this.sessions.get(sessionId)
    if (!active) throw new Error(`No active session: ${sessionId}`)

    const userMsg: SDKUserMessage = {
      type: 'user',
      message: { role: 'user', content: message },
      parent_tool_use_id: null
    }

    // If there's a waiting resolver, send directly
    if (active.inputResolve) {
      active.inputResolve(userMsg)
      active.inputResolve = null
    } else {
      active.inputQueue.push(userMsg)
    }
  }

  async interrupt(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId)
    if (!active) return
    await active.query.interrupt()
    this.emit({
      type: 'status',
      sessionId,
      timestamp: now(),
      status: 'idle',
      message: 'Interrupted'
    })
  }

  async stop(sessionId: string): Promise<void> {
    const active = this.sessions.get(sessionId)
    if (!active) return

    active.query.close()
    active.abortController.abort()
    this.sessions.delete(sessionId)

    this.emit({
      type: 'session.ended',
      sessionId,
      timestamp: now(),
      reason: 'interrupted'
    })
  }

  async resolvePermission(sessionId: string, requestId: string, allowed: boolean): Promise<void> {
    // The actual resolution happens via the permissionBridge
    // which was set up in handlePermissionRequest
    permissionBridge.resolve(requestId, allowed)
  }

  onEvent(handler: EventHandler): void {
    this.eventHandlers.add(handler)
  }

  offEvent(handler: EventHandler): void {
    this.eventHandlers.delete(handler)
  }

  async dispose(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.stop(sessionId)
    }
  }

  // ─── Private ────────────────────────────────────────────────────

  private emit(event: HarnessEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch (err) {
        log.error({ err }, '[claude-connector] event handler error')
      }
    }
  }

  private createInputStream(sessionId: string): AsyncIterable<SDKUserMessage> {
    const sessions = this.sessions
    return {
      [Symbol.asyncIterator]() {
        return {
          next(): Promise<IteratorResult<SDKUserMessage>> {
            const active = sessions.get(sessionId)
            if (!active) return Promise.resolve({ done: true, value: undefined })

            // If there are queued messages, return immediately
            if (active.inputQueue.length > 0) {
              return Promise.resolve({
                done: false,
                value: active.inputQueue.shift()!
              })
            }

            // Wait for the next message
            return new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
              active.inputResolve = (msg: SDKUserMessage) => {
                resolve({ done: false, value: msg })
              }
            })
          }
        }
      }
    }
  }

  private async processStream(sessionId: string, q: Query): Promise<void> {
    let currentTurnId: string | null = null
    let blockIndex = 0

    const startTurn = (): string => {
      const turnId = randomUUID()
      blockIndex = 0
      this.emit({ type: 'turn.started', sessionId, timestamp: now(), turnId })
      return turnId
    }

    const completeTurn = (turnId: string): void => {
      this.emit({
        type: 'turn.completed',
        sessionId,
        timestamp: now(),
        turnId,
        message: {
          id: randomUUID(),
          sessionId,
          role: 'assistant',
          parts: [],
          createdAt: now()
        }
      })
      this.emit({ type: 'status', sessionId, timestamp: now(), status: 'idle' })
    }

    try {
      for await (const msg of q) {
        if (!this.sessions.has(sessionId)) break

        if (msg.type === 'result') {
          if (currentTurnId) {
            completeTurn(currentTurnId)
            currentTurnId = null
          }
          continue
        }

        if (currentTurnId === null) currentTurnId = startTurn()

        this.mapSdkMessage(sessionId, currentTurnId, msg, blockIndex)

        if (msg.type === 'stream_event') {
          const event = (msg as Record<string, unknown>).event as { type?: string } | undefined
          if (event?.type === 'content_block_start') {
            blockIndex++
          }
        }
      }

      if (currentTurnId) completeTurn(currentTurnId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.error({ err, sessionId }, '[claude-connector] stream error')
      this.emit({
        type: 'error',
        sessionId,
        timestamp: now(),
        code: 'stream_error',
        message
      })
    }
  }

  private mapSdkMessage(
    sessionId: string,
    turnId: string,
    msg: SDKMessage,
    blockIndex: number
  ): void {
    switch (msg.type) {
      case 'assistant': {
        // Full assistant message — extract content parts
        const betaMsg = msg.message
        if (betaMsg.content) {
          for (const block of betaMsg.content) {
            if ('text' in block && block.type === 'text') {
              this.emit({
                type: 'content.complete',
                sessionId,
                timestamp: now(),
                turnId,
                blockIndex,
                text: block.text
              })
            } else if (block.type === 'tool_use') {
              this.emit({
                type: 'tool.started',
                sessionId,
                timestamp: now(),
                toolUseId: block.id,
                toolName: block.name,
                input: block.input as Record<string, unknown>
              })
            } else if (block.type === 'thinking' && 'thinking' in block) {
              this.emit({
                type: 'content.delta',
                sessionId,
                timestamp: now(),
                turnId,
                delta: (block as Record<string, unknown>).thinking ?? '',
                blockIndex,
                blockType: 'thinking'
              })
            }
          }
        }
        break
      }

      case 'user': {
        // Tool results arrive in user messages with tool_result content blocks.
        const userMsg = (msg as { message?: { content?: unknown } }).message
        const content = userMsg?.content
        if (Array.isArray(content)) {
          for (const block of content as Array<Record<string, unknown>>) {
            if (block.type !== 'tool_result') continue
            const raw = block.content
            const output =
              typeof raw === 'string'
                ? raw
                : Array.isArray(raw)
                  ? raw
                      .map((c) =>
                        c && typeof c === 'object' && 'text' in c ? String(c.text ?? '') : ''
                      )
                      .join('')
                  : ''
            this.emit({
              type: 'tool.completed',
              sessionId,
              timestamp: now(),
              toolUseId: String(block.tool_use_id ?? ''),
              output,
              isError: Boolean(block.is_error)
            })
          }
        }
        break
      }

      case 'stream_event': {
        const event = (msg as Record<string, unknown>).event
        if (!event) break

        if (event.type === 'content_block_delta') {
          const delta = event.delta
          if (delta?.type === 'text_delta') {
            this.emit({
              type: 'content.delta',
              sessionId,
              timestamp: now(),
              turnId,
              delta: delta.text,
              blockIndex,
              blockType: 'text'
            })
          } else if (delta?.type === 'thinking_delta') {
            this.emit({
              type: 'content.delta',
              sessionId,
              timestamp: now(),
              turnId,
              delta: delta.thinking,
              blockIndex,
              blockType: 'thinking'
            })
          }
        }

        this.emit({
          type: 'status',
          sessionId,
          timestamp: now(),
          status: 'thinking'
        })
        break
      }

      case 'tool_progress': {
        this.emit({
          type: 'tool.progress',
          sessionId,
          timestamp: now(),
          toolUseId: msg.tool_use_id,
          output: `[${msg.tool_name}] running...`
        })
        break
      }

      case 'tool_use_summary': {
        this.emit({
          type: 'status',
          sessionId,
          timestamp: now(),
          status: 'working',
          message: msg.summary
        })
        break
      }

      case 'result': {
        if (msg.subtype === 'success') {
          this.emit({
            type: 'status',
            sessionId,
            timestamp: now(),
            status: 'idle'
          })
        } else {
          this.emit({
            type: 'error',
            sessionId,
            timestamp: now(),
            code: msg.subtype,
            message:
              'errors' in msg
                ? (msg as Record<string, unknown>).errors?.join(', ')
                : 'Unknown error'
          })
        }
        break
      }

      default:
        // Ignore other message types (system, auth_status, etc.)
        break
    }
  }

  private async handlePermissionRequest(
    sessionId: string,
    toolName: string,
    input: Record<string, unknown>,
    options: {
      signal: AbortSignal
      title?: string
      description?: string
      displayName?: string
      toolUseID: string
    }
  ): Promise<PermissionResult> {
    const requestId = `${sessionId}:${options.toolUseID}`

    this.emit({
      type: 'permission.requested',
      sessionId,
      timestamp: now(),
      requestId,
      toolName,
      input,
      description: options.title ?? options.description ?? `${toolName} wants to execute`
    })

    return new Promise<PermissionResult>((resolve) => {
      // Handle abort
      options.signal.addEventListener('abort', () => {
        resolve({ behavior: 'deny', message: 'Aborted' })
      })

      permissionBridge.registerRequest(requestId, (allowed: boolean) => {
        this.emit({
          type: 'permission.resolved',
          sessionId,
          timestamp: now(),
          requestId,
          allowed
        })

        if (allowed) {
          resolve({ behavior: 'allow' })
        } else {
          resolve({ behavior: 'deny', message: 'User denied permission' })
        }
      })
    })
  }
}

function now(): string {
  return new Date().toISOString()
}
