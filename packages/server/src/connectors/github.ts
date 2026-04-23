import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type {
  VornConnector,
  ExternalItem,
  PollResult,
  ActionResult,
  ConnectorManifest,
  TaskStatus
} from '@vornrun/shared/types'
import log from '../logger'

const execFileAsync = promisify(execFile)

async function gh(args: string[], cwd?: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('gh', args, {
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      ...(cwd && { cwd })
    })
    return stdout
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error(`[github-connector] gh command failed: gh ${args.join(' ')} — ${msg}`)
    throw new Error(`gh command failed: ${msg}`, { cause: err })
  }
}

/** Detect owner/repo from a git repo path using gh CLI */
export async function detectRepoSlug(
  projectPath: string
): Promise<{ owner: string; repo: string } | null> {
  try {
    const result = await gh(
      ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
      projectPath
    )
    const slug = result.trim()
    if (!slug.includes('/')) return null
    const [owner, repo] = slug.split('/')
    return { owner, repo }
  } catch {
    return null
  }
}

async function ghApi(
  endpoint: string,
  method = 'GET',
  body?: Record<string, unknown>
): Promise<unknown> {
  const args = ['api', endpoint]
  if (method !== 'GET') {
    args.push('-X', method)
  }
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      args.push('-f', `${key}=${String(value)}`)
    }
  }
  const result = await gh(args)
  return result.trim() ? JSON.parse(result) : null
}

interface GitHubIssue {
  number: number
  title: string
  body: string | null
  state: string
  html_url: string
  updated_at: string
  created_at: string
  labels: Array<{ name: string }>
  assignee: { login: string } | null
  pull_request?: unknown
}

function issueToExternalItem(issue: GitHubIssue): ExternalItem {
  return {
    externalId: String(issue.number),
    url: issue.html_url,
    title: issue.title,
    description: issue.body || '',
    status: issue.state,
    labels: issue.labels?.map((l) => l.name) ?? [],
    assignee: issue.assignee?.login,
    updatedAt: issue.updated_at,
    metadata: { createdAt: issue.created_at }
  }
}

