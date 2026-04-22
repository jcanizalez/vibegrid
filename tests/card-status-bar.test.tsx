// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'

vi.mock('../src/renderer/components/TerminalSlot', () => ({
  TerminalSlot: () => <div data-testid="terminal-instance" />
}))
vi.mock('../src/renderer/components/PromptLauncher', () => ({
  PromptLauncher: () => null
}))
vi.mock('../src/renderer/components/CardContextMenu', () => ({
  CardContextMenu: () => null
}))
vi.mock('../src/renderer/components/BackgroundTray', () => ({
  BackgroundTray: () => null
}))
vi.mock('../src/renderer/components/MobileFontSizeControl', () => ({
  MobileFontSizeControl: () => null
}))
vi.mock('../src/renderer/components/MobileTerminalKeybar', () => ({
  MobileTerminalKeybar: () => null
}))
vi.mock('../src/renderer/components/GitChangesIndicator', () => ({
  GitChangesIndicator: () => <div data-testid="git-changes" />,
  BrowseFilesButton: () => <div data-testid="browse-files" />
}))
vi.mock('../src/renderer/components/GridContextMenu', () => ({
  GridContextMenu: () => null
}))
let mockIsMobile = false
vi.mock('../src/renderer/hooks/useIsMobile', () => ({
  useIsMobile: () => mockIsMobile
}))
vi.mock('../src/renderer/hooks/useTerminalScrollButton', () => ({
  useTerminalScrollButton: () => ({ showScrollBtn: false, handleScrollToBottom: vi.fn() })
}))
vi.mock('../src/renderer/hooks/useTerminalPinchZoom', () => ({
  useTerminalPinchZoom: vi.fn()
}))
vi.mock('../src/renderer/hooks/useVisibleTerminals', () => ({
  useVisibleTerminals: () => ({ orderedIds: ['term-1'], minimizedIds: [] })
}))
vi.mock('../src/renderer/hooks/useFilteredHeadless', () => ({
  useFilteredHeadless: () => []
}))
vi.mock('../src/renderer/lib/terminal-close', () => ({
  closeTerminalSession: vi.fn()
}))
vi.mock('../src/renderer/lib/session-utils', () => ({
  resolveActiveProject: () => null
}))
vi.mock('../src/renderer/components/Toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))
vi.mock('../src/renderer/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>
}))
vi.mock('../src/renderer/components/ConfirmPopover', () => ({
  ConfirmPopover: ({ children }: { children: ReactNode }) => <>{children}</>
}))

Object.defineProperty(window, 'api', {
  value: {
    killTerminal: vi.fn(),
    saveConfig: vi.fn(),
    notifyWidgetStatus: vi.fn(),
    getGitDiffStat: vi.fn().mockResolvedValue(null),
    createTerminal: vi.fn(),
    listBranches: vi.fn().mockResolvedValue({ local: [], remote: [] }),
    listRemoteBranches: vi.fn().mockResolvedValue([]),
    checkoutBranch: vi.fn().mockResolvedValue({ ok: true })
  },
  writable: true
})

import { useAppStore } from '../src/renderer/stores'
import { CardStatusBar } from '../src/renderer/components/card/CardStatusBar'
import { TabView } from '../src/renderer/components/TabView'
import { FocusedTerminal } from '../src/renderer/components/FocusedTerminal'

const mockTerminal = {
  id: 'term-1',
  session: {
    id: 'term-1',
    agentType: 'claude' as const,
    projectName: 'Vorn',
    projectPath: '/tmp/vorn',
    status: 'running' as const,
    createdAt: Date.now(),
    pid: 1234,
    branch: 'main',
    isWorktree: false
  },
  status: 'running' as const,
  lastOutputTimestamp: Date.now()
}

const initialState = useAppStore.getState()

beforeEach(() => {
  mockIsMobile = false
  const terminals = new Map()
  terminals.set('term-1', mockTerminal)
  act(() => {
    useAppStore.setState({
      terminals,
      activeTabId: 'term-1',
      focusedTerminalId: null,
      previewTerminalId: null,
      statusFilter: 'all',
      sortMode: 'manual',
      renamingTerminalId: null
    })
  })
})

afterEach(() => {
  act(() => {
    useAppStore.setState(initialState)
  })
})

