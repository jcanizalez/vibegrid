import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { isElectron } from '../lib/platform'
import { useAppStore } from '../stores'
import { useIsMobile } from '../hooks/useIsMobile'
import { WorkflowDefinition, ProjectConfig, AgentStatus, AgentType } from '../../shared/types'
import type { WorktreeInfo } from '../stores/types'
import { getDisplayName } from '../lib/terminal-display'
import { getActionCount, isScheduledWorkflow, getTriggerLabel } from '../lib/workflow-helpers'
import { executeWorkflow } from '../lib/workflow-execution'
import { Tooltip } from './Tooltip'
import { toast } from './Toast'
import { generateWorktreeName } from '../lib/worktree-names'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import {
  Folder,
  FolderGit2,
  Code,
  Globe,
  Database,
  Server,
  Smartphone,
  Package,
  FileCode,
  Terminal,
  Cpu,
  Cloud,
  Shield,
  Zap,
  Gamepad2,
  Music,
  Image,
  BookOpen,
  FlaskConical,
  Rocket,
  Play,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Clock,
  Calendar,
  Power,
  Plus,
  RotateCcw,
  FolderPlus,
  Check,
  X
} from 'lucide-react'

const EMPTY_WORKTREES: WorktreeInfo[] = []

const ICON_MAP: Record<
  string,
  React.FC<{ size?: number; color?: string; strokeWidth?: number }>
> = {
  Folder,
  FolderGit2,
  Code,
  Globe,
  Database,
  Server,
  Smartphone,
  Package,
  FileCode,
  Terminal,
  Cpu,
  Cloud,
  Shield,
  Zap,
  Gamepad2,
  Music,
  Image,
  BookOpen,
  FlaskConical,
  Rocket
}

const MIN_WIDTH = 180
const MAX_WIDTH = 400
const COLLAPSED_WIDTH = 52
const COLLAPSE_THRESHOLD = 120

function ProjectIcon({ icon, color, size = 14 }: { icon?: string; color?: string; size?: number }) {
  if (icon && ICON_MAP[icon]) {
    const Icon = ICON_MAP[icon]
    return <Icon size={size} color={color || '#6b7280'} strokeWidth={1.5} />
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth="1.5"
    >
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  )
}

function ProjectContextMenu({
  project,
  onEdit,
  onDelete,
  onClose
}: {
  project: ProjectConfig
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[140px] py-1
                 border border-white/[0.08] rounded-lg shadow-xl"
      style={{ background: '#141416' }}
    >
      <button
        onClick={() => {
          onEdit()
          onClose()
        }}
        className="w-full px-3 py-2.5 text-left text-[13px] text-gray-300 hover:text-white
                   hover:bg-white/[0.06] active:bg-white/[0.1] flex items-center gap-2 transition-colors"
      >
        <Pencil size={12} strokeWidth={1.5} />
        Edit Project
      </button>
      {confirmDelete ? (
        <button
          onClick={() => {
            onDelete()
            onClose()
            toast.success(`Project "${project.name}" deleted`)
          }}
          className="w-full px-3 py-2.5 text-left text-[13px] text-red-300 bg-red-500/10
                     hover:bg-red-500/20 active:bg-red-500/30 flex items-center gap-2 transition-colors"
        >
          <Trash2 size={12} strokeWidth={1.5} />
          Confirm delete?
        </button>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="w-full px-3 py-2.5 text-left text-[13px] text-red-400 hover:text-red-300
                     hover:bg-white/[0.06] active:bg-white/[0.1] flex items-center gap-2 transition-colors"
        >
          <Trash2 size={12} strokeWidth={1.5} />
          Delete Project
        </button>
      )}
    </div>
  )
}

