import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Use a temp directory for each test to avoid polluting real config
let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibegrid-auth-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// Dynamic import so mocks can be set up per-test if needed
async function importAuth() {
  return import('../packages/server/src/auth')
}

describe('getOrCreateToken', () => {
  it('creates a new token when none exists', async () => {
    const { getOrCreateToken } = await importAuth()
    const token = getOrCreateToken(tmpDir)
    expect(token).toMatch(/^vg_tk_/)
    expect(token.length).toBeGreaterThan(10)
  })

  it('writes the token file with restricted permissions', async () => {
    const { getOrCreateToken } = await importAuth()
    getOrCreateToken(tmpDir)
    const tokenPath = path.join(tmpDir, 'server-token')
    expect(fs.existsSync(tokenPath)).toBe(true)
    const stat = fs.statSync(tokenPath)
    // 0o600 = owner read/write only (on Unix)
    if (process.platform !== 'win32') {
      expect(stat.mode & 0o777).toBe(0o600)
    }
  })

  it('returns the same token on subsequent calls', async () => {
    const { getOrCreateToken } = await importAuth()
    const token1 = getOrCreateToken(tmpDir)
    const token2 = getOrCreateToken(tmpDir)
    expect(token1).toBe(token2)
  })

  it('creates the data directory if missing', async () => {
    const { getOrCreateToken } = await importAuth()
    const nestedDir = path.join(tmpDir, 'nested', 'dir')
    const token = getOrCreateToken(nestedDir)
    expect(token).toMatch(/^vg_tk_/)
    expect(fs.existsSync(path.join(nestedDir, 'server-token'))).toBe(true)
  })
})

describe('regenerateToken', () => {
  it('creates a new token different from the old one', async () => {
    const { getOrCreateToken, regenerateToken } = await importAuth()
    const original = getOrCreateToken(tmpDir)
    const regenerated = regenerateToken(tmpDir)
    expect(regenerated).toMatch(/^vg_tk_/)
    expect(regenerated).not.toBe(original)
  })

  it('overwrites the token file', async () => {
    const { getOrCreateToken, regenerateToken } = await importAuth()
    getOrCreateToken(tmpDir)
    const newToken = regenerateToken(tmpDir)
    const stored = fs.readFileSync(path.join(tmpDir, 'server-token'), 'utf-8').trim()
    expect(stored).toBe(newToken)
  })
})

describe('validateToken', () => {
  it('returns true for matching tokens', async () => {
    const { validateToken } = await importAuth()
    expect(validateToken('vg_tk_abc123', 'vg_tk_abc123')).toBe(true)
  })

  it('returns false for mismatched tokens', async () => {
    const { validateToken } = await importAuth()
    expect(validateToken('vg_tk_abc123', 'vg_tk_xyz789')).toBe(false)
  })

  it('returns false for different length tokens', async () => {
    const { validateToken } = await importAuth()
    expect(validateToken('short', 'much-longer-token')).toBe(false)
  })

  it('returns false for empty provided token', async () => {
    const { validateToken } = await importAuth()
    expect(validateToken('', 'vg_tk_abc123')).toBe(false)
  })
})
