import crypto from 'node:crypto'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { configManager as ConfigManagerInstance } from '../config-manager'
import type { scheduler as SchedulerInstance } from '../scheduler'
import type { WorkflowConfig, ShortcutAction, Schedule } from '../../shared/types'

type ConfigManager = typeof ConfigManagerInstance
type Scheduler = typeof SchedulerInstance

const actionSchema = z.object({
  agentType: z.enum(['claude', 'copilot', 'codex', 'opencode', 'gemini']),
  projectName: z.string(),
  projectPath: z.string(),
  args: z.array(z.string()).optional(),
  displayName: z.string().optional(),
  branch: z.string().optional(),
  useWorktree: z.boolean().optional(),
  remoteHostId: z.string().optional(),
  prompt: z.string().optional(),
  promptDelayMs: z.number().optional(),
  taskId: z.string().optional(),
  taskFromQueue: z.boolean().optional()
})

const scheduleSchema = z.union([
  z.object({ type: z.literal('manual') }),
  z.object({ type: z.literal('once'), runAt: z.string() }),
  z.object({ type: z.literal('recurring'), cron: z.string(), timezone: z.string().optional() })
])

export function registerWorkflowTools(
  server: McpServer,
  deps: { configManager: ConfigManager; scheduler: Scheduler }
): void {
  const { configManager, scheduler } = deps

  server.tool(
    'list_workflows',
    'List all workflows',
    async () => {
      const config = configManager.loadConfig()
      return { content: [{ type: 'text', text: JSON.stringify(config.shortcuts ?? [], null, 2) }] }
    }
  )

  server.tool(
    'create_workflow',
    'Create a new workflow (automated agent launch sequence)',
    {
      name: z.string().describe('Workflow name'),
      actions: z.array(actionSchema).describe('Actions to execute'),
      icon: z.string().optional().describe('Lucide icon name (default: zap)'),
      icon_color: z.string().optional().describe('Hex color (default: #6366f1)'),
      schedule: scheduleSchema.optional().describe('Schedule: manual, once, or recurring'),
      enabled: z.boolean().optional().describe('Whether workflow is enabled (default: true)'),
      stagger_delay_ms: z.number().optional().describe('Delay in ms between actions')
    },
    async (args) => {
      const config = configManager.loadConfig()

      const workflow: WorkflowConfig = {
        id: crypto.randomUUID(),
        name: args.name,
        icon: args.icon ?? 'zap',
        iconColor: args.icon_color ?? '#6366f1',
        actions: args.actions as ShortcutAction[],
        schedule: (args.schedule as Schedule) ?? { type: 'manual' },
        enabled: args.enabled ?? true,
        ...(args.stagger_delay_ms && { staggerDelayMs: args.stagger_delay_ms })
      }

      if (!config.shortcuts) config.shortcuts = []
      config.shortcuts.push(workflow)
      configManager.saveConfig(config)
      scheduler.syncSchedules(config.shortcuts)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(workflow, null, 2) }] }
    }
  )

  server.tool(
    'update_workflow',
    'Update a workflow\'s properties',
    {
      id: z.string().describe('Workflow ID'),
      name: z.string().optional(),
      actions: z.array(actionSchema).optional(),
      icon: z.string().optional(),
      icon_color: z.string().optional(),
      schedule: scheduleSchema.optional(),
      enabled: z.boolean().optional(),
      stagger_delay_ms: z.number().optional()
    },
    async (args) => {
      const config = configManager.loadConfig()
      const workflow = (config.shortcuts ?? []).find(w => w.id === args.id)
      if (!workflow) {
        return { content: [{ type: 'text', text: `Error: workflow "${args.id}" not found` }], isError: true }
      }

      if (args.name !== undefined) workflow.name = args.name
      if (args.actions !== undefined) workflow.actions = args.actions as ShortcutAction[]
      if (args.icon !== undefined) workflow.icon = args.icon
      if (args.icon_color !== undefined) workflow.iconColor = args.icon_color
      if (args.schedule !== undefined) workflow.schedule = args.schedule as Schedule
      if (args.enabled !== undefined) workflow.enabled = args.enabled
      if (args.stagger_delay_ms !== undefined) workflow.staggerDelayMs = args.stagger_delay_ms

      configManager.saveConfig(config)
      scheduler.syncSchedules(config.shortcuts ?? [])
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(workflow, null, 2) }] }
    }
  )

  server.tool(
    'delete_workflow',
    'Delete a workflow',
    { id: z.string().describe('Workflow ID') },
    async (args) => {
      const config = configManager.loadConfig()
      const idx = (config.shortcuts ?? []).findIndex(w => w.id === args.id)
      if (idx === -1) {
        return { content: [{ type: 'text', text: `Error: workflow "${args.id}" not found` }], isError: true }
      }

      const [removed] = config.shortcuts!.splice(idx, 1)
      configManager.saveConfig(config)
      scheduler.syncSchedules(config.shortcuts ?? [])
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: `Deleted workflow: ${removed.name}` }] }
    }
  )
}