describe('CardStatusBar — bottom VS Code style strip', () => {
  it('renders the branch chip for the given terminal', () => {
    render(<CardStatusBar terminalId="term-1" />)
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Switch branch/ })).toBeInTheDocument()
  })

  it('renders nothing when the terminal has no branch and no task', () => {
    const terminals = new Map()
    terminals.set('blank', {
      id: 'blank',
      session: { ...mockTerminal.session, id: 'blank', branch: undefined },
      status: 'running' as const,
      lastOutputTimestamp: Date.now()
    })
    act(() => {
      useAppStore.setState({ terminals })
    })
    const { container } = render(<CardStatusBar terminalId="blank" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the terminal is missing', () => {
    const { container } = render(<CardStatusBar terminalId="nonexistent" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens BranchPicker and switches branches via the dropdown', async () => {
    const listBranches = vi.fn().mockResolvedValue({ local: ['main', 'feature-x'], remote: [] })
    const checkoutBranch = vi.fn().mockResolvedValue({ ok: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.api as any).listBranches = listBranches
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(window.api as any).checkoutBranch = checkoutBranch

    render(<CardStatusBar terminalId="term-1" />)
    const branchButton = screen.getByRole('button', { name: /Switch branch/ })
    fireEvent.click(branchButton)

    const featureEntry = await screen.findByText('feature-x')
    fireEvent.click(featureEntry)

    await waitFor(() => expect(checkoutBranch).toHaveBeenCalledWith('/tmp/vorn', 'feature-x'))
  })

  it('renders worktree name and branch name for worktree sessions', () => {
    const terminals = new Map()
    terminals.set('wt-1', {
      id: 'wt-1',
      session: {
        ...mockTerminal.session,
        id: 'wt-1',
        branch: 'feature-x',
        isWorktree: true,
        worktreeName: 'feature-x-wt',
        worktreePath: '/tmp/wt/feature-x'
      },
      status: 'running' as const,
      lastOutputTimestamp: Date.now()
    })
    act(() => {
      useAppStore.setState({ terminals })
    })
    render(<CardStatusBar terminalId="wt-1" />)
    expect(screen.getByText('feature-x-wt')).toBeInTheDocument()
    expect(screen.getByText('feature-x')).toBeInTheDocument()
  })

  it('renders assigned-task pill in the status bar', () => {
    const task = {
      id: 'task-1',
      title: 'Ship the homologation',
      status: 'in_progress' as const,
      assignedSessionId: 'term-1'
    }
    act(() => {
      useAppStore.setState({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: { tasks: [task] } as any
      })
    })
    render(<CardStatusBar terminalId="term-1" />)
    expect(screen.getByRole('button', { name: /Ship the homologation/ })).toBeInTheDocument()
  })
})

describe('TabView mounts CardStatusBar at the bottom', () => {
  it('renders the branch chip for the active tab', () => {
    render(<TabView />)
    expect(screen.getAllByRole('button', { name: /Switch branch/ }).length).toBeGreaterThan(0)
    expect(screen.getByText('main')).toBeInTheDocument()
  })
})

describe('FocusedTerminal uses CardStatusBar on desktop', () => {
  it('renders branch and diff pill in the bottom bar', () => {
    act(() => {
      useAppStore.setState({ focusedTerminalId: 'term-1' })
    })
    render(<FocusedTerminal />)
    expect(screen.getByRole('button', { name: /Switch branch/ })).toBeInTheDocument()
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByTestId('git-changes')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Browse files/ })).toBeInTheDocument()
  })
})

describe('FocusedTerminal on mobile keeps branch in the title bar', () => {
  it('renders branch label for a non-worktree session in the mobile title bar', () => {
    mockIsMobile = true
    act(() => {
      useAppStore.setState({ focusedTerminalId: 'term-1' })
    })
    render(<FocusedTerminal />)
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.queryByText('worktree')).not.toBeInTheDocument()
    // Desktop CardStatusBar should not be mounted on mobile
    expect(screen.queryByTestId('git-changes')).not.toBeInTheDocument()
  })

  it('renders worktree name and branch name on mobile for worktree sessions', () => {
    mockIsMobile = true
    const terminals = new Map()
    terminals.set('wt-1', {
      id: 'wt-1',
      session: {
        ...mockTerminal.session,
        id: 'wt-1',
        branch: 'feature-x',
        isWorktree: true,
        worktreeName: 'feature-x-wt',
        worktreePath: '/tmp/wt/feature-x'
      },
      status: 'running' as const,
      lastOutputTimestamp: Date.now()
    })
    act(() => {
      useAppStore.setState({ terminals, focusedTerminalId: 'wt-1' })
    })
    render(<FocusedTerminal />)
    expect(screen.getByText('feature-x-wt')).toBeInTheDocument()
    expect(screen.getByText('feature-x')).toBeInTheDocument()
    expect(screen.queryByText('worktree')).not.toBeInTheDocument()
  })
})
