import type {
  WorkflowDefinition,
  TaskStatusChangedTriggerConfig,
  LaunchAgentConfig
} from '@vornrun/shared/types'

/** Stable id of the seeded "Default Task Workflow". */
export const DEFAULT_TASK_WORKFLOW_ID = 'system:default-task-workflow'

/**
 * Factory for the default task workflow seeded on first launch.
 *
 * Shape: a `taskStatusChanged` trigger (todo → in_progress, any project) wired
 * to a single headless `launchAgent` node whose `agentType` is `'fromTask'`.
 * At run time, `resolveEffectiveAgent` reads `task.assignedAgent` from the
 * trigger context, so the agent the user picks on each task is what actually
 * launches. The whole thing is editable in the workflow editor — users can
 * change the trigger, swap the agent, add steps, or disable/delete the
 * workflow outright. Nothing here is hidden or privileged; it's a worked
 * example that uses the same values any user could configure by hand.
 */
export function buildDefaultTaskWorkflow(): WorkflowDefinition {
  const triggerConfig: TaskStatusChangedTriggerConfig = {
    triggerType: 'taskStatusChanged',
    fromStatus: 'todo',
    toStatus: 'in_progress'
    // projectFilter omitted → fires in every project
  }

  const launchConfig: LaunchAgentConfig = {
    agentType: 'fromTask',
    projectName: '',
    projectPath: '',
    headless: true
  }

  return {
    id: DEFAULT_TASK_WORKFLOW_ID,
    name: 'Default Task Workflow',
    icon: 'Play',
    iconColor: '#10b981',
    enabled: true,
    workspaceId: 'personal',
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger',
        label: 'When task moves to In Progress',
        position: { x: 0, y: 0 },
        config: triggerConfig
      },
      {
        id: 'launch-1',
        type: 'launchAgent',
        label: 'Launch task agent',
        position: { x: 0, y: 120 },
        config: launchConfig
      }
    ],
    edges: [{ id: 'e1', source: 'trigger-1', target: 'launch-1' }]
  }
}
