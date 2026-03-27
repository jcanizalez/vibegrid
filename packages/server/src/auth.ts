import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import log from './logger'

const TOKEN_FILENAME = 'server-token'

// In-memory active token — updated by getOrCreateToken and regenerateToken
// so that regeneration takes effect immediately without server restart.
let activeToken: string | null = null
let activeDataDir: string | undefined

function resolveTokenPath(dataDir?: string): string {
  const dir = dataDir ?? path.join(os.homedir(), '.vibegrid')
  return path.join(dir, TOKEN_FILENAME)
}

function writeToken(tokenPath: string): string {
  const token = `vg_tk_${crypto.randomUUID()}`
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true })
  fs.writeFileSync(tokenPath, token, { encoding: 'utf-8', mode: 0o600 })
  return token
}

export function getOrCreateToken(dataDir?: string): string {
  const tokenPath = resolveTokenPath(dataDir)
  try {
    const existing = fs.readFileSync(tokenPath, 'utf-8').trim()
    if (existing) {
      activeToken = existing
      activeDataDir = dataDir
      return existing
    }
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      log.warn({ err }, '[auth] failed to read existing token, generating new one')
    }
  }

  const token = writeToken(tokenPath)
  activeToken = token
  activeDataDir = dataDir
  log.info('[auth] generated new server token')
  return token
}

export function regenerateToken(dataDir?: string): string {
  const dir = dataDir ?? activeDataDir
  const tokenPath = resolveTokenPath(dir)
  const token = writeToken(tokenPath)
  activeToken = token
  log.info('[auth] regenerated server token')
  return token
}

export function getActiveToken(): string | null {
  return activeToken
}

export function validateToken(provided: string, stored: string): boolean {
  const providedBuf = Buffer.from(provided)
  const storedBuf = Buffer.from(stored)
  if (providedBuf.length !== storedBuf.length) {
    return false
  }
  return crypto.timingSafeEqual(providedBuf, storedBuf)
}
