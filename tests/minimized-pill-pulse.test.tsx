// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { TerminalState } from '../src/renderer/stores/types'
import type { AgentStatus } from '../src/shared/types'

vi.mock('../src/renderer/components/AgentIcon', () => ({
  AgentIcon: () => <div data-testid="agent-icon" />
}))

const toggleMinimized = vi.fn()
const setActiveTabId = vi.fn()
let terminal: TerminalState | undefined
vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      terminals: { get: () => terminal },
      toggleMinimized,
      setActiveTabId
    }
    return selector ? selector(state) : state
  }
}))

import { MinimizedPill } from '../src/renderer/components/MinimizedPill'

function term(status: AgentStatus): TerminalState {
  return {
    id: 't1',
    session: {
      id: 't1',
      agentType: 'claude',
      projectName: 'p',
      projectPath: '/p',
      status,
      createdAt: Date.now()
    },
    status,
    lastOutputTimestamp: Date.now()
  } as unknown as TerminalState
}

describe('MinimizedPill status dot', () => {
  it('animates the dot only when the agent is running', () => {
    terminal = term('running')
    const { container } = render(<MinimizedPill terminalId="t1" />)
    const dot = container.querySelector('span.rounded-full')
    expect(dot).not.toBeNull()
    expect(dot?.className).toContain('animate-pulse')
  })

  it('leaves the dot static for non-running statuses', () => {
    for (const s of ['idle', 'waiting', 'error'] as const) {
      terminal = term(s)
      const { container, unmount } = render(<MinimizedPill terminalId="t1" />)
      const dot = container.querySelector('span.rounded-full')
      expect(dot?.className).not.toContain('animate-pulse')
      unmount()
    }
  })
})
