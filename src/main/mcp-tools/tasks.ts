import crypto from 'node:crypto'
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { configManager as ConfigManagerInstance } from '../config-manager'
import type { TaskConfig, TaskStatus, AgentType } from '../../shared/types'

type ConfigManager = typeof ConfigManagerInstance

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done', 'cancelled']
const AGENT_TYPES: [AgentType, ...AgentType[]] = ['claude', 'copilot', 'codex', 'opencode', 'gemini']

export function registerTaskTools(server: McpServer, deps: { configManager: ConfigManager }): void {
  const { configManager } = deps

  server.tool(
    'list_tasks',
    'List tasks, optionally filtered by project and/or status',
    {
      project_name: z.string().optional().describe('Filter by project name'),
      status: z.enum(TASK_STATUSES as [string, ...string[]]).optional().describe('Filter by status')
    },
    async (args) => {
      const config = configManager.loadConfig()
      let tasks = config.tasks ?? []
      if (args.project_name) tasks = tasks.filter(t => t.projectName === args.project_name)
      if (args.status) tasks = tasks.filter(t => t.status === args.status)
      return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] }
    }
  )

  server.tool(
    'create_task',
    'Create a new task in a project',
    {
      project_name: z.string().describe('Project name (must match existing project)'),
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description (markdown)'),
      status: z.enum(TASK_STATUSES as [string, ...string[]]).optional().describe('Task status (default: todo)'),
      branch: z.string().optional().describe('Git branch for this task'),
      use_worktree: z.boolean().optional().describe('Create a git worktree for this task'),
      assigned_agent: z.enum(AGENT_TYPES).optional().describe('Assign to an agent type')
    },
    async (args) => {
      const config = configManager.loadConfig()
      const project = config.projects.find(p => p.name === args.project_name)
      if (!project) {
        return { content: [{ type: 'text', text: `Error: project "${args.project_name}" not found` }], isError: true }
      }

      const projectTasks = (config.tasks ?? []).filter(t => t.projectName === args.project_name)
      const maxOrder = projectTasks.length > 0 ? Math.max(...projectTasks.map(t => t.order)) : -1
      const now = new Date().toISOString()
      const status = (args.status as TaskStatus) ?? 'todo'

      const task: TaskConfig = {
        id: crypto.randomUUID(),
        projectName: args.project_name,
        title: args.title,
        description: args.description ?? '',
        status,
        order: maxOrder + 1,
        createdAt: now,
        updatedAt: now,
        ...(args.branch && { branch: args.branch }),
        ...(args.use_worktree && { useWorktree: args.use_worktree }),
        ...(args.assigned_agent && { assignedAgent: args.assigned_agent as AgentType }),
        ...((status === 'done' || status === 'cancelled') && { completedAt: now })
      }

      if (!config.tasks) config.tasks = []
      config.tasks.push(task)
      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] }
    }
  )

  server.tool(
    'get_task',
    'Get a task by ID',
    { id: z.string().describe('Task ID') },
    async (args) => {
      const config = configManager.loadConfig()
      const task = (config.tasks ?? []).find(t => t.id === args.id)
      if (!task) {
        return { content: [{ type: 'text', text: `Error: task "${args.id}" not found` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] }
    }
  )

  server.tool(
    'update_task',
    'Update a task\'s properties',
    {
      id: z.string().describe('Task ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(TASK_STATUSES as [string, ...string[]]).optional().describe('New status'),
      branch: z.string().optional().describe('Git branch'),
      use_worktree: z.boolean().optional().describe('Use git worktree'),
      assigned_agent: z.enum(AGENT_TYPES).optional().describe('Assigned agent type'),
      order: z.number().optional().describe('Queue order')
    },
    async (args) => {
      const config = configManager.loadConfig()
      const task = (config.tasks ?? []).find(t => t.id === args.id)
      if (!task) {
        return { content: [{ type: 'text', text: `Error: task "${args.id}" not found` }], isError: true }
      }

      if (args.title !== undefined) task.title = args.title
      if (args.description !== undefined) task.description = args.description
      if (args.branch !== undefined) task.branch = args.branch
      if (args.use_worktree !== undefined) task.useWorktree = args.use_worktree
      if (args.assigned_agent !== undefined) task.assignedAgent = args.assigned_agent as AgentType
      if (args.order !== undefined) task.order = args.order

      if (args.status !== undefined) {
        const newStatus = args.status as TaskStatus
        const wasDone = task.status === 'done' || task.status === 'cancelled'
        const isDone = newStatus === 'done' || newStatus === 'cancelled'
        task.status = newStatus
        if (isDone && !wasDone) task.completedAt = new Date().toISOString()
        if (!isDone && wasDone) delete task.completedAt
      }

      task.updatedAt = new Date().toISOString()
      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(task, null, 2) }] }
    }
  )

  server.tool(
    'delete_task',
    'Delete a task by ID',
    { id: z.string().describe('Task ID') },
    async (args) => {
      const config = configManager.loadConfig()
      const idx = (config.tasks ?? []).findIndex(t => t.id === args.id)
      if (idx === -1) {
        return { content: [{ type: 'text', text: `Error: task "${args.id}" not found` }], isError: true }
      }
      const [removed] = config.tasks!.splice(idx, 1)
      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: `Deleted task: ${removed.title}` }] }
    }
  )
}
