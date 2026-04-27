import type { NodeExecutionStatus } from '../../../shared/types'

export const STATUS_DOT_STATIC: Record<NodeExecutionStatus | 'running', string> = {
  success: 'bg-green-400',
  error: 'bg-red-500',
  running: 'bg-yellow-400',
  pending: 'bg-gray-600',
  skipped: 'bg-gray-600',
  waiting: 'bg-amber-400'
}

export const STATUS_DOT_CLASSES: Record<NodeExecutionStatus | 'running', string> = {
  ...STATUS_DOT_STATIC,
  running: `${STATUS_DOT_STATIC.running} animate-pulse`,
  waiting: `${STATUS_DOT_STATIC.waiting} animate-pulse`
}
