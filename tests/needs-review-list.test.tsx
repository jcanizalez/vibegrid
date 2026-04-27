// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mockState = {
  config: { tasks: [] as unknown[] }
}

vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    return selector ? selector(mockState) : mockState
  }
}))

const waitingMock = vi.fn(
  () =>
    [] as Array<{
      execution: { workflowId: string; startedAt: string }
      workflow?: { name?: string }
    }>
)
vi.mock('../src/renderer/hooks/useWaitingApprovals', () => ({
  useWaitingApprovals: () => waitingMock()
}))

vi.mock('../src/renderer/components/workflow-editor/RunEntry', () => ({
  RunEntry: ({ workflowName }: { workflowName?: string }) => (
    <div data-testid="run-entry" data-name={workflowName} />
  )
}))

const { NeedsReviewList } = await import('../src/renderer/components/workflow-runs/NeedsReviewList')

beforeEach(() => {
  waitingMock.mockReset()
  waitingMock.mockReturnValue([])
})

describe('NeedsReviewList', () => {
  it('renders the empty state when no executions are waiting', () => {
    render(<NeedsReviewList />)
    expect(screen.getByText('No runs waiting on approval.')).toBeInTheDocument()
  })

  it('renders one RunEntry per unique waiting execution', () => {
    const exec1 = { workflowId: 'wf-1', startedAt: '2026-04-20T10:00:00Z' }
    const exec2 = { workflowId: 'wf-2', startedAt: '2026-04-20T10:01:00Z' }
    waitingMock.mockReturnValue([
      { execution: exec1, workflow: { name: 'One' } },
      { execution: exec1, workflow: { name: 'One' } },
      { execution: exec2, workflow: { name: 'Two' } }
    ])
    render(<NeedsReviewList />)
    expect(screen.getAllByTestId('run-entry')).toHaveLength(2)
  })
})
