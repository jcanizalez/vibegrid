import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

const SERVER_ID_FILENAME = 'server-id'

export interface ServerInfo {
  serverId: string
  label: string
  version: string
  host?: string
  port?: number
  uptime: number
}

const startedAt = Date.now()

// Cached immutable values — these never change at runtime
let cachedServerId: string | null = null
let cachedVersion: string | null = null
let cachedLabel: string | null = null

function resolveIdPath(dataDir?: string): string {
  const dir = dataDir ?? path.join(os.homedir(), '.vibegrid')
  return path.join(dir, SERVER_ID_FILENAME)
}

export function getOrCreateServerId(dataDir?: string): string {
  const idPath = resolveIdPath(dataDir)
  try {
    const existing = fs.readFileSync(idPath, 'utf-8').trim()
    if (existing) return existing
  } catch {
    // ENOENT or other — fall through to create
  }

  const id = crypto.randomUUID()
  fs.mkdirSync(path.dirname(idPath), { recursive: true })
  fs.writeFileSync(idPath, id, 'utf-8')
  return id
}

export function getVersion(): string {
  try {
    const candidates = [
      path.resolve(__dirname, '../package.json'),
      path.resolve(__dirname, '../../package.json'),
      path.resolve(__dirname, '../../../package.json')
    ]
    for (const candidate of candidates) {
      try {
        const pkg = JSON.parse(fs.readFileSync(candidate, 'utf-8'))
        if (pkg.version) return pkg.version
      } catch {
        // try next candidate
      }
    }
  } catch {
    // ignore
  }
  return 'unknown'
}

export function getServerInfo(dataDir?: string): ServerInfo {
  if (!cachedServerId) cachedServerId = getOrCreateServerId(dataDir)
  if (!cachedVersion) cachedVersion = getVersion()
  if (!cachedLabel) cachedLabel = os.hostname()
  return {
    serverId: cachedServerId,
    label: cachedLabel,
    version: cachedVersion,
    uptime: Math.floor((Date.now() - startedAt) / 1000)
  }
}