function ShortcutContextMenu({
  onEdit,
  onDelete,
  onToggleEnabled,
  isScheduled,
  isEnabled,
  onClose
}: {
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled?: () => void
  isScheduled?: boolean
  isEnabled?: boolean
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1
                 border border-white/[0.08] rounded-lg shadow-xl"
      style={{ background: '#141416' }}
    >
      <button
        onClick={() => {
          onEdit()
          onClose()
        }}
        className="w-full px-3 py-2.5 text-left text-[13px] text-gray-300 hover:text-white
                   hover:bg-white/[0.06] active:bg-white/[0.1] flex items-center gap-2 transition-colors"
      >
        <Pencil size={12} strokeWidth={1.5} />
        Edit Workflow
      </button>
      {isScheduled && onToggleEnabled && (
        <button
          onClick={() => {
            onToggleEnabled()
            onClose()
          }}
          className="w-full px-3 py-2.5 text-left text-[13px] text-gray-300 hover:text-white
                     hover:bg-white/[0.06] active:bg-white/[0.1] flex items-center gap-2 transition-colors"
        >
          <Power size={12} strokeWidth={1.5} />
          {isEnabled ? 'Disable Schedule' : 'Enable Schedule'}
        </button>
      )}
      <button
        onClick={() => {
          onDelete()
          onClose()
        }}
        className="w-full px-3 py-2.5 text-left text-[13px] text-red-400 hover:text-red-300
                   hover:bg-white/[0.06] active:bg-white/[0.1] flex items-center gap-2 transition-colors"
      >
        <Trash2 size={12} strokeWidth={1.5} />
        Delete Workflow
      </button>
    </div>
  )
}

