import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { AppStore } from './types'
import { createTerminalsSlice } from './terminals-slice'
import { createProjectsSlice } from './projects-slice'
import { createUISlice } from './ui-slice'
import { createTasksSlice } from './tasks-slice'
import { createHarnessSlice, HarnessSlice } from './harness-slice'

export const useAppStore = create<AppStore & HarnessSlice>()(
  devtools(
    (...a) => ({
      ...createTerminalsSlice(...a),
      ...createProjectsSlice(...a),
      ...createUISlice(...a),
      ...createTasksSlice(...a),
      ...createHarnessSlice(...a)
    }),
    { name: 'Vorn' }
  )
)
