import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}))

vi.mock('node:fs', () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn(() => true)
  }
}))

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
  }
}))

import { execSync } from 'node:child_process'
import {
  getGitBranch,
  listBranches,
  getGitDiffStat,
  gitCommit,
  listWorktrees
} from '../src/main/git-utils'

const mockExecSync = vi.mocked(execSync)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getGitBranch', () => {
  it('returns branch name', () => {
    mockExecSync.mockReturnValue('main\n')
    expect(getGitBranch('/project')).toBe('main')
  })

  it('returns null for HEAD (detached)', () => {
    mockExecSync.mockReturnValue('HEAD\n')
    expect(getGitBranch('/project')).toBeNull()
  })

  it('returns null on error', () => {
    mockExecSync.mockImplementation(() => { throw new Error('not a git repo') })
    expect(getGitBranch('/project')).toBeNull()
  })

  it('returns null for empty output', () => {
    mockExecSync.mockReturnValue('')
    expect(getGitBranch('/project')).toBeNull()
  })
})

describe('listBranches', () => {
  it('parses multi-line output', () => {
    mockExecSync.mockReturnValue('main\nfeature/foo\ndev\n')
    expect(listBranches('/project')).toEqual(['main', 'feature/foo', 'dev'])
  })

  it('returns empty array on error', () => {
    mockExecSync.mockImplementation(() => { throw new Error() })
    expect(listBranches('/project')).toEqual([])
  })

  it('returns empty for empty output', () => {
    mockExecSync.mockReturnValue('')
    expect(listBranches('/project')).toEqual([])
  })

  it('trims whitespace from branch names', () => {
    mockExecSync.mockReturnValue('  main  \n  dev  \n')
    expect(listBranches('/project')).toEqual(['main', 'dev'])
  })
})

describe('getGitDiffStat', () => {
  it('parses numstat output', () => {
    mockExecSync.mockReturnValue('10\t5\tsrc/foo.ts\n3\t1\tsrc/bar.ts\n')
    expect(getGitDiffStat('/project')).toEqual({
      filesChanged: 2,
      insertions: 13,
      deletions: 6
    })
  })

  it('handles binary files', () => {
    mockExecSync.mockReturnValue('-\t-\timage.png\n5\t2\tsrc/foo.ts\n')
    expect(getGitDiffStat('/project')).toEqual({
      filesChanged: 2,
      insertions: 5,
      deletions: 2
    })
  })

  it('returns zeros for empty diff', () => {
    mockExecSync.mockReturnValue('')
    expect(getGitDiffStat('/project')).toEqual({
      filesChanged: 0,
      insertions: 0,
      deletions: 0
    })
  })

  it('returns null on error', () => {
    mockExecSync.mockImplementation(() => { throw new Error() })
    expect(getGitDiffStat('/project')).toBeNull()
  })
})

describe('gitCommit', () => {
  it('calls git add -A when includeUnstaged is true', () => {
    mockExecSync.mockReturnValue('')
    gitCommit('/project', 'test commit', true)
    expect(mockExecSync).toHaveBeenCalledWith(
      'git add -A',
      expect.objectContaining({ cwd: '/project' })
    )
  })

  it('does not call git add -A when includeUnstaged is false', () => {
    mockExecSync.mockReturnValue('')
    gitCommit('/project', 'test commit', false)
    const calls = mockExecSync.mock.calls.map((c) => c[0])
    expect(calls).not.toContain('git add -A')
  })

  it('passes message via JSON.stringify', () => {
    mockExecSync.mockReturnValue('')
    gitCommit('/project', 'fix: "quotes" and stuff', false)
    expect(mockExecSync).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify('fix: "quotes" and stuff')),
      expect.any(Object)
    )
  })

  it('returns success on successful commit', () => {
    mockExecSync.mockReturnValue('')
    expect(gitCommit('/project', 'msg', false)).toEqual({ success: true })
  })

  it('returns error on failure', () => {
    mockExecSync.mockImplementation(() => { throw new Error('nothing to commit') })
    const result = gitCommit('/project', 'msg', false)
    expect(result.success).toBe(false)
    expect(result.error).toContain('nothing to commit')
  })
})

describe('listWorktrees', () => {
  it('parses porcelain output', () => {
    mockExecSync.mockReturnValue(
      'worktree /path/to/project\nbranch refs/heads/main\n\n' +
      'worktree /path/to/worktree\nbranch refs/heads/feature\n'
    )
    const result = listWorktrees('/path/to/project')
    expect(result).toEqual([
      { path: '/path/to/project', branch: 'main', isMain: true },
      { path: '/path/to/worktree', branch: 'feature', isMain: false }
    ])
  })

  it('handles detached HEAD', () => {
    mockExecSync.mockReturnValue(
      'worktree /path/to/project\nbranch refs/heads/main\n\n' +
      'worktree /path/to/worktree\ndetached\n'
    )
    const result = listWorktrees('/path/to/project')
    expect(result[1].branch).toBe('detached')
  })

  it('returns empty on error', () => {
    mockExecSync.mockImplementation(() => { throw new Error() })
    expect(listWorktrees('/project')).toEqual([])
  })

  it('returns empty for empty output', () => {
    mockExecSync.mockReturnValue('')
    expect(listWorktrees('/project')).toEqual([])
  })
})
