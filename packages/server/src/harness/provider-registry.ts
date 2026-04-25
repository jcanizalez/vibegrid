import type {
  ProviderConnector,
  HarnessProviderId,
  ProviderInfo
} from '@vornrun/shared/harness-types'
import log from '../logger'

/**
 * Registry of available AI provider connectors.
 * Connectors register themselves at startup; the harness manager
 * routes sessions to the correct connector via providerId.
 */
export class ProviderRegistry {
  private connectors = new Map<HarnessProviderId, ProviderConnector>()

  register(connector: ProviderConnector): void {
    this.connectors.set(connector.providerId, connector)
    log.info(`[harness] registered provider: ${connector.providerId}`)
  }

  get(id: HarnessProviderId): ProviderConnector | undefined {
    return this.connectors.get(id)
  }

  has(id: HarnessProviderId): boolean {
    return this.connectors.has(id)
  }

  async listAvailable(): Promise<ProviderInfo[]> {
    const results: ProviderInfo[] = []
    for (const connector of this.connectors.values()) {
      try {
        const info = await connector.getInfo()
        results.push(info)
      } catch (err) {
        log.warn({ err, provider: connector.providerId }, '[harness] failed to get provider info')
      }
    }
    return results
  }

  async disposeAll(): Promise<void> {
    for (const connector of this.connectors.values()) {
      try {
        await connector.dispose()
      } catch (err) {
        log.warn({ err, provider: connector.providerId }, '[harness] error disposing provider')
      }
    }
    this.connectors.clear()
  }

  get size(): number {
    return this.connectors.size
  }
}

export const providerRegistry = new ProviderRegistry()
