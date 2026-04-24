import { useAppStore } from '../../stores'
import { Tooltip } from '../Tooltip'
import { getShortcut } from '../../lib/keyboard-shortcuts'
import { CircleHelp, Settings } from 'lucide-react'

export function SidebarFooter({
  isCollapsed,
  closeSidebarOnMobile
}: {
  isCollapsed: boolean
  closeSidebarOnMobile: () => void
}) {
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setOnboardingOpen = useAppStore((s) => s.setOnboardingOpen)

  const settingsShortcut = getShortcut('settings')?.display

  return (
    <div className={`flex items-center gap-0.5 ${isCollapsed ? 'flex-col p-1.5' : 'px-2 py-1.5'}`}>
      <Tooltip label="Welcome Guide" position="right">
        <button
          onClick={() => setOnboardingOpen(true)}
          aria-label="Welcome Guide"
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]
                     rounded-md transition-colors"
        >
          <CircleHelp size={16} strokeWidth={1.5} />
        </button>
      </Tooltip>
      <Tooltip label="Settings" shortcut={settingsShortcut} position="right">
        <button
          onClick={() => {
            setSettingsOpen(true)
            closeSidebarOnMobile()
          }}
          aria-label="Settings"
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]
                     rounded-md transition-colors"
        >
          <Settings size={16} strokeWidth={1.5} />
        </button>
      </Tooltip>
    </div>
  )
}
