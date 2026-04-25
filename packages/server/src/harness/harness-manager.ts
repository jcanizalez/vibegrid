import { EventEmitter } from 'node:events'
import type {
  HarnessEvent,
  HarnessSession,
  HarnessProviderId,
  ProviderInfo,
  StartSessionOpts,
  ResumeSessionOpts
} from '@vornrun/shared/harness-types'
import { providerRegistry } from './provider-registry'
import { permissionBridge } from './permission-bridge'
import { clientRegistry } from '../broadcast'
import log from '../logger'

/**
 * Central orchestrator for AI harness sessions.
 * Routes operations to the correct provider connector,
 * manages session state, and broadcasts events to the UI.
 */
export class HarnessManager extends EventEmitter {
  private sessions = new Map<string, { providerId: HarnessProviderId; session: HarnessSession }>()

  async listProviders(): Promise<ProviderInfo[]> {
    return providerRegistry.listAvailable()
  }

  async createSession(
    providerId: HarnessProviderId,
    opts: StartSessionOpts
  ): Promise<HarnessSession> {
    const connector = providerRegistry.get(providerId)
    if (!connector) {
      throw new Error(`Provider not registered: ${providerId}`)
    }

    const available = await connector.isAvailable()
    if (!available) {
      throw new Error(`Provider not available: ${providerId}`)
    }

    // Subscribe to events from this connector and broadcast to UI
    const eventHandler = (event: HarnessEvent) => {
      this.broadcastEvent(event)
    }
    connector.onEvent(eventHandler)

    const session = await connector.startSession(opts)
    this.sessions.set(session.id, { providerId, session })

    log.info({ sessionId: session.id, providerId }, '[harness] session created')
    return session
  }

  async resumeSession(
    providerId: HarnessProviderId,
    opts: ResumeSessionOpts
  ): Promise<HarnessSession> {
    const connector = providerRegistry.get(providerId)
    if (!connector) {
      throw new Error(`Provider not registered: ${providerId}`)
    }

    const eventHandler = (event: HarnessEvent) => {
      this.broadcastEvent(event)
    }
    connector.onEvent(eventHandler)

    const session = await connector.resumeSession(opts)
    this.sessions.set(session.id, { providerId, session })

    log.info({ sessionId: session.id, providerId }, '[harness] session resumed')
    return session
  }

  async sendMessage(sessionId: string, message: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) throw new Error(`No active session: ${sessionId}`)

    const connector = providerRegistry.get(entry.providerId)
    if (!connector) throw new Error(`Provider gone: ${entry.providerId}`)

    await connector.sendMessage(sessionId, message)
  }

  async interrupt(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) throw new Error(`No active session: ${sessionId}`)

    const connector = providerRegistry.get(entry.providerId)
    if (!connector) throw new Error(`Provider gone: ${entry.providerId}`)

    await connector.interrupt(sessionId)
    log.info({ sessionId }, '[harness] session interrupted')
  }

  async stop(sessionId: string): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) return

    const connector = providerRegistry.get(entry.providerId)
    if (connector) {
      await connector.stop(sessionId)
    }

    permissionBridge.cancelAll(sessionId)
    this.sessions.delete(sessionId)
    log.info({ sessionId }, '[harness] session stopped')
  }

  async resolvePermission(sessionId: string, requestId: string, allowed: boolean): Promise<void> {
    const entry = this.sessions.get(sessionId)
    if (!entry) throw new Error(`No active session: ${sessionId}`)

    const connector = providerRegistry.get(entry.providerId)
    if (!connector) throw new Error(`Provider gone: ${entry.providerId}`)

    const resolved = permissionBridge.resolve(requestId, allowed)
    if (!resolved) {
      throw new Error(`No pending permission: ${requestId}`)
    }

    await connector.resolvePermission(sessionId, requestId, allowed)
  }

  getSession(sessionId: string): HarnessSession | null {
    return this.sessions.get(sessionId)?.session ?? null
  }

  listSessions(): HarnessSession[] {
    return Array.from(this.sessions.values()).map((e) => e.session)
  }

  private broadcastEvent(event: HarnessEvent): void {
    // Update local session state from events
    const entry = this.sessions.get(event.sessionId)
    if (entry) {
      switch (event.type) {
        case 'session.started':
          entry.session = event.session
          break
        case 'session.ended':
          entry.session = { ...entry.session, status: 'ended' }
          break
        case 'status':
          entry.session = {
            ...entry.session,
            status: event.status === 'idle' ? 'ready' : 'streaming'
          }
          break
        case 'permission.requested':
          entry.session = { ...entry.session, status: 'waiting_permission' }
          break
        case 'permission.resolved':
          entry.session = { ...entry.session, status: 'streaming' }
          break
        case 'error':
          entry.session = { ...entry.session, status: 'error' }
          break
      }
    }

    clientRegistry.broadcast('harness:event', event)
  }

  async dispose(): Promise<void> {
    for (const sessionId of this.sessions.keys()) {
      await this.stop(sessionId)
    }
    await providerRegistry.disposeAll()
  }
}

export const harnessManager = new HarnessManager()
