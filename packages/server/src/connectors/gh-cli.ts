import { resolveExecutable } from '../resolve-executable'
import { getSafeEnv } from '../process-utils'

export function resolveGhPath(): string | null {
  return resolveExecutable('gh')
}

/**
 * Env for invoking `gh`. Starts from `getSafeEnv()` for the login-shell PATH
 * but re-adds `GH_TOKEN` / `GITHUB_TOKEN` from the raw process env — `gh`
 * supports non-interactive auth via those, and `getSafeEnv()` strips them by
 * default as a general precaution.
 */
export function getGhEnv(): Record<string, string> {
  const env = getSafeEnv()
  for (const key of ['GH_TOKEN', 'GITHUB_TOKEN']) {
    const val = process.env[key]
    if (val) env[key] = val
  }
  return env
}

export function ghInstallHint(): string {
  switch (process.platform) {
    case 'darwin':
      return 'Install with Homebrew: `brew install gh`'
    case 'win32':
      return 'Install with winget: `winget install --id GitHub.cli` (or download from https://cli.github.com)'
    default:
      return 'Install from https://cli.github.com (Debian/Ubuntu: `sudo apt install gh`)'
  }
}

export class GhNotFoundError extends Error {
  readonly code = 'GH_NOT_FOUND'
  constructor() {
    super(`GitHub CLI (gh) not found on PATH. ${ghInstallHint()}`)
    this.name = 'GhNotFoundError'
  }
}
