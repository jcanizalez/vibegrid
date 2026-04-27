import { useMemo } from 'react'
import { useAllWorkflowRuns } from '../../hooks/useAllWorkflowRuns'
import { useAppStore } from '../../stores'
import { AllRunsTable } from './AllRunsTable'
import { NeedsReviewList } from './NeedsReviewList'

export function WorkflowsLandingView() {
  const tab = useAppStore((s) => s.workflowsLandingTab)
  const filter = useAppStore((s) => s.workflowsRunFilter)
  const { runs } = useAllWorkflowRuns(50)
  const workflows = useAppStore((s) => s.config?.workflows)
  const workflowsById = useMemo(
    () => new Map((workflows ?? []).map((w) => [w.id, { name: w.name, nodes: w.nodes ?? [] }])),
    [workflows]
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {tab === 'runs' ? (
          <AllRunsTable runs={runs} workflowsById={workflowsById} filter={filter} />
        ) : (
          <NeedsReviewList />
        )}
      </div>
    </div>
  )
}
