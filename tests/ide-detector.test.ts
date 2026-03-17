import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:fs', () => ({
  default: { existsSync: vi.fn(() => false) }
}))
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(() => {
    throw new Error('not found')
  }),
  spawn: vi.fn(() => ({ unref: vi.fn() }))
}))
vi.mock('../packages/server/src/process-utils', () => ({
  getSafeEnv: vi.fn(() => ({ PATH: '/usr/bin' }))
}))

import fs from 'node:fs'
import { spawn } from 'node:child_process'

beforeEach(() => {
  vi.clearAllMocks()
  // Reset module cache to clear cached IDEs
  vi.resetModules()
})

describe('detectIDEs', () => {
  it('returns IDEs whose app path exists on macOS', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === '/Applications/Visual Studio Code.app'
    })

    const { detectIDEs } = await import('../packages/server/src/ide-detector')
    const ides = detectIDEs()
    expect(ides.some((i) => i.id === 'vscode')).toBe(true)
    expect(ides.some((i) => i.id === 'cursor')).toBe(false)
  })

  it('caches results between calls', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true)

    const { detectIDEs } = await import('../packages/server/src/ide-detector')
    detectIDEs()
    detectIDEs()
    // existsSync should only be called during the first call
    const callCount = vi.mocked(fs.existsSync).mock.calls.length
    detectIDEs()
    expect(vi.mocked(fs.existsSync).mock.calls.length).toBe(callCount)
  })
})

describe('openInIDE', () => {
  it('spawns the IDE command with detached options', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p) => {
      return p === '/Applications/Cursor.app'
    })

    const { openInIDE } = await import('../packages/server/src/ide-detector')
    openInIDE('cursor', '/my/project')

    expect(spawn).toHaveBeenCalledWith(
      'cursor',
      ['/my/project'],
      expect.objectContaining({ detached: true, stdio: 'ignore' })
    )
  })

  it('does nothing for unknown IDE', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)

    const { openInIDE } = await import('../packages/server/src/ide-detector')
    openInIDE('nonexistent', '/my/project')
    expect(spawn).not.toHaveBeenCalled()
  })
})
