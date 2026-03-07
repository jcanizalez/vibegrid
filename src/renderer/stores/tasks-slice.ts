import { StateCreator } from 'zustand'
import { AppStore, TasksSlice } from './types'

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set, get) => ({
  getTasksForProject: (projectName) => {
    const tasks = get().config?.tasks || []
    return tasks.filter((t) => t.projectName === projectName)
  },

  getTaskQueue: (projectName) => {
    const tasks = get().config?.tasks || []
    return tasks
      .filter((t) => t.projectName === projectName && t.status === 'todo')
      .sort((a, b) => a.order - b.order)
  },

  getNextTask: (projectName) => {
    return get().getTaskQueue(projectName)[0]
  },

  addTask: (task) =>
    set((state) => {
      if (!state.config) return {}
      const updated = {
        ...state.config,
        tasks: [...(state.config.tasks || []), task]
      }
      window.api.saveConfig(updated)
      return { config: updated }
    }),

  removeTask: (id) =>
    set((state) => {
      if (!state.config) return {}
      const updated = {
        ...state.config,
        tasks: (state.config.tasks || []).filter((t) => t.id !== id)
      }
      window.api.saveConfig(updated)
      return { config: updated }
    }),

  updateTask: (id, updates) =>
    set((state) => {
      if (!state.config) return {}
      const now = new Date().toISOString()
      const updated = {
        ...state.config,
        tasks: (state.config.tasks || []).map((t) =>
          t.id === id ? { ...t, ...updates, updatedAt: now } : t
        )
      }
      window.api.saveConfig(updated)
      return { config: updated }
    }),

  reorderTask: (id, newOrder) =>
    set((state) => {
      if (!state.config) return {}
      const tasks = [...(state.config.tasks || [])]
      const task = tasks.find((t) => t.id === id)
      if (!task) return {}

      const projectTodos = tasks
        .filter((t) => t.projectName === task.projectName && t.status === 'todo' && t.id !== id)
        .sort((a, b) => a.order - b.order)

      const clamped = Math.max(0, Math.min(newOrder, projectTodos.length))
      projectTodos.splice(clamped, 0, task)

      const reordered = new Map<string, number>()
      projectTodos.forEach((t, i) => reordered.set(t.id, i))

      const now = new Date().toISOString()
      const updated = {
        ...state.config,
        tasks: tasks.map((t) =>
          reordered.has(t.id) ? { ...t, order: reordered.get(t.id)!, updatedAt: now } : t
        )
      }
      window.api.saveConfig(updated)
      return { config: updated }
    }),

  startTask: (id, sessionId, agentType) =>
    set((state) => {
      if (!state.config) return {}
      const now = new Date().toISOString()
      const updated = {
        ...state.config,
        tasks: (state.config.tasks || []).map((t) =>
          t.id === id
            ? { ...t, status: 'in_progress' as const, assignedSessionId: sessionId, assignedAgent: agentType, updatedAt: now }
            : t
        )
      }
      window.api.saveConfig(updated)
      return { config: updated }
    }),

  completeTask: (id) =>
    set((state) => {
      if (!state.config) return {}
      const now = new Date().toISOString()
      const updated = {
        ...state.config,
        tasks: (state.config.tasks || []).map((t) =>
          t.id === id
            ? { ...t, status: 'done' as const, completedAt: now, updatedAt: now, assignedSessionId: undefined }
            : t
        )
      }
      window.api.saveConfig(updated)
      return { config: updated }
    })
})
