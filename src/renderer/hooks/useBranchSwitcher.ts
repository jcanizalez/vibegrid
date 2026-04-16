import { useCallback, useState } from 'react'
import { useAppStore } from '../stores'
import { toast } from '../components/Toast'

interface Params {
  projectPath?: string
  branchCwd?: string
  branchName?: string
}

export function useBranchSwitcher({ projectPath, branchCwd, branchName }: Params) {
  const loadWorktrees = useAppStore((s) => s.loadWorktrees)
  const [showPicker, setShowPicker] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  const togglePicker = useCallback(() => setShowPicker((v) => !v), [])
  const closePicker = useCallback(() => setShowPicker(false), [])

  const selectBranch = useCallback(
    async (branch: string) => {
      if (!branchCwd || !projectPath || branch === branchName || isSwitching) return
      setIsSwitching(true)
      try {
        const result = await window.api.checkoutBranch(branchCwd, branch)
        if (result.ok) {
          loadWorktrees(projectPath, true)
        } else {
          toast.error(result.error || `Failed to checkout '${branch}'`)
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Failed to checkout '${branch}'`)
      } finally {
        setIsSwitching(false)
        setShowPicker(false)
      }
    },
    [branchCwd, projectPath, branchName, isSwitching, loadWorktrees]
  )

  return { showPicker, togglePicker, closePicker, isSwitching, selectBranch }
}
