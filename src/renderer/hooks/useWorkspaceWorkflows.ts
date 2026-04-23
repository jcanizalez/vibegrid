import { useMemo } from 'react'
import { useAppStore } from '../stores'
import { isScheduledWorkflow } from '../lib/workflow-helpers'

/**
 * Returns the manual-trigger workflows belonging to the active workspace.
 * Scheduled/event-driven workflows are excluded since they don't make
 * sense to run manually from context menus.
 */
export function useWorkspaceWorkflows() {
  const workflows = useAppStore((s) => s.config?.workflows)
  const activeWorkspace = useAppStore((s) => s.activeWorkspace)
  return useMemo(
    () =>
      (workflows ?? []).filter(
        (w) => (w.workspaceId ?? 'personal') === activeWorkspace && !isScheduledWorkflow(w)
      ),
    [workflows, activeWorkspace]
  )
}
