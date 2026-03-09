const isMac = navigator.platform.toUpperCase().includes('MAC')
const MOD = isMac ? '\u2318' : 'Ctrl+'

export interface OnboardingTopic {
  id: string
  title: string
  section: string
  description: string
  icon: string // Lucide icon name
  shortcutHint?: string
}

export const ONBOARDING_SECTIONS = [
  { key: 'getting-started', label: 'Getting Started' },
  { key: 'core-features', label: 'Core Features' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'integrations', label: 'Integrations' }
] as const

export const ONBOARDING_TOPICS: OnboardingTopic[] = [
  {
    id: 'welcome',
    title: 'Welcome to VibeGrid',
    section: 'getting-started',
    description:
      'VibeGrid is your AI agent terminal manager. Launch multiple AI coding agents side-by-side, monitor their progress in a grid view, and manage all your projects from one place. Use this guide to learn the key features and get productive fast.',
    icon: 'LayoutGrid'
  },
  {
    id: 'command-bar',
    title: 'Command Bar',
    section: 'getting-started',
    description:
      'Quickly access any action with the command palette. Search for commands, switch between sessions, launch new agents, or jump to projects \u2014 all from a single search bar. It\u2019s the fastest way to navigate VibeGrid.',
    icon: 'Search',
    shortcutHint: `${MOD}K`
  },
  {
    id: 'context-bar',
    title: 'Context Bar',
    section: 'core-features',
    description:
      `The top toolbar shows your active agent count, filter controls, and grid settings. Use it to filter agents by status (running, waiting, idle, error), change the sort order, or adjust the grid layout. Status filters also have keyboard shortcuts: ${MOD}1 through ${MOD}5.`,
    icon: 'SlidersHorizontal'
  },
  {
    id: 'workspace-sidebar',
    title: 'Workspace Sidebar',
    section: 'core-features',
    description:
      'The left sidebar organizes your projects and workflows. Click a project to filter the grid to that project\u2019s sessions. Expand projects to see individual agents. Add custom workflows to launch multi-agent setups with one click.',
    icon: 'PanelLeft',
    shortcutHint: `${MOD}B`
  },
  {
    id: 'multi-repo',
    title: 'Multi-Repo Support',
    section: 'core-features',
    description:
      'Add multiple projects from your filesystem. Each project tracks its own sessions, branches, and worktrees independently. You can also configure remote hosts in Settings to run agents on other machines via SSH.',
    icon: 'FolderTree'
  },
  {
    id: 'multiple-sessions',
    title: 'Multiple Sessions',
    section: 'core-features',
    description:
      `Run as many AI agent sessions as you need. Each session gets its own terminal card in the grid. Double-click a card to expand it full-screen, or use ${MOD}] and ${MOD}[ to cycle between them. Cards can be reordered by dragging in manual sort mode.`,
    icon: 'Columns3'
  },
  {
    id: 'tasks-kanban',
    title: 'Task Queue & Kanban',
    section: 'core-features',
    description:
      'Manage tasks per project with a full lifecycle: todo, in progress, in review, done, and cancelled. Write rich markdown descriptions, attach images, and switch between list and kanban board views. Launch agents directly from tasks with automatic branch and worktree support.',
    icon: 'KanbanSquare'
  },
  {
    id: 'preview-changes',
    title: 'Preview Changes',
    section: 'advanced',
    description:
      'See a live summary of git changes each agent has made. The diff indicator on each card shows files changed, insertions, and deletions at a glance. VibeGrid polls for git changes automatically so you always see the latest state.',
    icon: 'GitCompareArrows'
  },
  {
    id: 'diffs-comments',
    title: 'Diffs and Comments',
    section: 'advanced',
    description:
      'Click the diff indicator on any card to open a full diff sidebar with file-by-file changes. Review what your AI agents have done, then commit and push directly from the commit dialog without leaving VibeGrid.',
    icon: 'FileDiff'
  },
  {
    id: 'workflows',
    title: 'Workflows & Automation',
    section: 'advanced',
    description:
      'Create multi-step workflows to launch several agents at once. Schedule them to run on a cron expression, at a specific time, or trigger manually. Stagger agent launches with configurable delays between each action.',
    icon: 'Zap'
  },
  {
    id: 'layouts',
    title: 'Tab & Grid Layouts',
    section: 'advanced',
    description:
      'Switch between grid view for side-by-side comparison and tab view to maximize terminal real estate. Toggle from the toolbar button or through settings. Each layout preserves your session order and focus state.',
    icon: 'LayoutDashboard'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    section: 'advanced',
    description:
      'VibeGrid is built for keyboard-first workflows. Nearly every action has a shortcut. Open the shortcuts panel anytime to see all available keybindings, from navigation to filters to session management.',
    icon: 'Keyboard',
    shortcutHint: `${MOD}/`
  },
  {
    id: 'mcp-server',
    title: 'MCP Server',
    section: 'integrations',
    description:
      'VibeGrid exposes an MCP server so AI agents like Claude Code and Cursor can create tasks, launch sessions, and manage projects programmatically. It auto-starts on port 56433 when the app runs. Add it to your tools with the .mcp.json in your project, or copy the URL from the command palette.',
    icon: 'Plug'
  },
  {
    id: 'notifications',
    title: 'Notifications & Sounds',
    section: 'integrations',
    description:
      'Get notified when agents need attention — waiting for input, encountering errors, or triggering a terminal bell. Enable sound effects with adjustable volume for instant audio feedback, even when the app is focused. Configure everything in Settings.',
    icon: 'Bell'
  }
]
