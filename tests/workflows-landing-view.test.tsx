// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { RunBucket } from '../src/renderer/stores/types'

const mockState = {
  workflowsLandingTab: 'runs' as 'runs' | 'review',
  workflowsRunFilter: 'all' as RunBucket,
  config: { workflows: [] as Array<{ id: string; name: string; nodes: unknown[] }> }
}

vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    return selector ? selector(mockState) : mockState
  }
}))

const runsHookMock = vi.fn(() => ({ runs: [], loading: false, reload: vi.fn() }))
vi.mock('../src/renderer/hooks/useAllWorkflowRuns', () => ({
  useAllWorkflowRuns: (...args: unknown[]) => runsHookMock(...(args as []))
}))

vi.mock('../src/renderer/components/workflow-runs/AllRunsTable', () => ({
  AllRunsTable: (props: { filter: string }) => (
    <div data-testid="all-runs-table" data-filter={props.filter} />
  )
}))

vi.mock('../src/renderer/components/workflow-runs/NeedsReviewList', () => ({
  NeedsReviewList: () => <div data-testid="needs-review-list" />
}))

const { WorkflowsLandingView } =
  await import('../src/renderer/components/workflow-runs/WorkflowsLandingView')

beforeEach(() => {
  mockState.workflowsLandingTab = 'runs'
  mockState.workflowsRunFilter = 'all'
  mockState.config = { workflows: [] }
  runsHookMock.mockReset()
  runsHookMock.mockReturnValue({ runs: [], loading: false, reload: vi.fn() })
})

describe('WorkflowsLandingView', () => {
  it('renders the All Runs table for the runs tab', () => {
    render(<WorkflowsLandingView />)
    expect(screen.getByTestId('all-runs-table')).toBeInTheDocument()
    expect(screen.queryByTestId('needs-review-list')).not.toBeInTheDocument()
  })

  it('renders the Needs Review list for the review tab', () => {
    mockState.workflowsLandingTab = 'review'
    render(<WorkflowsLandingView />)
    expect(screen.getByTestId('needs-review-list')).toBeInTheDocument()
    expect(screen.queryByTestId('all-runs-table')).not.toBeInTheDocument()
  })

  it('threads the current filter into AllRunsTable', () => {
    mockState.workflowsRunFilter = 'error'
    render(<WorkflowsLandingView />)
    expect(screen.getByTestId('all-runs-table').getAttribute('data-filter')).toBe('error')
  })
})
