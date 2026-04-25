import type { StateCreator } from 'zustand'
import type {
  HarnessSession,
  HarnessEvent,
  HarnessMessage,
  HarnessContentPart,
  HarnessProviderId,
  ProviderInfo
} from '../../shared/harness-types'
import type { AppStore } from './types'

export interface HarnessState {
  /** Active harness sessions */
  harnessSessions: Map<string, HarnessSession>
  /** Messages per session */
  harnessMessages: Map<string, HarnessMessage[]>
  /** Currently active harness session */
  activeHarnessSessionId: string | null
  /** Streaming text buffer per turn (for live rendering) */
  streamingText: Map<string, string>
  /** Streaming thinking text per turn */
  streamingThinking: Map<string, string>
  /** Pending permission requests */
  pendingPermissions: Map<
    string,
    {
      requestId: string
      toolName: string
      input: Record<string, unknown>
      description: string
    }
  >
  /** Wall-clock turn start (ms since epoch) per session, for elapsed display. */
  turnStartedAt: Map<string, number>
  /** Available providers */
  providers: ProviderInfo[]
  /** Selected provider for new sessions */
  selectedProviderId: HarnessProviderId
}

export interface HarnessActions {
  /** Process a harness event from the server */
  handleHarnessEvent: (event: HarnessEvent) => void
  /** Set the active harness session */
  setActiveHarnessSession: (id: string | null) => void
  /** Set the selected provider */
  setSelectedProvider: (id: HarnessProviderId) => void
  /** Set available providers */
  setProviders: (providers: ProviderInfo[]) => void
  /** Add a user message to the local message list */
  addUserMessage: (sessionId: string, text: string) => void
  /** Clear a session's messages */
  clearHarnessSession: (sessionId: string) => void
}

export type HarnessSlice = HarnessState & HarnessActions

