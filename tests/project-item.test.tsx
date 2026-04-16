// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import React from 'react'

Object.defineProperty(window, 'matchMedia', {
  value: () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }),
  writable: true
})

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>((props, ref) =>
          React.createElement(tag, { ...props, ref })
        )
    }
  )
}))

const mockLoading = vi.fn(() => 'toast-id')
const mockUpdate = vi.fn()

vi.mock('../src/renderer/components/Toast', () => ({
  toast: Object.assign(
    (msg: string) => {
      mockLoading(msg)
      return 'toast-id'
    },
    {
      loading: (msg: string) => mockLoading(msg),
      update: (id: string, msg: string, type: string) => mockUpdate(id, msg, type),
      dismiss: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    }
  )
}))

const mockCreateSession = vi.fn()

vi.mock('../src/renderer/lib/session-utils', () => ({
  createSessionFromProject: (...args: unknown[]) => mockCreateSession(...args)
}))

const mockCreateWorktree = vi.fn()
const mockIsGitRepo = vi.fn()

Object.defineProperty(window, 'api', {
  value: {
    createWorktree: (...a: unknown[]) => mockCreateWorktree(...a),
    isGitRepo: (...a: unknown[]) => mockIsGitRepo(...a)
  },
  writable: true
})

import { useAppStore } from '../src/renderer/stores'
import { ProjectItem } from '../src/renderer/components/project-sidebar/ProjectItem'
import type { ProjectConfig, AppConfig } from '../src/shared/types'
import type { WorktreeInfo } from '../src/renderer/stores/types'

const project: ProjectConfig = {
  name: 'test-proj',
  path: '/tmp/test-proj'
}

const mainWorktree: WorktreeInfo = {
  path: '/tmp/test-proj',
  branch: 'main',
  name: 'main',
  isMain: true,
  isDirty: false
}

const baseConfig: Partial<AppConfig> = {
  projects: [project],
  defaults: {
    defaultAgent: 'claude'
  } as AppConfig['defaults'],
  remoteHosts: []
}

const initialState = useAppStore.getState()

function renderProjectItem(overrides: Partial<React.ComponentProps<typeof ProjectItem>> = {}) {
  const props: React.ComponentProps<typeof ProjectItem> = {
    project,
    sessionCount: 0,
    defaultExpanded: true,
    isActive: false,
    isCollapsed: false,
    worktreeSessionCounts: new Map(),
    mainRepoSessionCount: 0,
    viewMode: 'worktrees',
    worktreeSessions: new Map(),
    mainRepoSessions: [],
    projectSessions: [],
    ...overrides
  }
  return render(<ProjectItem {...props} />)
}

describe('ProjectItem progress-toast handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsGitRepo.mockResolvedValue(true)
    mockCreateWorktree.mockResolvedValue(undefined)
    mockCreateSession.mockResolvedValue(undefined)
    useAppStore.setState({
      config: baseConfig as AppConfig,
      worktreeCache: new Map([[project.path, [mainWorktree]]])
    })
  })

  afterEach(() => {
    useAppStore.setState(initialState)
  })

  it('new session button fires a loading toast and calls createSessionFromProject', async () => {
    const { container } = renderProjectItem()
    await waitFor(() => expect(mockIsGitRepo).toHaveBeenCalled())
    const sessionBtn = container.querySelector('button[type="button"]')
    expect(sessionBtn).not.toBeNull()
    act(() => {
      fireEvent.click(sessionBtn!)
    })
    expect(mockLoading).toHaveBeenCalledWith('Starting session…')
    await waitFor(() => {
      expect(mockCreateSession).toHaveBeenCalledWith(project)
      expect(mockUpdate).toHaveBeenCalledWith('toast-id', 'Session started', 'success')
    })
  })

  it('new worktree button fires a loading toast and calls window.api.createWorktree', async () => {
    const { container } = renderProjectItem()
    await waitFor(() => expect(mockIsGitRepo).toHaveBeenCalled())
    // The new-worktree button is the 2nd visible action button (after new session)
    const buttons = Array.from(container.querySelectorAll('button[type="button"]'))
    // Find it via its SVG child: FolderGit2 is distinctive because it has class text-amber-400/70
    const wtButton = buttons.find((b) => b.querySelector('.text-amber-400\\/70')) as HTMLElement
    expect(wtButton).toBeDefined()
    act(() => {
      fireEvent.click(wtButton)
    })
    expect(mockLoading).toHaveBeenCalledWith('Creating worktree…')
    await waitFor(() => {
      expect(mockCreateWorktree).toHaveBeenCalledWith(project.path, 'main', expect.any(String))
    })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        'toast-id',
        expect.stringMatching(/^Worktree ".+" created$/),
        'success'
      )
    })
  })

  it('new worktree button transitions toast to error when createWorktree fails', async () => {
    mockCreateWorktree.mockRejectedValue(new Error('permission denied'))
    const { container } = renderProjectItem()
    await waitFor(() => expect(mockIsGitRepo).toHaveBeenCalled())
    const buttons = Array.from(container.querySelectorAll('button[type="button"]'))
    const wtButton = buttons.find((b) => b.querySelector('.text-amber-400\\/70')) as HTMLElement
    act(() => {
      fireEvent.click(wtButton)
    })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('toast-id', 'permission denied', 'error')
    })
  })

  it('does not fire createSessionFromProject twice when the new-session button is double-clicked synchronously', async () => {
    // Keep createSessionFromProject pending so the ref-lock stays active across both clicks
    let resolveIt: () => void
    mockCreateSession.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveIt = resolve
        })
    )
    const { container } = renderProjectItem()
    await waitFor(() => expect(mockIsGitRepo).toHaveBeenCalled())
    const sessionBtn = container.querySelector('button[type="button"]') as HTMLElement
    act(() => {
      fireEvent.click(sessionBtn)
      fireEvent.click(sessionBtn)
    })
    expect(mockCreateSession).toHaveBeenCalledTimes(1)
    act(() => resolveIt!())
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
  })
})
