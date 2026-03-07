import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../stores'
import { TaskConfig } from '../../shared/types'
import { AgentIcon } from './AgentIcon'
import { Pencil, Trash2, Play, CheckCircle2, Clock, Circle, X } from 'lucide-react'

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  todo: { label: 'Todo', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  in_progress: { label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  done: { label: 'Done', color: 'text-green-400', bg: 'bg-green-500/20' }
}

const STATUS_ICON: Record<string, React.FC<{ size?: number; className?: string }>> = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2
}

function TaskCard({ task, onEdit, onDelete, onStart }: {
  task: TaskConfig
  onEdit: () => void
  onDelete: () => void
  onStart: () => void
}) {
  const badge = STATUS_BADGE[task.status]
  const StatusIcon = STATUS_ICON[task.status]

  return (
    <div className="group bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 hover:border-white/[0.1] transition-colors">
      <div className="flex items-start gap-2">
        <StatusIcon size={14} className={`${badge.color} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-200 font-medium truncate">{task.title}</span>
            {task.assignedAgent && (
              <AgentIcon agentType={task.assignedAgent} size={14} />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={10} className="text-gray-600" />
              <span className="text-[10px] text-gray-600">
                {task.acceptanceCriteria.length} criteria
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {task.status === 'todo' && (
            <button
              onClick={onStart}
              className="p-1 text-gray-600 hover:text-green-400 rounded transition-colors"
              title="Start task now"
            >
              <Play size={12} strokeWidth={2} />
            </button>
          )}
          <button
            onClick={onEdit}
            className="p-1 text-gray-600 hover:text-white rounded transition-colors"
            title="Edit task"
          >
            <Pencil size={12} strokeWidth={2} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
            title="Delete task"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function TaskQueuePanel() {
  const isOpen = useAppStore((s) => s.isTaskPanelOpen)
  const setOpen = useAppStore((s) => s.setTaskPanelOpen)
  const activeProject = useAppStore((s) => s.activeProject)
  const config = useAppStore((s) => s.config)
  const removeTask = useAppStore((s) => s.removeTask)
  const setEditingTask = useAppStore((s) => s.setEditingTask)
  const setTaskDialogOpen = useAppStore((s) => s.setTaskDialogOpen)
  const addTerminal = useAppStore((s) => s.addTerminal)
  const startTask = useAppStore((s) => s.startTask)

  if (!isOpen || !activeProject) return null

  const allTasks = config?.tasks?.filter((t) => t.projectName === activeProject) || []
  const todoTasks = allTasks.filter((t) => t.status === 'todo').sort((a, b) => a.order - b.order)
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress')
  const doneTasks = allTasks.filter((t) => t.status === 'done')

  const project = config?.projects.find((p) => p.name === activeProject)

  const handleStartTask = async (task: TaskConfig) => {
    if (!project) return
    const agentType = config?.defaults.defaultAgent || 'claude'
    const session = await window.api.createTerminal({
      agentType,
      projectName: project.name,
      projectPath: project.path,
      branch: task.branch,
      useWorktree: task.useWorktree,
      initialPrompt: task.description
    })
    addTerminal(session)
    startTask(task.id, session.id, agentType)
  }

  const handleEdit = (task: TaskConfig) => {
    setEditingTask(task)
    setTaskDialogOpen(true)
  }

  const sections = [
    { title: 'Todo', tasks: todoTasks, emptyText: 'No tasks in queue' },
    { title: 'In Progress', tasks: inProgressTasks, emptyText: 'No active tasks' },
    { title: 'Done', tasks: doneTasks, emptyText: 'No completed tasks' }
  ]

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setOpen(false)}
      />
      <motion.div
        className="fixed top-0 right-0 z-40 w-[420px] h-full border-l border-white/[0.08]
                   shadow-2xl flex flex-col overflow-hidden"
        style={{ background: '#1a1a1e' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-medium text-white">Task Queue</h2>
            <p className="text-xs text-gray-500 mt-0.5">{activeProject}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingTask(null)
                setTaskDialogOpen(true)
              }}
              className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white
                         bg-white/[0.06] hover:bg-white/[0.1] rounded-md transition-colors"
            >
              + Add Task
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 text-gray-500 hover:text-white rounded-md transition-colors"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  {section.title}
                </span>
                <span className="text-[10px] text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                  {section.tasks.length}
                </span>
              </div>
              {section.tasks.length === 0 ? (
                <p className="text-xs text-gray-600 py-2 pl-1">{section.emptyText}</p>
              ) : (
                <div className="space-y-1.5">
                  {section.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={() => handleEdit(task)}
                      onDelete={() => removeTask(task.id)}
                      onStart={() => handleStartTask(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
