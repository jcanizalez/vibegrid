import { StateCreator } from 'zustand'
import { AppStore, TerminalsSlice } from './types'

export const createTerminalsSlice: StateCreator<AppStore, [], [], TerminalsSlice> = (set) => ({
  terminals: new Map(),

  addTerminal: (session) =>
    set((state) => {
      const next = new Map(state.terminals)
      next.set(session.id, {
        id: session.id,
        session,
        status: session.status,
        lastOutputTimestamp: Date.now()
      })
      const order = state.terminalOrder.includes(session.id)
        ? state.terminalOrder
        : [...state.terminalOrder, session.id]
      window.api.notifyWidgetStatus()
      return { terminals: next, terminalOrder: order }
    }),

  removeTerminal: (id) =>
    set((state) => {
      const next = new Map(state.terminals)
      next.delete(id)
      const order = state.terminalOrder.filter((tid) => tid !== id)
      const minimized = new Set(state.minimizedTerminals)
      minimized.delete(id)
      const gitDiffStats = new Map(state.gitDiffStats)
      gitDiffStats.delete(id)
      window.api.notifyWidgetStatus()
      return { terminals: next, terminalOrder: order, minimizedTerminals: minimized, gitDiffStats }
    }),

  updateStatus: (id, status) =>
    set((state) => {
      const next = new Map(state.terminals)
      const term = next.get(id)
      if (term) next.set(id, { ...term, status })
      window.api.notifyWidgetStatus()
      return { terminals: next }
    }),

  updateLastOutput: (id, timestamp) =>
    set((state) => {
      const next = new Map(state.terminals)
      const term = next.get(id)
      if (term) next.set(id, { ...term, lastOutputTimestamp: timestamp })
      return { terminals: next }
    }),

  renameTerminal: (id, displayName) =>
    set((state) => {
      const next = new Map(state.terminals)
      const term = next.get(id)
      if (term) {
        next.set(id, { ...term, session: { ...term.session, displayName } })
      }
      return { terminals: next }
    }),

  togglePinned: (id) =>
    set((state) => {
      const next = new Map(state.terminals)
      const term = next.get(id)
      if (term) {
        next.set(id, { ...term, session: { ...term.session, pinned: !term.session.pinned } })
      }
      return { terminals: next }
    }),

  // Headless agent tracking
  headlessSessions: [],
  headlessLastOutput: new Map(),
  headlessDismissed: new Set(),

  setHeadlessSessions: (sessions) =>
    set((state) => {
      // Rebuild from server list — removes sessions the server no longer reports
      const dismissed = state.headlessDismissed
      const existing = new Map(state.headlessSessions.map((s) => [s.id, s]))
      const serverIds = new Set(sessions.map((s) => s.id))
      const next: typeof state.headlessSessions = []
      for (const s of sessions) {
        if (dismissed.has(s.id)) continue
        const prev = existing.get(s.id)
        next.push(prev ? { ...prev, status: s.status, exitCode: s.exitCode, endedAt: s.endedAt } : s)
      }
      // Clean up output entries for sessions no longer present
      const nextOutput = new Map(state.headlessLastOutput)
      for (const id of nextOutput.keys()) {
        if (!serverIds.has(id)) nextOutput.delete(id)
      }
      return { headlessSessions: next, headlessLastOutput: nextOutput }
    }),

  addHeadlessSession: (session) =>
    set((state) => {
      if (state.headlessSessions.some((s) => s.id === session.id)) return state
      return { headlessSessions: [...state.headlessSessions, session] }
    }),

  updateHeadlessSession: (id, updates) =>
    set((state) => ({
      headlessSessions: state.headlessSessions.map((s) => (s.id === id ? { ...s, ...updates } : s))
    })),

  dismissHeadlessSession: (id) =>
    set((state) => {
      const dismissed = new Set(state.headlessDismissed)
      dismissed.add(id)
      const nextOutput = new Map(state.headlessLastOutput)
      nextOutput.delete(id)
      return {
        headlessSessions: state.headlessSessions.filter((s) => s.id !== id),
        headlessDismissed: dismissed,
        headlessLastOutput: nextOutput
      }
    }),

  pruneExitedHeadless: (retentionMs) =>
    set((state) => {
      const now = Date.now()
      const kept = state.headlessSessions.filter(
        (s) => s.status === 'running' || !s.endedAt || now - s.endedAt < retentionMs
      )
      const keptIds = new Set(kept.map((s) => s.id))
      const nextOutput = new Map(state.headlessLastOutput)
      for (const id of nextOutput.keys()) {
        if (!keptIds.has(id)) nextOutput.delete(id)
      }
      return { headlessSessions: kept, headlessLastOutput: nextOutput }
    }),

  setHeadlessLastOutput: (id, line) =>
    set((state) => {
      const next = new Map(state.headlessLastOutput)
      next.set(id, line)
      return { headlessLastOutput: next }
    })
})
