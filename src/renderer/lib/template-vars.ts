import { TaskConfig, WorkflowExecutionContext } from '../../shared/types'

export interface TemplateVariable {
  key: string
  label: string
  category: 'task' | 'trigger'
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: '{{task.title}}', label: 'Title', category: 'task' },
  { key: '{{task.description}}', label: 'Description', category: 'task' },
  { key: '{{task.id}}', label: 'ID', category: 'task' },
  { key: '{{task.status}}', label: 'Status', category: 'task' },
  { key: '{{task.branch}}', label: 'Branch', category: 'task' },
  { key: '{{task.projectName}}', label: 'Project', category: 'task' },
  { key: '{{trigger.fromStatus}}', label: 'Previous Status', category: 'trigger' },
  { key: '{{trigger.toStatus}}', label: 'New Status', category: 'trigger' }
]

/**
 * Resolves template variables in a string using the execution context.
 * Variables follow the pattern {{namespace.property}}.
 * Missing values resolve to empty string; unrecognized variables are left as-is.
 */
export function resolveTemplateVars(
  template: string,
  context?: WorkflowExecutionContext
): string {
  if (!context || !template) return template

  return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, ns, prop) => {
    if (ns === 'task' && context.task) {
      const val = context.task[prop as keyof TaskConfig]
      return val != null ? String(val) : ''
    }
    if (ns === 'trigger' && context.trigger) {
      const triggerObj = context.trigger as Record<string, unknown>
      const val = triggerObj[prop]
      return val != null ? String(val) : ''
    }
    return match
  })
}
