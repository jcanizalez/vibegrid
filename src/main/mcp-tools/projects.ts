import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { configManager as ConfigManagerInstance } from '../config-manager'
import type { AgentType } from '../../shared/types'

type ConfigManager = typeof ConfigManagerInstance

const AGENT_TYPES: [AgentType, ...AgentType[]] = ['claude', 'copilot', 'codex', 'opencode', 'gemini']

export function registerProjectTools(server: McpServer, deps: { configManager: ConfigManager }): void {
  const { configManager } = deps

  server.tool(
    'list_projects',
    'List all projects',
    async () => {
      const config = configManager.loadConfig()
      return { content: [{ type: 'text', text: JSON.stringify(config.projects, null, 2) }] }
    }
  )

  server.tool(
    'create_project',
    'Create a new project',
    {
      name: z.string().describe('Project name (unique identifier)'),
      path: z.string().describe('Absolute path to project directory'),
      preferred_agents: z.array(z.enum(AGENT_TYPES)).optional().describe('Preferred agent types'),
      icon: z.string().optional().describe('Lucide icon name'),
      icon_color: z.string().optional().describe('Hex color for icon')
    },
    async (args) => {
      const config = configManager.loadConfig()
      if (config.projects.find(p => p.name === args.name)) {
        return { content: [{ type: 'text', text: `Error: project "${args.name}" already exists` }], isError: true }
      }

      const project = {
        name: args.name,
        path: args.path,
        preferredAgents: (args.preferred_agents as AgentType[]) ?? [],
        ...(args.icon && { icon: args.icon }),
        ...(args.icon_color && { iconColor: args.icon_color })
      }

      config.projects.push(project)
      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] }
    }
  )

  server.tool(
    'update_project',
    'Update a project\'s properties',
    {
      name: z.string().describe('Project name (identifier, cannot be changed)'),
      path: z.string().optional().describe('New project path'),
      preferred_agents: z.array(z.enum(AGENT_TYPES)).optional().describe('Preferred agent types'),
      icon: z.string().optional().describe('Lucide icon name'),
      icon_color: z.string().optional().describe('Hex color for icon')
    },
    async (args) => {
      const config = configManager.loadConfig()
      const project = config.projects.find(p => p.name === args.name)
      if (!project) {
        return { content: [{ type: 'text', text: `Error: project "${args.name}" not found` }], isError: true }
      }

      if (args.path !== undefined) project.path = args.path
      if (args.preferred_agents !== undefined) project.preferredAgents = args.preferred_agents as AgentType[]
      if (args.icon !== undefined) project.icon = args.icon
      if (args.icon_color !== undefined) project.iconColor = args.icon_color

      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: JSON.stringify(project, null, 2) }] }
    }
  )

  server.tool(
    'delete_project',
    'Delete a project and all its tasks',
    { name: z.string().describe('Project name') },
    async (args) => {
      const config = configManager.loadConfig()
      const idx = config.projects.findIndex(p => p.name === args.name)
      if (idx === -1) {
        return { content: [{ type: 'text', text: `Error: project "${args.name}" not found` }], isError: true }
      }

      const [removed] = config.projects.splice(idx, 1)
      if (config.tasks) {
        config.tasks = config.tasks.filter(t => t.projectName !== args.name)
      }

      configManager.saveConfig(config)
      configManager.notifyChanged()

      return { content: [{ type: 'text', text: `Deleted project: ${removed.name}` }] }
    }
  )
}
