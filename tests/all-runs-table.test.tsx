// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { WorkflowExecution, WorkflowNode } from '../src/shared/types'
import type { RunListEntry } from '../src/renderer/hooks/useAllWorkflowRuns'

const mockState = {
  setMainViewMode: vi.fn(),
  setEditingWorkflowId: vi.fn()
}

vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    return selector ? selector(mockState) : mockState
  }
}))

vi.mock('../src/renderer/components/LogReplayModal', () => ({
  LogReplayModal: ({ logs, onClose }: { logs: string; onClose: () => void }) => (
    <div data-testid="log-replay-modal" onClick={onClose}>
      {logs}
    </div>
  )
}))

vi.mock('../src/renderer/components/workflow-editor/RunEntry', () => ({
  StatusDot: ({ status }: { status: string }) => <span data-testid="status-dot">{status}</span>,
  NodeLabel: ({ nodeId }: { nodeId: string }) => <span data-testid="node-label">{nodeId}</span>,
  RunStepsList: () => <div data-testid="run-steps-list" />
}))

const NOW = new Date('2026-04-20T12:00:00Z').getTime()

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterAll(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  mockState.setMainViewMode.mockReset()
  mockState.setEditingWorkflowId.mockReset()
})

const { AllRunsTable } = await import('../src/renderer/components/workflow-runs/AllRunsTable')

function makeNode(id: string, label: string): WorkflowNode {
  return {
    id,
    type: 'launchAgent',
    label,
    config: {},
    position: { x: 0, y: 0 }
  } as WorkflowNode
}

function makeRun(
  workflowId: string,
  status: WorkflowExecution['status'],
  overrides: Partial<RunListEntry> = {}
): RunListEntry {
  const startedAt = overrides.startedAt ?? new Date(NOW - 60_000).toISOString()
  const completedAt =
    'completedAt' in overrides ? overrides.completedAt : new Date(NOW - 30_000).toISOString()
  return {
    workflowId,
    startedAt,
    ...(completedAt !== undefined && { completedAt }),
    status,
    nodeStates: overrides.nodeStates ?? [
      {
        nodeId: 'n1',
        status: status === 'success' ? 'success' : status === 'error' ? 'error' : 'running',
        startedAt
      }
    ],
    ...overrides
  } as RunListEntry
}

describe('AllRunsTable', () => {
  it('renders an empty-state row when there are no runs', () => {
    render(<AllRunsTable runs={[]} workflowsById={new Map()} filter="all" />)
    expect(screen.getByText('No runs to show')).toBeInTheDocument()
  })

  it('renders the live workflow name and surfaces the column headers', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha Flow', nodes: [makeNode('n1', 'Step 1')] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    expect(screen.getByText('Workflow')).toBeInTheDocument()
    expect(screen.getByText('Started')).toBeInTheDocument()
    expect(screen.getByText('Duration')).toBeInTheDocument()
    expect(screen.getByText('Trigger')).toBeInTheDocument()
    expect(screen.getByText('Last node')).toBeInTheDocument()
    expect(screen.getByText('Alpha Flow')).toBeInTheDocument()
  })

  it('falls back to the short id with a "deleted" tag when the workflow is missing', () => {
    const runs = [makeRun('407f59ea-1234-5678', 'success')]
    render(<AllRunsTable runs={runs} workflowsById={new Map()} filter="all" />)
    expect(screen.getByText('407f59ea')).toBeInTheDocument()
    expect(screen.getByText('deleted')).toBeInTheDocument()
  })

  it('shows the persisted name when only the run row carries it (workflow deleted)', () => {
    const runs = [makeRun('wf-gone', 'success', { workflowName: 'Old Name' })]
    render(<AllRunsTable runs={runs} workflowsById={new Map()} filter="all" />)
    // wfById lookup misses → still flagged as deleted, but liveName uses the persisted name.
    expect(screen.getByText('Old Name')).toBeInTheDocument()
    expect(screen.getByText('deleted')).toBeInTheDocument()
  })

  it('filters rows by bucket', () => {
    const runs = [
      makeRun('wf-a', 'success'),
      makeRun('wf-b', 'error'),
      makeRun('wf-c', 'running', { completedAt: undefined })
    ]
    const wfById = new Map([
      ['wf-a', { name: 'Alpha', nodes: [] }],
      ['wf-b', { name: 'Beta', nodes: [] }],
      ['wf-c', { name: 'Gamma', nodes: [] }]
    ])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="error" />)
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument()
  })

  it('classifies a running execution with a waiting node as the waiting bucket', () => {
    const runs = [
      makeRun('wf-w', 'running', {
        completedAt: undefined,
        nodeStates: [
          { nodeId: 'n1', status: 'waiting', startedAt: new Date(NOW - 5000).toISOString() }
        ]
      })
    ]
    const wfById = new Map([['wf-w', { name: 'Wait', nodes: [makeNode('n1', 'Step 1')] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="waiting" />)
    expect(screen.getByText('Wait')).toBeInTheDocument()
  })

  it('renders a "task · …" pill when the run was triggered by a task', () => {
    const runs = [makeRun('wf-a', 'success', { triggerTaskId: 'task-abc1234567' })]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    expect(screen.getByText(/task · task-a/)).toBeInTheDocument()
  })

  it('shows "manual" when there is no triggering task', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    expect(screen.getByText('manual')).toBeInTheDocument()
  })

  it('expands the row to show the run-steps list and renders an "Open workflow" button', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [makeNode('n1', 'Step 1')] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    fireEvent.click(screen.getByText('Alpha'))
    expect(screen.getByTestId('run-steps-list')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open workflow' })).toBeInTheDocument()
  })

  it('routes "Open workflow" to the editor for that workflow', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [makeNode('n1', 'Step 1')] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    fireEvent.click(screen.getByText('Alpha'))
    fireEvent.click(screen.getByRole('button', { name: 'Open workflow' }))
    expect(mockState.setEditingWorkflowId).toHaveBeenCalledWith('wf-a')
    expect(mockState.setMainViewMode).toHaveBeenCalledWith('workflows')
  })

  it('collapses an expanded row when clicked again', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    const row = screen.getByText('Alpha')
    fireEvent.click(row)
    expect(screen.getByTestId('run-steps-list')).toBeInTheDocument()
    fireEvent.click(row)
    expect(screen.queryByTestId('run-steps-list')).not.toBeInTheDocument()
  })

  it('opens the editor on double-click of a row', () => {
    const runs = [makeRun('wf-a', 'success')]
    const wfById = new Map([['wf-a', { name: 'Alpha', nodes: [] }]])
    render(<AllRunsTable runs={runs} workflowsById={wfById} filter="all" />)
    fireEvent.doubleClick(screen.getByText('Alpha'))
    expect(mockState.setEditingWorkflowId).toHaveBeenCalledWith('wf-a')
    expect(mockState.setMainViewMode).toHaveBeenCalledWith('workflows')
  })
})
