import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibegrid-identity-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

async function importIdentity() {
  return import('../packages/server/src/server-identity')
}

describe('getOrCreateServerId', () => {
  it('creates a new UUID when none exists', async () => {
    const { getOrCreateServerId } = await importIdentity()
    const id = getOrCreateServerId(tmpDir)
    // UUID format: 8-4-4-4-12 hex chars
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('persists the server ID to file', async () => {
    const { getOrCreateServerId } = await importIdentity()
    const id = getOrCreateServerId(tmpDir)
    const stored = fs.readFileSync(path.join(tmpDir, 'server-id'), 'utf-8').trim()
    expect(stored).toBe(id)
  })

  it('returns the same ID on subsequent calls', async () => {
    const { getOrCreateServerId } = await importIdentity()
    const id1 = getOrCreateServerId(tmpDir)
    const id2 = getOrCreateServerId(tmpDir)
    expect(id1).toBe(id2)
  })

  it('creates nested directories if needed', async () => {
    const { getOrCreateServerId } = await importIdentity()
    const nested = path.join(tmpDir, 'deep', 'nested')
    const id = getOrCreateServerId(nested)
    expect(id).toBeTruthy()
    expect(fs.existsSync(path.join(nested, 'server-id'))).toBe(true)
  })
})

describe('getServerInfo', () => {
  it('returns server info with required fields', async () => {
    const { getServerInfo } = await importIdentity()
    const info = getServerInfo(tmpDir)
    expect(info.serverId).toBeTruthy()
    expect(info.label).toBe(os.hostname())
    expect(typeof info.version).toBe('string')
    expect(typeof info.uptime).toBe('number')
    expect(info.uptime).toBeGreaterThanOrEqual(0)
  })

  it('uses the same serverId across calls', async () => {
    const { getServerInfo } = await importIdentity()
    const info1 = getServerInfo(tmpDir)
    const info2 = getServerInfo(tmpDir)
    expect(info1.serverId).toBe(info2.serverId)
  })
})
