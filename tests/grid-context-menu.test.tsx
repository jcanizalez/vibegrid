// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock dependencies before imports
const mockCreateTerminal = vi.fn()
const mockCreateShellTerminal = vi.fn()
const mockListBranches = vi.fn()
const mockListWorktrees = vi.fn()

Object.defineProperty(window, 'api', {
  value: {
    createTerminal: (...args: unknown[]) => mockCreateTerminal(...args),
    createShellTerminal: (...args: unknown[]) => mockCreateShellTerminal(...args),
    listBranches: (...args: unknown[]) => mockListBranches(...args),
    listWorktrees: (...args: unknown[]) => mockListWorktrees(...args),
    killTerminal: vi.fn(),
    saveConfig: vi.fn(),
    notifyWidgetStatus: vi.fn(),
    isWorktreeDirty: vi.fn().mockResolvedValue(false),
    getGitDiffStat: vi.fn().mockResolvedValue(null)
  },
  writable: true
})

vi.mock('../src/renderer/components/Toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

import { useAppStore } from '../src/renderer/stores'
import { GridContextMenu } from '../src/renderer/components/GridContextMenu'

const mockConfig = {
  projects: [
    {
      name: 'Vorn',
      path: '/tmp/vorn',
      icon: 'Rocket',
      iconColor: '#ff0000',
      preferredAgents: ['claude' as const]
    },
    {
      name: 'OtherApp',
      path: '/tmp/otherapp',
      icon: 'Code',
      iconColor: '#00ff00',
      preferredAgents: ['claude' as const]
    }
  ],
  workflows: [],
  defaults: { defaultAgent: 'claude' as const, rowHeight: 208 },
  remoteHosts: [],
  workspaces: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mockListWorktrees.mockResolvedValue([])
  mockListBranches.mockResolvedValue({ current: 'main', branches: [] })

  useAppStore.setState({
    terminals: new Map(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: mockConfig as any,
    activeProject: 'Vorn',
    activeWorktreePath: null,
    activeWorkspace: 'personal',
    worktreeCache: new Map()
  })
})

describe('GridContextMenu', () => {
  it('renders smart quick-launch with active project name', () => {
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
    expect(screen.getByText('New session')).toBeInTheDocument()
  })

  it('renders every workspace project as a top-level item', () => {
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
    // Active project still appears in Projects section in addition to the quick-launch row.
    expect(screen.getByText('Vorn')).toBeInTheDocument()
    expect(screen.getByText('OtherApp')).toBeInTheDocument()
  })

  it('renders "New session..." for full dialog', () => {
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
    expect(screen.getByText('New session...')).toBeInTheDocument()
  })

  it('does not show old flat "New session in worktree" label', () => {
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
    expect(screen.queryByText('New session in worktree')).not.toBeInTheDocument()
  })

  it('shows projects list in All Projects view', () => {
    useAppStore.setState({ activeProject: null })

    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)

    // Quick launch should show generic agent session label
    expect(screen.getByText('New session')).toBeInTheDocument()

    // Projects are now top-level items, no "New session from..." wrapper
    expect(screen.queryByText('New session from...')).not.toBeInTheDocument()
    expect(screen.getByText('Vorn')).toBeInTheDocument()
    expect(screen.getByText('OtherApp')).toBeInTheDocument()
  })

  it('clicking a project item creates a session in that project', async () => {
    mockCreateTerminal.mockResolvedValue({
      id: 'proj-term',
      session: {
        id: 'proj-term',
        agentType: 'claude',
        projectName: 'OtherApp',
        projectPath: '/tmp/otherapp'
      },
      status: 'idle',
      lastOutputTimestamp: Date.now()
    })

    const onClose = vi.fn()
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={onClose} />)

    fireEvent.click(screen.getByText('OtherApp'))

    expect(onClose).toHaveBeenCalled()
    expect(mockCreateTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'claude',
        projectName: 'OtherApp',
        projectPath: '/tmp/otherapp'
      })
    )
  })

  it('quick-launch creates session with active project', async () => {
    mockCreateTerminal.mockResolvedValue({
      id: 'new-term',
      session: {
        id: 'new-term',
        agentType: 'claude',
        projectName: 'Vorn',
        projectPath: '/tmp/vorn'
      },
      status: 'idle',
      lastOutputTimestamp: Date.now()
    })

    const onClose = vi.fn()
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={onClose} />)

    fireEvent.click(screen.getByText('New session'))

    expect(onClose).toHaveBeenCalled()
    expect(mockCreateTerminal).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: 'claude',
        projectName: 'Vorn',
        projectPath: '/tmp/vorn'
      })
    )
  })

  it('no submenus are rendered — menu is flat', () => {
    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)

    const vornItem = screen.getByText('Vorn')
    fireEvent.mouseEnter(vornItem.closest('button')!)

    // No worktree entries should appear — submenus are removed
    expect(screen.queryByText('New worktree')).not.toBeInTheDocument()
  })

  it('falls back to opening dialog when no project is resolved', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAppStore.setState({ config: { ...mockConfig, projects: [] } as any, activeProject: null })

    render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)

    // Should show generic "New session" without project name
    expect(screen.getByText('New session')).toBeInTheDocument()
  })

  it('calls onClose on click outside', () => {
    const onClose = vi.fn()
    render(
      <div>
        <div data-testid="outside">outside</div>
        <GridContextMenu position={{ x: 100, y: 100 }} onClose={onClose} />
      </div>
    )
    fireEvent.pointerDown(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('New terminal item (unified sessions panel)', () => {
    it('is rendered at the top level', () => {
      render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
      expect(screen.getByText('New terminal')).toBeInTheDocument()
    })

    it('clicking it creates a shell via createShellTerminal in the active project cwd', async () => {
      const shellSession = {
        id: 'sh-1',
        agentType: 'shell' as const,
        projectName: 'vorn',
        projectPath: '/tmp/vorn',
        status: 'running' as const,
        createdAt: Date.now(),
        pid: 4321,
        displayName: 'Shell 1',
        shellCwd: '/tmp/vorn'
      }
      mockCreateShellTerminal.mockResolvedValue(shellSession)

      const addTerminal = vi.fn()
      const setActiveTabId = vi.fn()
      useAppStore.setState({ addTerminal, setActiveTabId })

      const onClose = vi.fn()
      render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={onClose} />)

      fireEvent.click(screen.getByText('New terminal'))
      // Wait for the async onClick to finish
      await new Promise((r) => setTimeout(r, 0))

      expect(onClose).toHaveBeenCalled()
      expect(mockCreateShellTerminal).toHaveBeenCalledWith('/tmp/vorn')
      expect(addTerminal).toHaveBeenCalledWith(shellSession)
      expect(setActiveTabId).toHaveBeenCalledWith('sh-1')
    })

    it('falls back to undefined cwd when there is no active project', async () => {
      useAppStore.setState({
        activeProject: null,
        config: { ...mockConfig, projects: [] } as unknown as typeof mockConfig
      })
      mockCreateShellTerminal.mockResolvedValue({
        id: 'sh-2',
        agentType: 'shell' as const,
        projectName: 'shell',
        projectPath: '/home/user',
        status: 'running' as const,
        createdAt: Date.now(),
        pid: 1,
        displayName: 'Shell 1'
      })

      render(<GridContextMenu position={{ x: 100, y: 100 }} onClose={vi.fn()} />)
      fireEvent.click(screen.getByText('New terminal'))
      await new Promise((r) => setTimeout(r, 0))

      expect(mockCreateShellTerminal).toHaveBeenCalledWith(undefined)
    })
  })
})
