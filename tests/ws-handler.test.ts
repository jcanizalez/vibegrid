import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'

vi.mock('../packages/server/src/broadcast', () => ({
  clientRegistry: { add: vi.fn(), remove: vi.fn() }
}))
vi.mock('../packages/server/src/logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}))

import {
  registerMethod,
  registerNotification,
  handleConnection
} from '../packages/server/src/ws-handler'
import { clientRegistry } from '../packages/server/src/broadcast'

function createMockWs() {
  const emitter = new EventEmitter()
  const ws = Object.assign(emitter, {
    send: vi.fn(),
    readyState: 1,
    OPEN: 1
  })
  return ws as unknown as import('ws').WebSocket
}

function sendMessage(ws: ReturnType<typeof createMockWs>, msg: object) {
  ;(ws as unknown as EventEmitter).emit('message', Buffer.from(JSON.stringify(msg)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('handleConnection', () => {
  it('adds client to registry on connect', () => {
    const ws = createMockWs()
    handleConnection(ws)
    expect(clientRegistry.add).toHaveBeenCalledWith(ws)
  })

  it('removes client on close', () => {
    const ws = createMockWs()
    handleConnection(ws)
    ;(ws as unknown as EventEmitter).emit('close')
    expect(clientRegistry.remove).toHaveBeenCalledWith(ws)
  })

  it('returns -32601 for unknown method', async () => {
    const ws = createMockWs()
    handleConnection(ws)
    sendMessage(ws, { jsonrpc: '2.0', id: 1, method: 'unknown:method' })

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 10))

    expect(ws.send).toHaveBeenCalled()
    const response = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(response.error.code).toBe(-32601)
  })

  it('dispatches to registered method handler', async () => {
    // Note: registerMethod modifies a shared module-level map
    registerMethod('config:load' as never, (() => ({ ok: true })) as never)

    const ws = createMockWs()
    handleConnection(ws)
    sendMessage(ws, { jsonrpc: '2.0', id: 2, method: 'config:load' })

    await new Promise((r) => setTimeout(r, 10))

    expect(ws.send).toHaveBeenCalled()
    const response = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(response.id).toBe(2)
    expect(response.result).toEqual({ ok: true })
  })

  it('dispatches fire-and-forget notification (no id)', async () => {
    const handler = vi.fn()
    registerNotification('terminal:write', handler)

    const ws = createMockWs()
    handleConnection(ws)
    sendMessage(ws, { jsonrpc: '2.0', method: 'terminal:write', params: { data: 'hi' } })

    await new Promise((r) => setTimeout(r, 10))

    expect(handler).toHaveBeenCalledWith({ data: 'hi' })
    // No response should be sent for notifications
    expect(ws.send).not.toHaveBeenCalled()
  })

  it('returns -32000 when handler throws', async () => {
    registerMethod(
      'test:error' as never,
      (() => {
        throw new Error('boom')
      }) as never
    )

    const ws = createMockWs()
    handleConnection(ws)
    sendMessage(ws, { jsonrpc: '2.0', id: 3, method: 'test:error' })

    await new Promise((r) => setTimeout(r, 10))

    const response = JSON.parse((ws.send as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(response.error.code).toBe(-32000)
    expect(response.error.message).toBe('boom')
  })
})
