import { describe, it, expect } from 'vitest'
import {
  buildDefaultTaskWorkflow,
  DEFAULT_TASK_WORKFLOW_ID
} from '../packages/server/src/default-workflows'
import type {
  LaunchAgentConfig,
  TaskStatusChangedTriggerConfig
} from '../packages/shared/src/types'

describe('buildDefaultTaskWorkflow', () => {
  it('has the stable system id', () => {
    const wf = buildDefaultTaskWorkflow()
    expect(wf.id).toBe(DEFAULT_TASK_WORKFLOW_ID)
    expect(DEFAULT_TASK_WORKFLOW_ID).toBe('system:default-task-workflow')
  })

  it('is enabled and scoped to the personal workspace', () => {
    const wf = buildDefaultTaskWorkflow()
    expect(wf.enabled).toBe(true)
    expect(wf.workspaceId).toBe('personal')
  })

  it('triggers on todo → in_progress with no project filter', () => {
    const wf = buildDefaultTaskWorkflow()
    const triggerNode = wf.nodes.find((n) => n.type === 'trigger')
    expect(triggerNode).toBeDefined()
    const trigger = triggerNode!.config as TaskStatusChangedTriggerConfig
    expect(trigger.triggerType).toBe('taskStatusChanged')
    expect(trigger.fromStatus).toBe('todo')
    expect(trigger.toStatus).toBe('in_progress')
    expect(trigger.projectFilter).toBeUndefined()
  })

  it('has exactly one headless launchAgent node using fromTask', () => {
    const wf = buildDefaultTaskWorkflow()
    const launchNodes = wf.nodes.filter((n) => n.type === 'launchAgent')
    expect(launchNodes).toHaveLength(1)
    const launch = launchNodes[0].config as LaunchAgentConfig
    expect(launch.agentType).toBe('fromTask')
    expect(launch.headless).toBe(true)
  })

  it('connects the trigger to the launchAgent with one edge', () => {
    const wf = buildDefaultTaskWorkflow()
    expect(wf.edges).toHaveLength(1)
    const [edge] = wf.edges
    const trigger = wf.nodes.find((n) => n.type === 'trigger')!
    const launch = wf.nodes.find((n) => n.type === 'launchAgent')!
    expect(edge.source).toBe(trigger.id)
    expect(edge.target).toBe(launch.id)
  })

  it('round-trips through JSON without losing fields', () => {
    const wf = buildDefaultTaskWorkflow()
    const roundTripped = JSON.parse(JSON.stringify(wf))
    expect(roundTripped).toEqual(wf)
  })
})
