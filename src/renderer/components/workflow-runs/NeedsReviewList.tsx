import { useAppStore } from '../../stores'
import { useWaitingApprovals } from '../../hooks/useWaitingApprovals'
import { RunEntry } from '../workflow-editor/RunEntry'

export function NeedsReviewList() {
  const waiting = useWaitingApprovals()
  const tasks = useAppStore((s) => s.config?.tasks)

  if (waiting.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600 text-[12px]">
        No runs waiting on approval.
      </div>
    )
  }

  // Group by execution so each paused run renders once with all its waiting
  // gates expanded inline. RunEntry already auto-expands when a gate is
  // waiting, so we just hand it the executions.
  const byExecution = new Map<string, (typeof waiting)[number]>()
  for (const w of waiting) {
    const key = `${w.execution.workflowId}-${w.execution.startedAt}`
    if (!byExecution.has(key)) byExecution.set(key, w)
  }

  return (
    <div className="flex flex-col gap-2 px-3.5 py-4">
      {[...byExecution.values()].map((w) => (
        <RunEntry
          key={`${w.execution.workflowId}-${w.execution.startedAt}`}
          execution={w.execution}
          nodes={w.workflow?.nodes ?? []}
          workflowName={w.workflow?.name}
          tasks={tasks}
        />
      ))}
    </div>
  )
}
