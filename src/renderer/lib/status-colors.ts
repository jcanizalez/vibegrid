import type { AgentStatus } from '../../shared/types'

export const STATUS_DOT: Record<AgentStatus, string> = {
  running: 'bg-green-500',
  waiting: 'bg-yellow-500',
  idle: 'bg-gray-500',
  error: 'bg-red-500'
}
