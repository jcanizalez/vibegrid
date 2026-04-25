import { EventEmitter } from 'node:events'
import log from '../logger'

/**
 * Bridges permission requests from provider connectors to the UI.
 * When a provider needs user approval for a tool action, it emits
 * a permission.requested event. The UI resolves it, and this bridge
 * delivers the decision back to the provider.
 */

type PermissionResolver = (allowed: boolean) => void

export class PermissionBridge extends EventEmitter {
  private pending = new Map<string, PermissionResolver>()

  /**
   * Register a pending permission request. Called by the connector
   * when the provider asks for tool approval.
   */
  registerRequest(requestId: string, resolver: PermissionResolver): void {
    this.pending.set(requestId, resolver)
    log.debug(`[harness:permission] registered request ${requestId}`)
  }

  /**
   * Resolve a pending permission request. Called when the UI
   * sends back an approval/denial.
   */
  resolve(requestId: string, allowed: boolean): boolean {
    const resolver = this.pending.get(requestId)
    if (!resolver) {
      log.warn(`[harness:permission] no pending request: ${requestId}`)
      return false
    }
    this.pending.delete(requestId)
    resolver(allowed)
    log.debug(`[harness:permission] resolved ${requestId}: ${allowed ? 'allowed' : 'denied'}`)
    return true
  }

  /**
   * Cancel all pending requests (e.g. on session stop).
   */
  cancelAll(sessionId: string): void {
    for (const [id, resolver] of this.pending) {
      if (id.startsWith(sessionId)) {
        resolver(false)
        this.pending.delete(id)
      }
    }
  }

  get pendingCount(): number {
    return this.pending.size
  }
}

export const permissionBridge = new PermissionBridge()
