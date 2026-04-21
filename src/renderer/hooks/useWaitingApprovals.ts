import { useMemo } from 'react'
import { useAppStore } from '../stores'
import type { WaitingApproval } from '../components/BackgroundTray'

const EMPTY: WaitingApproval[] = []

export function useWaitingApprovals(): WaitingApproval[] {
  const workflowExecutions = useAppStore((s) => s.workflowExecutions)
  const workflows = useAppStore((s) => s.config?.workflows)
  const activeWorkspace = useAppStore((s) => s.activeWorkspace)

  return useMemo(() => {
    if (workflowExecutions.size === 0) return EMPTY
    const out: WaitingApproval[] = []
    for (const execution of workflowExecutions.values()) {
      const workflow = workflows?.find((w) => w.id === execution.workflowId)
      if (workflow && (workflow.workspaceId ?? 'personal') !== activeWorkspace) continue
      for (const ns of execution.nodeStates) {
        if (ns.status === 'waiting') {
          out.push({ execution, nodeState: ns, workflow })
        }
      }
    }
    return out
  }, [workflowExecutions, workflows, activeWorkspace])
}
