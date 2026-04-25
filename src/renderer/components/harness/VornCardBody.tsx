import { ChatTimeline } from './ChatTimeline'
import { Composer } from './Composer'
import { PermissionOverlay } from './PermissionOverlay'
import { TurnIndicator } from './TurnIndicator'

interface Props {
  harnessSessionId: string
}

export function VornCardBody({ harnessSessionId }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0 bg-[#141416]">
      <ChatTimeline sessionId={harnessSessionId} />
      <PermissionOverlay sessionId={harnessSessionId} />
      <TurnIndicator sessionId={harnessSessionId} />
      <Composer sessionId={harnessSessionId} />
    </div>
  )
}
