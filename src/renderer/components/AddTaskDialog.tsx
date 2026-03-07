import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../stores'
import { FolderGit2, Plus, X } from 'lucide-react'

export function AddTaskDialog() {
  const isOpen = useAppStore((s) => s.isTaskDialogOpen)
  const setOpen = useAppStore((s) => s.setTaskDialogOpen)
  const editingTask = useAppStore((s) => s.editingTask)
  const setEditingTask = useAppStore((s) => s.setEditingTask)
  const config = useAppStore((s) => s.config)
  const addTask = useAppStore((s) => s.addTask)
  const updateTask = useAppStore((s) => s.updateTask)
  const activeProject = useAppStore((s) => s.activeProject)

  const [title, setTitle] = useState('')
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [criteria, setCriteria] = useState<string[]>([])
  const [branch, setBranch] = useState('')
  const [useWorktree, setUseWorktree] = useState(false)

  const isEditMode = !!editingTask

  useEffect(() => {
    if (isOpen && editingTask) {
      setTitle(editingTask.title)
      setProjectName(editingTask.projectName)
      setDescription(editingTask.description)
      setCriteria(editingTask.acceptanceCriteria || [])
      setBranch(editingTask.branch || '')
      setUseWorktree(editingTask.useWorktree || false)
    } else if (isOpen) {
      setProjectName(activeProject || config?.projects[0]?.name || '')
    }
  }, [isOpen, editingTask, activeProject, config])

  const handleClose = () => {
    setOpen(false)
    setEditingTask(null)
    setTitle('')
    setProjectName('')
    setDescription('')
    setCriteria([])
    setBranch('')
    setUseWorktree(false)
  }

  const handleSubmit = () => {
    if (!title.trim() || !projectName || !description.trim()) return

    const now = new Date().toISOString()
    if (isEditMode) {
      updateTask(editingTask.id, {
        title: title.trim(),
        projectName,
        description: description.trim(),
        acceptanceCriteria: criteria.filter((c) => c.trim()),
        branch: branch.trim() || undefined,
        useWorktree: useWorktree || undefined
      })
    } else {
      const existingTasks = config?.tasks?.filter((t) => t.projectName === projectName && t.status === 'todo') || []
      addTask({
        id: crypto.randomUUID(),
        projectName,
        title: title.trim(),
        description: description.trim(),
        acceptanceCriteria: criteria.filter((c) => c.trim()),
        status: 'todo',
        order: existingTasks.length,
        branch: branch.trim() || undefined,
        useWorktree: useWorktree || undefined,
        createdAt: now,
        updatedAt: now
      })
    }
    handleClose()
  }

  const canSubmit = title.trim() && projectName && description.trim()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed top-1/2 left-1/2 z-50 w-[540px] max-h-[85vh] border border-white/[0.08]
                       rounded-xl shadow-2xl overflow-hidden flex flex-col"
            style={{ background: '#1e1e22' }}
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] shrink-0">
              <h2 className="text-lg font-medium text-white">
                {isEditMode ? 'Edit Task' : 'Add Task'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditMode ? 'Update task details' : 'Create a task for an agent to work on'}
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-auto">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Fix authentication bug"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm
                             text-gray-200 placeholder-gray-600 focus:border-white/[0.15] focus:outline-none"
                />
              </div>

              {/* Project */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Project
                </label>
                <select
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm
                             text-gray-200 focus:border-white/[0.15] focus:outline-none"
                >
                  <option value="">Select project</option>
                  {config?.projects.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Description
                </label>
                <p className="text-[11px] text-gray-600 mb-1.5">
                  This will be sent as the prompt to the coding agent
                </p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the task in detail. The agent will receive this as its initial prompt..."
                  rows={5}
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm
                             text-gray-200 placeholder-gray-600 focus:border-white/[0.15] focus:outline-none
                             resize-none"
                />
              </div>

              {/* Acceptance Criteria */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                  Acceptance Criteria
                  <span className="text-gray-600 normal-case tracking-normal ml-1">(optional)</span>
                </label>
                <div className="space-y-1.5">
                  {criteria.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs shrink-0">-</span>
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => {
                          const next = [...criteria]
                          next[i] = e.target.value
                          setCriteria(next)
                        }}
                        placeholder="e.g. All tests pass"
                        className="flex-1 px-3 py-1.5 bg-white/[0.03] border border-white/[0.06] rounded-md text-xs
                                   text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/[0.15]"
                      />
                      <button
                        onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}
                        className="text-gray-600 hover:text-red-400 p-1 transition-colors shrink-0"
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setCriteria([...criteria, ''])}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors px-1 py-1"
                  >
                    <Plus size={12} strokeWidth={2} />
                    Add criterion
                  </button>
                </div>
              </div>

              {/* Branch & Worktree */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">
                    Branch
                    <span className="text-gray-600 normal-case tracking-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="feature/my-task"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-sm
                               text-gray-200 placeholder-gray-600 focus:border-white/[0.15] focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setUseWorktree(!useWorktree)}
                  className={`p-2.5 rounded-lg border transition-all shrink-0 ${
                    useWorktree
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : 'border-white/[0.06] text-gray-600 hover:text-gray-400'
                  }`}
                  title={useWorktree ? 'Worktree enabled' : 'Enable worktree isolation'}
                >
                  <FolderGit2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3 shrink-0">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200
                           bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 text-sm font-medium text-white
                           bg-white/[0.1] hover:bg-white/[0.15]
                           disabled:opacity-30 disabled:cursor-not-allowed
                           rounded-lg transition-colors"
              >
                {isEditMode ? 'Save' : 'Create Task'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
