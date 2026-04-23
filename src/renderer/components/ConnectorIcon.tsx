import { ExternalLink } from 'lucide-react'
import { Tooltip } from './Tooltip'

const CONNECTOR_ICONS: Record<string, React.FC<{ size: number; className?: string }>> = {
  github: ({ size, className }) => (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
  linear: ({ size, className }) => (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="currentColor">
      <path d="M0.856 8.972L7.028 15.144C3.291 14.618 0.382 11.709 0.856 8.972ZM0.254 7.396L8.604 15.746C12.758 15.09 15.09 12.758 15.746 8.604L7.396 0.254C3.242 0.91 0.91 3.242 0.254 7.396ZM8.972 0.856L15.144 7.028C14.618 3.291 11.709 0.382 8.972 0.856Z" />
    </svg>
  )
}

const DEFAULT_ICON: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <ExternalLink size={size} className={className} />
)

export function ConnectorIcon({
  connectorId,
  size = 12,
  className = 'text-gray-500'
}: {
  connectorId: string
  size?: number
  className?: string
}) {
  const Icon = CONNECTOR_ICONS[connectorId] || DEFAULT_ICON
  return <Icon size={size} className={className} />
}

export function SourceBadge({
  connectorId,
  url,
  label
}: {
  connectorId: string
  url?: string
  label?: string
}) {
  const badge = (
    <span className="inline-flex items-center gap-0.5">
      <ConnectorIcon connectorId={connectorId} size={11} className="text-gray-500" />
      {label && <span className="text-[10px] text-gray-500">{label}</span>}
    </span>
  )

  if (url) {
    return (
      <Tooltip label={`Open in ${connectorId}`}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            window.api.openExternal(url)
          }}
          className="inline-flex items-center hover:text-gray-300 transition-colors"
        >
          {badge}
        </a>
      </Tooltip>
    )
  }

  return badge
}