export const githubConnector: VornConnector = {
  id: 'github',
  name: 'GitHub',
  icon: 'github',
  capabilities: ['tasks', 'triggers', 'actions'],

  async listItems(filters: Record<string, unknown>): Promise<ExternalItem[]> {
    const { owner, repo, state = 'open', labels, assignee, per_page = 50 } = filters
    if (!owner || !repo) throw new Error('owner and repo are required')

    let endpoint = `repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}`
    if (labels) endpoint += `&labels=${labels}`
    if (assignee) endpoint += `&assignee=${assignee}`
    // Exclude pull requests (GitHub API returns PRs in issues endpoint)
    const data = (await ghApi(endpoint)) as GitHubIssue[]
    return data.filter((i) => !i.pull_request).map(issueToExternalItem)
  },

  async getItem(
    externalId: string,
    filters: Record<string, unknown>
  ): Promise<ExternalItem | null> {
    const { owner, repo } = filters
    if (!owner || !repo) throw new Error('owner and repo are required')

    try {
      const issue = (await ghApi(`repos/${owner}/${repo}/issues/${externalId}`)) as GitHubIssue
      return issueToExternalItem(issue)
    } catch {
      return null
    }
  },

  async poll(
    triggerType: string,
    config: Record<string, unknown>,
    cursor?: string
  ): Promise<PollResult> {
    const { owner, repo } = config
    if (!owner || !repo) return { events: [] }

    const since = cursor || new Date(Date.now() - 60_000).toISOString()

    switch (triggerType) {
      case 'issueCreated': {
        const endpoint = `repos/${owner}/${repo}/issues?state=open&sort=created&direction=desc&since=${since}&per_page=30`
        const issues = (await ghApi(endpoint)) as GitHubIssue[]
        const newIssues = issues.filter((i) => !i.pull_request && i.created_at > since)
        return {
          events: newIssues.map((i) => ({
            id: String(i.number),
            type: 'issueCreated',
            data: issueToExternalItem(i) as unknown as Record<string, unknown>,
            timestamp: i.created_at
          })),
          nextCursor: new Date().toISOString()
        }
      }
      case 'prOpened': {
        const endpoint = `repos/${owner}/${repo}/pulls?state=open&sort=created&direction=desc&per_page=30`
        const prs = (await ghApi(endpoint)) as Array<{
          number: number
          title: string
          html_url: string
          created_at: string
          user: { login: string }
        }>
        const newPrs = prs.filter((pr) => pr.created_at > since)
        return {
          events: newPrs.map((pr) => ({
            id: String(pr.number),
            type: 'prOpened',
            data: {
              number: pr.number,
              title: pr.title,
              url: pr.html_url,
              author: pr.user.login
            },
            timestamp: pr.created_at
          })),
          nextCursor: new Date().toISOString()
        }
      }
      default:
        return { events: [] }
    }
  },

  async execute(actionType: string, args: Record<string, unknown>): Promise<ActionResult> {
    const { owner, repo } = args
    if (!owner || !repo) return { success: false, error: 'owner and repo are required' }

    switch (actionType) {
      case 'createIssue': {
        const { title, body, labels: issueLabels } = args
        if (!title) return { success: false, error: 'title is required' }
        const bodyArgs: Record<string, unknown> = {
          title: String(title)
        }
        if (body) bodyArgs.body = String(body)
        if (issueLabels) {
          bodyArgs.labels = String(issueLabels)
        }
        const result = await ghApi(`repos/${owner}/${repo}/issues`, 'POST', bodyArgs)
        return { success: true, output: result as Record<string, unknown> }
      }
      case 'closeIssue': {
        const { number: issueNumber } = args
        if (!issueNumber) return { success: false, error: 'number is required' }
        await ghApi(`repos/${owner}/${repo}/issues/${issueNumber}`, 'PATCH', { state: 'closed' })
        return { success: true }
      }
      case 'commentOnIssue': {
        const { number: num, body: comment } = args
        if (!num || !comment) return { success: false, error: 'number and body are required' }
        await ghApi(`repos/${owner}/${repo}/issues/${num}/comments`, 'POST', {
          body: String(comment)
        })
        return { success: true }
      }
      case 'syncTasks': {
        // This is handled by the sync engine at a higher level.
        // The action node calls listItems() and does the upsert logic.
        return { success: true }
      }
      default:
        return { success: false, error: `Unknown action: ${actionType}` }
    }
  },

  describe(): ConnectorManifest {
    return {
      auth: [], // gh CLI handles auth — no fields needed
      taskFilters: [
        {
          key: 'state',
          label: 'State',
          type: 'select',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'all', label: 'All' }
          ]
        },
        { key: 'labels', label: 'Labels', type: 'text', placeholder: 'bug,enhancement' },
        { key: 'assignee', label: 'Assignee', type: 'text', placeholder: 'username or @me' }
      ],
      statusMapping: [
        { upstream: 'open', suggestedLocal: 'todo' as TaskStatus },
        { upstream: 'closed', suggestedLocal: 'done' as TaskStatus }
      ],
      triggers: [
        {
          type: 'issueCreated',
          label: 'Issue Created',
          description: 'Fires when a new issue is created',
          configFields: [
            { key: 'owner', label: 'Owner', type: 'text', required: true },
            { key: 'repo', label: 'Repository', type: 'text', required: true },
            { key: 'labels', label: 'Filter by labels', type: 'text' }
          ],
          defaultIntervalMs: 30_000
        },
        {
          type: 'prOpened',
          label: 'PR Opened',
          description: 'Fires when a new pull request is opened',
          configFields: [
            { key: 'owner', label: 'Owner', type: 'text', required: true },
            { key: 'repo', label: 'Repository', type: 'text', required: true }
          ],
          defaultIntervalMs: 30_000
        }
      ],
      actions: [
        {
          type: 'syncTasks',
          label: 'Sync Issues',
          description: 'Pull GitHub issues into the task board',
          configFields: []
        },
        {
          type: 'createIssue',
          label: 'Create Issue',
          description: 'Create a new GitHub issue',
          configFields: [
            { key: 'owner', label: 'Owner', type: 'text', required: true },
            { key: 'repo', label: 'Repository', type: 'text', required: true },
            {
              key: 'title',
              label: 'Title',
              type: 'text',
              required: true,
              supportsTemplates: true
            },
            { key: 'body', label: 'Body', type: 'textarea', supportsTemplates: true },
            { key: 'labels', label: 'Labels', type: 'text' }
          ]
        },
        {
          type: 'closeIssue',
          label: 'Close Issue',
          description: 'Close a GitHub issue',
          configFields: [
            { key: 'owner', label: 'Owner', type: 'text', required: true },
            { key: 'repo', label: 'Repository', type: 'text', required: true },
            {
              key: 'number',
              label: 'Issue #',
              type: 'text',
              required: true,
              supportsTemplates: true
            }
          ]
        },
        {
          type: 'commentOnIssue',
          label: 'Comment on Issue',
          description: 'Add a comment to a GitHub issue',
          configFields: [
            { key: 'owner', label: 'Owner', type: 'text', required: true },
            { key: 'repo', label: 'Repository', type: 'text', required: true },
            {
              key: 'number',
              label: 'Issue #',
              type: 'text',
              required: true,
              supportsTemplates: true
            },
            {
              key: 'body',
              label: 'Comment',
              type: 'textarea',
              required: true,
              supportsTemplates: true
            }
          ]
        }
      ],
      defaultWorkflows: [
        {
          name: 'Sync GitHub Issues',
          trigger: 'recurring',
          cron: '*/5 * * * *',
          actionType: 'syncTasks'
        }
      ]
    }
  }
}