function WorkflowSubGroup({
  label,
  icon,
  count,
  defaultCollapsed,
  children
}: {
  label: string
  icon: React.ReactNode
  count: number
  defaultCollapsed: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div className="mt-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1.5 px-2 py-1 w-full text-left hover:bg-white/[0.04] rounded-md transition-colors"
      >
        <ChevronRight
          size={10}
          strokeWidth={2}
          className={`text-gray-600 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        />
        {icon}
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {count > 0 && (
          <span className="text-[10px] text-gray-600 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </button>
      {!collapsed && (
        <div className="ml-2 space-y-0.5">
          {count === 0 ? <p className="text-[11px] text-gray-600 py-0.5 pl-2">None</p> : children}
        </div>
      )}
    </div>
  )
}

export function ProjectSidebar() {
  const config = useAppStore((s) => s.config)
  const activeProject = useAppStore((s) => s.activeProject)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const activeWorktreePath = useAppStore((s) => s.activeWorktreePath)
  const setActiveWorktreePath = useAppStore((s) => s.setActiveWorktreePath)
  const isSidebarOpen = useAppStore((s) => s.isSidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const removeProject = useAppStore((s) => s.removeProject)
  const addTerminal = useAppStore((s) => s.addTerminal)
  const removeWorkflow = useAppStore((s) => s.removeWorkflow)
  const terminals = useAppStore((s) => s.terminals)
  const setAddProjectDialogOpen = useAppStore((s) => s.setAddProjectDialogOpen)
  const setWorkflowEditorOpen = useAppStore((s) => s.setWorkflowEditorOpen)
  const setEditingWorkflowId = useAppStore((s) => s.setEditingWorkflowId)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setEditingProject = useAppStore((s) => s.setEditingProject)

  const setFocusedTerminal = useAppStore((s) => s.setFocusedTerminal)
  const archivedSessions = useAppStore((s) => s.archivedSessions)
  const showArchivedSessions = useAppStore((s) => s.showArchivedSessions)
  const setShowArchivedSessions = useAppStore((s) => s.setShowArchivedSessions)
  const loadArchivedSessions = useAppStore((s) => s.loadArchivedSessions)
  const unarchiveSession = useAppStore((s) => s.unarchiveSession)
  const worktreeCache = useAppStore((s) => s.worktreeCache)
  const loadWorktrees = useAppStore((s) => s.loadWorktrees)
  const activeWorkspace = useAppStore((s) => s.activeWorkspace)
  const isMobile = useIsMobile()

  const [sidebarWidth, setSidebarWidth] = useState(256)
  const [openMenuProject, setOpenMenuProject] = useState<string | null>(null)
  const [renamingWorktree, setRenamingWorktree] = useState<string | null>(null)
  const [worktreeRenameValue, setWorktreeRenameValue] = useState('')
  const [openMenuShortcut, setOpenMenuShortcut] = useState<string | null>(null)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [projectsSectionCollapsed, setProjectsSectionCollapsed] = useState(false)
  const [workflowsSectionCollapsed, setWorkflowsSectionCollapsed] = useState(false)
  const isResizing = useRef(false)
  const [isResizingState, setIsResizingState] = useState(false)
  const widthBeforeCollapse = useRef(256)

  // Load archived sessions on mount
  useEffect(() => {
    loadArchivedSessions()
  }, [loadArchivedSessions])

  // Auto-expand projects that have terminals (derive-state-from-props)
  const [prevTerminalKeys, setPrevTerminalKeys] = useState('')
  const terminalKeys = useMemo(() => {
    const keys: string[] = []
    for (const [, t] of terminals) keys.push(t.session.projectName)
    return keys.sort().join(',')
  }, [terminals])
  if (terminalKeys !== prevTerminalKeys) {
    setPrevTerminalKeys(terminalKeys)
    const withTerminals = new Set<string>()
    for (const [, t] of terminals) {
      withTerminals.add(t.session.projectName)
    }
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      for (const name of withTerminals) next.add(name)
      return next
    })
  }

  const isCollapsed = sidebarWidth <= COLLAPSED_WIDTH
  const iconSize = isCollapsed ? 22 : 14

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      isResizing.current = true
      setIsResizingState(true)
      const startX = e.clientX
      const startWidth = sidebarWidth

      const handleMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX
        const newWidth = startWidth + delta

        if (newWidth < COLLAPSE_THRESHOLD) {
          setSidebarWidth(COLLAPSED_WIDTH)
        } else {
          setSidebarWidth(Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH))
        }
      }

      const handleUp = () => {
        isResizing.current = false
        setIsResizingState(false)
        document.removeEventListener('pointermove', handleMove)
        document.removeEventListener('pointerup', handleUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('pointermove', handleMove)
      document.addEventListener('pointerup', handleUp)
    },
    [sidebarWidth]
  )

  // Double-click on handle to toggle collapsed
  const handleResizeDoubleClick = useCallback(() => {
    if (isCollapsed) {
      setSidebarWidth(widthBeforeCollapse.current)
    } else {
      widthBeforeCollapse.current = sidebarWidth
      setSidebarWidth(COLLAPSED_WIDTH)
    }
  }, [isCollapsed, sidebarWidth])

  // Filter projects and workflows by active workspace
  const workspaceProjects = useMemo(
    () => (config?.projects ?? []).filter((p) => (p.workspaceId ?? 'personal') === activeWorkspace),
    [config?.projects, activeWorkspace]
  )

  const workspaceProjectNames = useMemo(
    () => new Set(workspaceProjects.map((p) => p.name)),
    [workspaceProjects]
  )

  const workspaceWorkflows = useMemo(
    () =>
      (config?.workflows ?? []).filter((w) => (w.workspaceId ?? 'personal') === activeWorkspace),
    [config?.workflows, activeWorkspace]
  )

  // On mobile, auto-close sidebar when navigating
  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile && isSidebarOpen) toggleSidebar()
  }, [isMobile, isSidebarOpen, toggleSidebar])

  if (!isSidebarOpen) {
    return null
  }

  const projectTerminals = new Map<
    string,
    {
      id: string
      name: string
      status: AgentStatus
      agentType: AgentType
      branch?: string
      isWorktree?: boolean
    }[]
  >()
  for (const [id, t] of terminals) {
    const pName = t.session.projectName
    if (!projectTerminals.has(pName)) projectTerminals.set(pName, [])
    projectTerminals.get(pName)!.push({
      id,
      name: getDisplayName(t.session),
      status: t.status,
      agentType: t.session.agentType,
      branch: t.session.branch,
      isWorktree: t.session.isWorktree
    })
  }

  // Pre-compute worktree session counts
  const worktreeSessionCounts = new Map<string, number>()
  for (const [, t] of terminals) {
    if (t.session.worktreePath) {
      worktreeSessionCounts.set(
        t.session.worktreePath,
        (worktreeSessionCounts.get(t.session.worktreePath) || 0) + 1
      )
    }
  }

  // Count terminals in active workspace only
  let workspaceTerminalCount = 0
  for (const [, t] of terminals) {
    if (workspaceProjectNames.has(t.session.projectName)) {
      workspaceTerminalCount++
    }
  }

  const toggleProjectExpanded = (name: string): void => {
    const isExpanding = !expandedProjects.has(name)
    if (isExpanding) {
      const project = (config?.projects ?? []).find((p) => p.name === name)
      if (project) loadWorktrees(project.path)
    }
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleEditProject = (project: ProjectConfig) => {
    setEditingProject(project)
    setAddProjectDialogOpen(true)
  }

  const sidebarContent = (
    <aside
      role="navigation"
      aria-label="Project sidebar"
      className={`border-r border-white/[0.06] flex flex-col h-full shrink-0 relative ${
        isMobile ? 'w-[85vw] max-w-[320px]' : ''
      }`}
      style={{
        ...(!isMobile ? { width: `${sidebarWidth}px` } : {}),
        background: '#141416',
        transition: isResizingState ? 'none' : 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Traffic light safe zone + Workspace switcher */}
      <div
        className={`titlebar-drag h-[52px] pr-3 flex items-center
                      border-b border-white/[0.06] shrink-0 ${isElectron ? 'pl-[78px]' : 'pl-3'}`}
      >
        {!isCollapsed && (
          <div className="flex-1 titlebar-no-drag min-w-0">
            <WorkspaceSwitcher />
          </div>
        )}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white titlebar-no-drag p-1 rounded-md transition-colors shrink-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        )}
      </div>

      {/* Section label */}
      {!isCollapsed && (
        <div className="group/section px-3 pt-3 pb-1.5 flex items-center justify-between">
          <button
            onClick={() => setProjectsSectionCollapsed(!projectsSectionCollapsed)}
            className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
          >
            <ChevronRight
              size={10}
              strokeWidth={2}
              className={`text-gray-600 transition-transform ${projectsSectionCollapsed ? '' : 'rotate-90'}`}
            />
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
              Projects
            </span>
          </button>
          <Tooltip label="Add project" position="bottom">
            <button
              onClick={() => setAddProjectDialogOpen(true)}
              className="p-0.5 rounded text-gray-600 hover:text-white hover:bg-white/[0.08] transition-colors"
            >
              <FolderPlus size={13} strokeWidth={1.5} />
            </button>
          </Tooltip>
        </div>
      )}
      {isCollapsed && <div className="pt-4" />}

      {/* Project list */}
      <div className={`flex-1 overflow-auto space-y-0.5 ${isCollapsed ? 'px-1.5' : 'px-3'}`}>
        {/* All Projects (inside section) */}
        {!projectsSectionCollapsed && (
          <button
            onClick={() => setActiveProject(null)}
            className={`w-full text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors flex items-center gap-2 ${
              activeProject === null
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? 'All Projects' : undefined}
          >
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="shrink-0"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            {!isCollapsed && (
              <>
                All Projects
                <span className="text-gray-500 text-xs ml-auto">{workspaceTerminalCount}</span>
              </>
            )}
          </button>
        )}
        {!isCollapsed && !projectsSectionCollapsed && workspaceProjects.length === 0 && (
          <p className="text-[13px] text-gray-600 px-2.5 py-1">No projects</p>
        )}
        {!projectsSectionCollapsed &&
          workspaceProjects.map((project) => {
            const sessions = projectTerminals.get(project.name) || []
            const isExpanded = expandedProjects.has(project.name)
            return (
              <div key={project.name}>
                <div className="group relative flex items-center">
                  <button
                    onClick={() => setActiveProject(project.name)}
                    className={`flex-1 text-left px-2 py-1.5 rounded-md text-[13px] transition-colors flex items-center gap-2 ${
                      activeProject === project.name
                        ? 'bg-white/[0.08] text-white'
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'
                    } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    title={isCollapsed ? project.name : undefined}
                  >
                    {isCollapsed ? (
                      <ProjectIcon icon={project.icon} color={project.iconColor} size={iconSize} />
                    ) : (
                      <div
                        className="relative w-[14px] h-[14px] shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleProjectExpanded(project.name)
                        }}
                      >
                        <span className="group-hover:hidden flex items-center justify-center w-full h-full">
                          <ProjectIcon icon={project.icon} color={project.iconColor} size={14} />
                        </span>
                        <ChevronRight
                          size={12}
                          strokeWidth={2.5}
                          className={`hidden group-hover:block text-gray-500 transition-transform absolute top-[1px] left-[1px] ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </div>
                    )}
                    {!isCollapsed && (
                      <>
                        <span className="truncate">{project.name}</span>
                        {sessions.length > 0 && (
                          <span className="text-gray-600 text-xs ml-auto group-hover:hidden">
                            {sessions.length}
                          </span>
                        )}
                        {/* Hover actions — inline, replacing count */}
                        <div className="hidden group-hover:flex items-center gap-0.5 ml-auto">
                          <Tooltip label="New worktree" position="right">
                            <span
                              role="button"
                              onClick={async (e) => {
                                e.stopPropagation()
                                const name = generateWorktreeName()
                                try {
                                  await window.api.createWorktree(project.path, name)
                                  if (!expandedProjects.has(project.name)) {
                                    toggleProjectExpanded(project.name)
                                  } else {
                                    loadWorktrees(project.path)
                                  }
                                } catch {
                                  toast.error('Failed to create worktree')
                                }
                              }}
                              className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/[0.08] transition-colors"
                            >
                              <Plus size={14} strokeWidth={2} />
                            </span>
                          </Tooltip>
                          <Tooltip label="More" position="right">
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuProject(
                                  openMenuProject === project.name ? null : project.name
                                )
                              }}
                              className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/[0.08] transition-colors"
                            >
                              <MoreHorizontal size={14} strokeWidth={2} />
                            </span>
                          </Tooltip>
                        </div>
                      </>
                    )}
                  </button>
                  {!isCollapsed && openMenuProject === project.name && (
                    <div className="relative">
                      <ProjectContextMenu
                        project={project}
                        onEdit={() => handleEditProject(project)}
                        onDelete={() => removeProject(project.name)}
                        onClose={() => setOpenMenuProject(null)}
                      />
                    </div>
                  )}
                </div>

                {/* Expanded sub-groups under project */}
                {!isCollapsed && isExpanded && (
                  <div className="ml-4 mt-0.5 mb-1 space-y-0.5">
                    {/* Worktrees — flat list */}
                    {(() => {
                      const worktrees = worktreeCache.get(project.path) ?? EMPTY_WORKTREES
                      return worktrees.map((wt) => {
                        const wtSessionCount = worktreeSessionCounts.get(wt.path) || 0
                        return (
                          <div key={wt.path} className="group/wt flex items-center">
                            {renamingWorktree === wt.path ? (
                              <form
                                className="flex-1 flex items-center gap-2 px-2 py-1.5 min-w-0"
                                onSubmit={async (e) => {
                                  e.preventDefault()
                                  const trimmed = worktreeRenameValue.trim()
                                  if (trimmed && trimmed !== wt.branch) {
                                    const ok = await window.api.renameWorktreeBranch(
                                      wt.path,
                                      trimmed
                                    )
                                    if (ok) {
                                      toast.success('Worktree renamed')
                                      loadWorktrees(project.path)
                                    } else {
                                      toast.error('Failed to rename worktree')
                                    }
                                  }
                                  setRenamingWorktree(null)
                                }}
                              >
                                <FolderGit2
                                  size={14}
                                  className="text-gray-500 shrink-0"
                                  strokeWidth={1.5}
                                />
                                <input
                                  autoFocus
                                  value={worktreeRenameValue}
                                  onChange={(e) => setWorktreeRenameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') setRenamingWorktree(null)
                                  }}
                                  className="flex-1 min-w-0 bg-white/[0.06] border border-white/[0.1] rounded px-1.5 py-0.5 text-[12px] text-white outline-none focus:border-blue-500"
                                />
                                <button
                                  type="submit"
                                  className="text-gray-400 hover:text-green-400 p-0.5 rounded hover:bg-white/[0.08] transition-colors shrink-0"
                                >
                                  <Check size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingWorktree(null)}
                                  className="text-gray-400 hover:text-red-400 p-0.5 rounded hover:bg-white/[0.08] transition-colors shrink-0"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </form>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveProject(project.name)
                                  setActiveWorktreePath(
                                    activeWorktreePath === wt.path ? null : wt.path
                                  )
                                }}
                                className={`flex-1 text-left px-2 py-1.5 rounded-md text-[13px] flex items-center gap-2 min-w-0 transition-colors ${
                                  activeWorktreePath === wt.path
                                    ? 'bg-white/[0.08] text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                                }`}
                              >
                                <FolderGit2
                                  size={14}
                                  className="text-gray-500 shrink-0"
                                  strokeWidth={1.5}
                                />
                                <span className="truncate">{wt.branch}</span>
                                {wtSessionCount > 0 && (
                                  <span className="text-gray-600 text-xs ml-auto group-hover/wt:hidden">
                                    {wtSessionCount}
                                  </span>
                                )}
                                <div className="hidden group-hover/wt:flex items-center gap-0.5 ml-auto">
                                  <Tooltip label="New session" position="right">
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        const agentType = config?.defaults.defaultAgent || 'claude'
                                        const session = await window.api.createTerminal({
                                          agentType,
                                          projectName: project.name,
                                          projectPath: project.path,
                                          branch: wt.branch,
                                          existingWorktreePath: wt.path
                                        })
                                        addTerminal(session)
                                      }}
                                      className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/[0.08] transition-colors"
                                    >
                                      <Plus size={14} strokeWidth={2} />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="Rename worktree" position="right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRenamingWorktree(wt.path)
                                        setWorktreeRenameValue(wt.branch)
                                      }}
                                      className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-white/[0.08] transition-colors"
                                    >
                                      <Pencil size={14} strokeWidth={2} />
                                    </button>
                                  </Tooltip>
                                  <Tooltip label="Remove worktree" position="right">
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation()
                                        if (wt.isDirty) {
                                          const ok = confirm(
                                            'This worktree has uncommitted changes that will be permanently lost. Remove anyway?'
                                          )
                                          if (!ok) return
                                        }
                                        const removed = await window.api.removeWorktree(
                                          project.path,
                                          wt.path,
                                          wt.isDirty
                                        )
                                        if (removed) {
                                          toast.success('Worktree removed')
                                          loadWorktrees(project.path)
                                        } else {
                                          toast.error('Failed to remove worktree')
                                        }
                                      }}
                                      className="text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-white/[0.08] transition-colors"
                                    >
                                      <Trash2 size={14} strokeWidth={2} />
                                    </button>
                                  </Tooltip>
                                </div>
                              </button>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                )}
              </div>
            )
          })}

        {/* Workflows section */}
        {!isCollapsed && (
          <div className="group/section pt-5 pb-1.5 flex items-center justify-between">
            <button
              onClick={() => setWorkflowsSectionCollapsed(!workflowsSectionCollapsed)}
              className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
            >
              <ChevronRight
                size={10}
                strokeWidth={2}
                className={`text-gray-600 transition-transform ${workflowsSectionCollapsed ? '' : 'rotate-90'}`}
              />
              <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                Workflows
              </span>
            </button>
            <Tooltip label="Add workflow" position="bottom">
              <button
                onClick={() => setWorkflowEditorOpen(true)}
                className="p-0.5 rounded text-gray-600 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <Zap size={13} strokeWidth={1.5} />
              </button>
            </Tooltip>
          </div>
        )}
        {isCollapsed && <div className="pt-4" />}

        {!isCollapsed && !workflowsSectionCollapsed && workspaceWorkflows.length === 0 && (
          <p className="text-[13px] text-gray-600 px-2.5 py-1">No workflows</p>
        )}
        {(() => {
          const allWorkflows = workspaceWorkflows
          const manualWorkflows = allWorkflows.filter((w) => !isScheduledWorkflow(w))
          const scheduledWorkflows = allWorkflows.filter((w) => isScheduledWorkflow(w))

          const renderWorkflow = (wf: WorkflowDefinition) => {
            const WfIcon = ICON_MAP[wf.icon] || Zap
            const isScheduled = isScheduledWorkflow(wf)
            const isDisabled = isScheduled && !wf.enabled
            const scheduleLabel = getTriggerLabel(wf)
            const actionCount = getActionCount(wf)
            return (
              <div
                key={wf.id}
                className={`group relative flex items-center ${isDisabled ? 'opacity-40' : ''}`}
              >
                <button
                  onClick={() => {
                    setEditingWorkflowId(wf.id)
                    setWorkflowEditorOpen(true)
                  }}
                  className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-[13px] transition-colors
                             flex items-center gap-2 text-gray-300 hover:text-white hover:bg-white/[0.04]
                             ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? wf.name : undefined}
                >
                  <span className="relative shrink-0">
                    <WfIcon size={iconSize} color={wf.iconColor || '#6b7280'} strokeWidth={1.5} />
                    {isScheduled && !isCollapsed && (
                      <Clock
                        size={7}
                        className="absolute -top-1 -right-1.5 text-blue-400"
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                  {!isCollapsed && (
                    <>
                      <span className="truncate">{wf.name}</span>
                      <span className="text-gray-600 text-[10px] ml-auto shrink-0">
                        {scheduleLabel || actionCount}
                      </span>
                    </>
                  )}
                </button>
                {!isCollapsed && (
                  <div className="flex items-center">
                    {!isScheduled && (
                      <button
                        onClick={() => executeWorkflow(wf)}
                        className="opacity-0 group-hover:opacity-100 text-green-500 hover:text-green-400
                                   p-1 transition-all shrink-0"
                        title="Run workflow"
                      >
                        <Play size={11} strokeWidth={2.5} />
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenuShortcut(openMenuShortcut === wf.id ? null : wf.id)
                        }
                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-white
                                 p-1 transition-all shrink-0"
                      >
                        <MoreHorizontal size={12} strokeWidth={2} />
                      </button>
                      {openMenuShortcut === wf.id && (
                        <ShortcutContextMenu
                          onEdit={() => {
                            setEditingWorkflowId(wf.id)
                            setWorkflowEditorOpen(true)
                          }}
                          onDelete={() => removeWorkflow(wf.id)}
                          isScheduled={isScheduled}
                          isEnabled={wf.enabled}
                          onToggleEnabled={() => {
                            const updated = { ...wf, enabled: !wf.enabled }
                            useAppStore.getState().updateWorkflow(wf.id, updated)
                          }}
                          onClose={() => setOpenMenuShortcut(null)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <>
              {/* Manual workflows sub-group */}
              {!isCollapsed && !workflowsSectionCollapsed && allWorkflows.length > 0 && (
                <WorkflowSubGroup
                  label="Manual"
                  icon={<Zap size={11} strokeWidth={2} className="text-gray-600" />}
                  count={manualWorkflows.length}
                  defaultCollapsed={false}
                >
                  {manualWorkflows.map(renderWorkflow)}
                </WorkflowSubGroup>
              )}

              {/* Scheduled workflows sub-group */}
              {!isCollapsed && !workflowsSectionCollapsed && allWorkflows.length > 0 && (
                <WorkflowSubGroup
                  label="Scheduled"
                  icon={<Calendar size={11} strokeWidth={2} className="text-gray-600" />}
                  count={scheduledWorkflows.length}
                  defaultCollapsed={true}
                >
                  {scheduledWorkflows.map(renderWorkflow)}
                </WorkflowSubGroup>
              )}

              {/* Collapsed mode — render all */}
              {isCollapsed && allWorkflows.map(renderWorkflow)}
            </>
          )
        })()}

        {/* Archived sessions section */}
        {(() => {
          const wsArchived = archivedSessions.filter((s) =>
            workspaceProjectNames.has(s.projectName)
          )
          return (
            !isCollapsed &&
            wsArchived.length > 0 && (
              <>
                <div className="pt-5 pb-1.5 flex items-center justify-between">
                  <button
                    onClick={() => setShowArchivedSessions(!showArchivedSessions)}
                    className="flex items-center gap-1.5 hover:text-gray-300 transition-colors"
                  >
                    <ChevronRight
                      size={10}
                      strokeWidth={2}
                      className={`text-gray-600 transition-transform ${showArchivedSessions ? 'rotate-90' : ''}`}
                    />
                    <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Archived
                    </span>
                    <span className="text-[10px] text-gray-600 bg-white/[0.06] px-1.5 py-0.5 rounded-full">
                      {wsArchived.length}
                    </span>
                  </button>
                </div>
                {showArchivedSessions && (
                  <div className="space-y-0.5">
                    {wsArchived.map((session) => (
                      <div key={session.id} className="group/archived flex items-center">
                        <div
                          className="flex-1 px-2.5 py-1.5 rounded-md text-[12px] text-gray-500
                                    flex items-center gap-2 min-w-0 opacity-60"
                        >
                          <AgentIcon agentType={session.agentType} size={14} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate">
                              {session.displayName || session.projectName}
                            </div>
                            {session.branch && (
                              <div className="text-[10px] text-gray-600 truncate">
                                {session.branch}
                              </div>
                            )}
                          </div>
                        </div>
                        <Tooltip label="Unarchive" position="right">
                          <button
                            onClick={() => unarchiveSession(session.id)}
                            className="opacity-0 group-hover/archived:opacity-100 text-gray-600 hover:text-gray-300
                                   p-1 rounded-md hover:bg-white/[0.06] transition-all shrink-0"
                          >
                            <RotateCcw size={11} strokeWidth={2} />
                          </button>
                        </Tooltip>
                        {session.agentSessionId &&
                          supportsExactSessionResume(session.agentType) && (
                            <Tooltip label="Resume session" position="right">
                              <button
                                onClick={async () => {
                                  const agentType = session.agentType
                                  const newSession = await window.api.createTerminal({
                                    agentType,
                                    projectName: session.projectName,
                                    projectPath: session.projectPath,
                                    resumeSessionId: session.agentSessionId
                                  })
                                  addTerminal(newSession)
                                  await unarchiveSession(session.id)
                                  setFocusedTerminal(newSession.id)
                                }}
                                className="opacity-0 group-hover/archived:opacity-100 text-gray-600 hover:text-green-400
                                   p-1 rounded-md hover:bg-white/[0.06] transition-all shrink-0"
                              >
                                <Play size={11} strokeWidth={2} />
                              </button>
                            </Tooltip>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          )
        })()}
      </div>

      {/* Bottom — Help & Settings */}
      <div className={`p-3 border-t border-white/[0.06] space-y-0.5 ${isCollapsed ? 'p-1.5' : ''}`}>
        <button
          onClick={() => useAppStore.getState().setOnboardingOpen(true)}
          className={`w-full px-2.5 py-1.5 text-[13px] text-gray-400 hover:text-white
                     hover:bg-white/[0.04] rounded-md transition-colors text-left flex items-center gap-2
                     ${isCollapsed ? 'justify-center px-0' : ''}`}
          title={isCollapsed ? 'Welcome Guide' : undefined}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {!isCollapsed && 'Welcome Guide'}
        </button>
        <button
          onClick={() => {
            setSettingsOpen(true)
            closeSidebarOnMobile()
          }}
          className={`w-full px-2.5 py-1.5 text-[13px] text-gray-300 hover:text-white
                     hover:bg-white/[0.04] rounded-md transition-colors text-left flex items-center gap-2
                     ${isCollapsed ? 'justify-center px-0' : ''}`}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          {!isCollapsed && (
            <>
              Settings
              <KbdHint shortcutId="settings" className="ml-auto" />
            </>
          )}
        </button>
      </div>

      {/* Resize handle — hidden on mobile */}
      {!isMobile && (
        <div
          onPointerDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize
                     hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors z-10"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
        />
      )}
    </aside>
  )

  // On mobile, render as a fixed overlay drawer with backdrop
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex"
        style={{
          paddingTop: 'var(--safe-top, 0px)',
          paddingBottom: 'var(--safe-bottom, 0px)',
          paddingLeft: 'var(--safe-left, 0px)'
        }}
        onClick={(e) => {
          // Close when clicking the backdrop (not the sidebar itself)
          if (e.target === e.currentTarget) toggleSidebar()
        }}
      >
        {sidebarContent}
        {/* Backdrop */}
        <div className="flex-1 bg-black/60" />
      </div>
    )
  }

  return sidebarContent
}
