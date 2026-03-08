import { AgentStatus } from '../../shared/types'

const STATUS_CONFIG: Record<AgentStatus, { color: string; glow: string; label: string; pulse: boolean }> = {
  running: { color: 'bg-green-500', glow: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]', label: 'Running', pulse: true },
  waiting: { color: 'bg-yellow-500', glow: 'shadow-[0_0_6px_rgba(234,179,8,0.4)]', label: 'Waiting', pulse: true },
  idle: { color: 'bg-gray-500', glow: '', label: 'Idle', pulse: false },
  error: { color: 'bg-red-500', glow: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]', label: 'Error', pulse: false }
}

interface Props {
  status: AgentStatus
}

export function StatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        {config.pulse && (
          <div
            className={`absolute w-2.5 h-2.5 rounded-full ${config.color} opacity-40 animate-ping`}
            style={{ animationDuration: '2s' }}
          />
        )}
        <div
          className={`relative w-2.5 h-2.5 rounded-full ${config.color} ${config.glow}`}
        />
      </div>
      <span className="text-xs text-gray-400">{config.label}</span>
    </div>
  )
}
