import { StateCreator } from 'zustand'
import { AppConfig } from '../../shared/types'
import { AppStore, ProjectsSlice } from './types'

/** Apply a patch to config, persist it, and return the new state. */
function saveConfig(config: AppConfig | null, patch: Partial<AppConfig>): Partial<AppStore> {
  if (!config) return {}
  const updated = { ...config, ...patch }
  window.api.saveConfig(updated)
  return { config: updated }
}

export const createProjectsSlice: StateCreator<AppStore, [], [], ProjectsSlice> = (set) => ({
  config: null,
  activeProject: null,

  setConfig: (config) =>
    set({
      config,
      rowHeight: config.defaults.rowHeight || 208,
      activeWorkspace: config.defaults.activeWorkspace ?? 'personal'
    }),

  setActiveProject: (name) => set({ activeProject: name }),

  addProject: (project) =>
    set((s) => saveConfig(s.config, { projects: [...s.config!.projects, project] })),

  removeProject: (name) =>
    set((s) =>
      saveConfig(s.config, { projects: s.config!.projects.filter((p) => p.name !== name) })
    ),

  updateProject: (originalName, project) =>
    set((s) =>
      saveConfig(s.config, {
        projects: s.config!.projects.map((p) => (p.name === originalName ? project : p))
      })
    ),

  addWorkflow: (workflow) =>
    set((s) => saveConfig(s.config, { workflows: [...(s.config!.workflows || []), workflow] })),

  removeWorkflow: (id) =>
    set((s) =>
      saveConfig(s.config, { workflows: (s.config!.workflows || []).filter((w) => w.id !== id) })
    ),

  updateWorkflow: (id, workflow) =>
    set((s) =>
      saveConfig(s.config, {
        workflows: (s.config!.workflows || []).map((w) => (w.id === id ? workflow : w))
      })
    ),

  addRemoteHost: (host) =>
    set((s) => saveConfig(s.config, { remoteHosts: [...(s.config!.remoteHosts || []), host] })),

  removeRemoteHost: (id) =>
    set((s) =>
      saveConfig(s.config, {
        remoteHosts: (s.config!.remoteHosts || []).filter((h) => h.id !== id)
      })
    ),

  updateRemoteHost: (id, host) =>
    set((s) =>
      saveConfig(s.config, {
        remoteHosts: (s.config!.remoteHosts || []).map((h) => (h.id === id ? host : h))
      })
    ),

  addWorkspace: (workspace) =>
    set((s) => saveConfig(s.config, { workspaces: [...(s.config!.workspaces || []), workspace] })),

  removeWorkspace: (id) =>
    set((state) => {
      if (!state.config || id === 'personal') return {}
      const switchToPersonal = state.activeWorkspace === id
      // Move projects and workflows from deleted workspace to 'personal'
      const updated = {
        ...state.config,
        workspaces: (state.config.workspaces || []).filter((ws) => ws.id !== id),
        projects: state.config.projects.map((p) =>
          (p.workspaceId ?? 'personal') === id ? { ...p, workspaceId: 'personal' } : p
        ),
        workflows: (state.config.workflows || []).map((w) =>
          (w.workspaceId ?? 'personal') === id ? { ...w, workspaceId: 'personal' } : w
        ),
        defaults: {
          ...state.config.defaults,
          ...(switchToPersonal && { activeWorkspace: 'personal' })
        }
      }
      window.api.saveConfig(updated)
      return { config: updated, ...(switchToPersonal && { activeWorkspace: 'personal' }) }
    }),

  updateWorkspace: (id, updates) =>
    set((s) =>
      saveConfig(s.config, {
        workspaces: (s.config!.workspaces || []).map((ws) =>
          ws.id === id ? { ...ws, ...updates } : ws
        )
      })
    )
})