export const createHarnessSlice: StateCreator<AppStore & HarnessSlice, [], [], HarnessSlice> = (
  set,
  get
) => ({
  harnessSessions: new Map(),
  harnessMessages: new Map(),
  activeHarnessSessionId: null,
  streamingText: new Map(),
  streamingThinking: new Map(),
  pendingPermissions: new Map(),
  turnStartedAt: new Map(),
  providers: [],
  selectedProviderId: 'claude',

  handleHarnessEvent: (event) => {
    const state = get() as AppStore & HarnessSlice
    const sessions = new Map(state.harnessSessions)
    const messages = new Map(state.harnessMessages)
    const streaming = new Map(state.streamingText)
    const thinking = new Map(state.streamingThinking)
    const permissions = new Map(state.pendingPermissions)
    const turnStarts = new Map(state.turnStartedAt)

    switch (event.type) {
      case 'session.started': {
        sessions.set(event.sessionId, event.session)
        messages.set(event.sessionId, [])
        set({ harnessSessions: sessions, harnessMessages: messages } as Partial<HarnessSlice>)
        break
      }

      case 'session.ended': {
        const s = sessions.get(event.sessionId)
        if (s) {
          sessions.set(event.sessionId, { ...s, status: 'ended' })
        }
        streaming.delete(event.sessionId)
        thinking.delete(event.sessionId)
        set({
          harnessSessions: sessions,
          streamingText: streaming,
          streamingThinking: thinking
        } as Partial<HarnessSlice>)
        break
      }

      case 'turn.started': {
        // Reset streaming buffers for new turn
        streaming.set(event.sessionId, '')
        thinking.set(event.sessionId, '')
        turnStarts.set(event.sessionId, Date.now())
        set({
          streamingText: streaming,
          streamingThinking: thinking,
          turnStartedAt: turnStarts
        } as Partial<HarnessSlice>)
        break
      }

      case 'content.delta': {
        if (event.blockType === 'thinking') {
          const prev = thinking.get(event.sessionId) ?? ''
          thinking.set(event.sessionId, prev + event.delta)
          set({ streamingThinking: thinking } as Partial<HarnessSlice>)
        } else {
          const prev = streaming.get(event.sessionId) ?? ''
          streaming.set(event.sessionId, prev + event.delta)
          set({ streamingText: streaming } as Partial<HarnessSlice>)
        }
        break
      }

      case 'turn.completed': {
        // Flush streaming buffer into a finalized message
        const sessionMsgs = [...(messages.get(event.sessionId) ?? [])]
        const finalText = streaming.get(event.sessionId) ?? ''
        const finalThinking = thinking.get(event.sessionId) ?? ''

        const parts: HarnessContentPart[] = []
        if (finalThinking) {
          parts.push({ type: 'thinking', text: finalThinking })
        }
        if (finalText) {
          parts.push({ type: 'text', text: finalText })
        }

        if (parts.length > 0) {
          sessionMsgs.push({
            ...event.message,
            parts: parts.length > 0 ? parts : event.message.parts
          })
        }

        messages.set(event.sessionId, sessionMsgs)
        streaming.delete(event.sessionId)
        thinking.delete(event.sessionId)
        turnStarts.delete(event.sessionId)

        // Update session status
        const s = sessions.get(event.sessionId)
        if (s) {
          sessions.set(event.sessionId, { ...s, status: 'ready' })
        }

        set({
          harnessMessages: messages,
          harnessSessions: sessions,
          streamingText: streaming,
          streamingThinking: thinking,
          turnStartedAt: turnStarts
        } as Partial<HarnessSlice>)
        break
      }

      case 'tool.started': {
        const sessionMsgs = [...(messages.get(event.sessionId) ?? [])]
        // Append tool use as part of the current assistant message context
        const toolPart: HarnessContentPart = {
          type: 'tool_use',
          toolUseId: event.toolUseId,
          toolName: event.toolName,
          input: event.input
        }
        // Add as a standalone message for now
        sessionMsgs.push({
          id: event.toolUseId,
          sessionId: event.sessionId,
          role: 'assistant',
          parts: [toolPart],
          createdAt: event.timestamp
        })
        messages.set(event.sessionId, sessionMsgs)
        set({ harnessMessages: messages } as Partial<HarnessSlice>)
        break
      }

      case 'tool.completed': {
        const sessionMsgs = [...(messages.get(event.sessionId) ?? [])]
        sessionMsgs.push({
          id: `result-${event.toolUseId}`,
          sessionId: event.sessionId,
          role: 'assistant',
          parts: [
            {
              type: 'tool_result',
              toolUseId: event.toolUseId,
              output: event.output,
              isError: event.isError
            }
          ],
          createdAt: new Date().toISOString()
        })
        messages.set(event.sessionId, sessionMsgs)
        set({ harnessMessages: messages } as Partial<HarnessSlice>)
        break
      }

      case 'permission.requested': {
        permissions.set(event.requestId, {
          requestId: event.requestId,
          toolName: event.toolName,
          input: event.input,
          description: event.description
        })
        const s = sessions.get(event.sessionId)
        if (s) {
          sessions.set(event.sessionId, { ...s, status: 'waiting_permission' })
        }
        set({
          pendingPermissions: permissions,
          harnessSessions: sessions
        } as Partial<HarnessSlice>)
        break
      }

      case 'permission.resolved': {
        permissions.delete(event.requestId)
        const s = sessions.get(event.sessionId)
        if (s) {
          sessions.set(event.sessionId, { ...s, status: 'streaming' })
        }
        set({
          pendingPermissions: permissions,
          harnessSessions: sessions
        } as Partial<HarnessSlice>)
        break
      }

      case 'status': {
        const s = sessions.get(event.sessionId)
        if (s) {
          const statusMap = {
            thinking: 'streaming' as const,
            working: 'streaming' as const,
            idle: 'ready' as const
          }
          sessions.set(event.sessionId, { ...s, status: statusMap[event.status] })
          set({ harnessSessions: sessions } as Partial<HarnessSlice>)
        }
        break
      }

      case 'error': {
        const s = sessions.get(event.sessionId)
        if (s) {
          sessions.set(event.sessionId, { ...s, status: 'error' })
        }
        set({ harnessSessions: sessions } as Partial<HarnessSlice>)
        break
      }
    }
  },

  setActiveHarnessSession: (id) => set({ activeHarnessSessionId: id } as Partial<HarnessSlice>),
  setSelectedProvider: (id) => set({ selectedProviderId: id } as Partial<HarnessSlice>),
  setProviders: (providers) => set({ providers } as Partial<HarnessSlice>),

  addUserMessage: (sessionId, text) => {
    const state = get() as AppStore & HarnessSlice
    const messages = new Map(state.harnessMessages)
    const sessionMsgs = [...(messages.get(sessionId) ?? [])]
    sessionMsgs.push({
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      parts: [{ type: 'text', text }],
      createdAt: new Date().toISOString()
    })
    messages.set(sessionId, sessionMsgs)
    set({ harnessMessages: messages } as Partial<HarnessSlice>)
  },

  clearHarnessSession: (sessionId) => {
    const state = get() as AppStore & HarnessSlice
    const sessions = new Map(state.harnessSessions)
    const messages = new Map(state.harnessMessages)
    sessions.delete(sessionId)
    messages.delete(sessionId)
    set({
      harnessSessions: sessions,
      harnessMessages: messages,
      activeHarnessSessionId:
        state.activeHarnessSessionId === sessionId ? null : state.activeHarnessSessionId
    } as Partial<HarnessSlice>)
  }
})
