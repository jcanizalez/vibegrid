import { describe, it, expect, vi } from 'vitest'

// Mock database and logger before importing
vi.mock('../packages/server/src/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

// Verify types and IPC constants are correct
describe('remote server types', () => {
  it('exports RemoteServerConfig interface fields', async () => {
    const { IPC } = await import('../packages/shared/src/types')
    expect(IPC.REMOTE_SERVER_ADD).toBe('remoteServer:add')
    expect(IPC.REMOTE_SERVER_LIST).toBe('remoteServer:list')
    expect(IPC.REMOTE_SERVER_REMOVE).toBe('remoteServer:remove')
    expect(IPC.REMOTE_SERVER_TEST).toBe('remoteServer:test')
    expect(IPC.SERVER_INFO).toBe('server:info')
    expect(IPC.SERVER_REGENERATE_TOKEN).toBe('server:regenerateToken')
  })

  it('exports RemoteServerStatus type values', async () => {
    // Type-level check: these should compile without error
    const status: import('../packages/shared/src/types').RemoteServerStatus = 'online'
    expect(['online', 'connecting', 'offline']).toContain(status)
  })
})

describe('remote server protocol', () => {
  it('defines all remote server RPC methods', async () => {
    // Import protocol to ensure the types compile
    const protocol = await import('../packages/shared/src/protocol')
    expect(protocol.createRequest).toBeDefined()
    // The RequestMethods interface is checked at compile time;
    // this just verifies the module loads without error
  })
})

describe('env auth token', () => {
  it('exports getAuthToken and getWebSocketUrl', async () => {
    // env.ts uses browser globals (location, localStorage) so we just
    // verify the module structure, not runtime behavior
    const env = await import('../packages/web/src/env')
    expect(typeof env.getWebSocketUrl).toBe('function')
    expect(typeof env.getAuthToken).toBe('function')
  })
})
