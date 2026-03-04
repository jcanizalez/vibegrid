import { AgentType, AgentCommandConfig } from './types'

export const DEFAULT_AGENT_COMMANDS: Record<AgentType, AgentCommandConfig> = {
  claude: { command: 'claude', args: [] },
  copilot: { command: 'copilot', args: [], fallbackCommand: 'gh', fallbackArgs: ['copilot'] },
  codex: { command: 'codex', args: [] },
  opencode: { command: 'opencode', args: [] },
  gemini: { command: 'gemini', args: [] }
}
