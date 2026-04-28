// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// ── Mock the store: placement, collapsed flag, and the toggle ─────────────
let minimizedPlacement: 'canvas' | 'toolbar' | 'both' = 'toolbar'
let collapsed = false
const toggleCollapsed = vi.fn()
vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      config: { defaults: { minimizedPlacement } },
      toolbarMinimizedCollapsed: collapsed,
      toggleToolbarMinimizedCollapsed: toggleCollapsed
    }
    return selector ? selector(state) : state
  }
}))

// ── Mock useVisibleTerminals: only the minimizedIds field is read ─────────
let minimizedIds: string[] = []
vi.mock('../src/renderer/hooks/useVisibleTerminals', () => ({
  useVisibleTerminals: () => ({ orderedIds: [], minimizedIds })
}))

// ── Stub MinimizedPill so we can count rendered chips by terminalId ───────
vi.mock('../src/renderer/components/MinimizedPill', () => ({
  MinimizedPill: ({ terminalId }: { terminalId: string }) => (
    <div data-testid="pill" data-id={terminalId}>
      {terminalId}
    </div>
  )
}))

import { ToolbarMinimizedStrip } from '../src/renderer/components/ToolbarMinimizedStrip'

beforeEach(() => {
  minimizedPlacement = 'toolbar'
  collapsed = false
  minimizedIds = []
  toggleCollapsed.mockReset()
})

describe('ToolbarMinimizedStrip', () => {
  it('renders nothing when placement is canvas', () => {
    minimizedPlacement = 'canvas'
    minimizedIds = ['t1', 't2']
    const { container } = render(<ToolbarMinimizedStrip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when there are no minimized terminals', () => {
    minimizedIds = []
    const { container } = render(<ToolbarMinimizedStrip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all chips inline when count <= MAX_INLINE (6)', () => {
    minimizedIds = ['a', 'b', 'c', 'd', 'e', 'f']
    const { getAllByTestId, queryByText } = render(<ToolbarMinimizedStrip />)
    expect(getAllByTestId('pill')).toHaveLength(6)
    // No overflow badge when nothing spills past MAX_INLINE
    expect(queryByText(/^\+\d+$/)).toBeNull()
  })

  it('shows +N overflow when count exceeds MAX_INLINE', () => {
    minimizedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
    const { getAllByTestId, getByText } = render(<ToolbarMinimizedStrip />)
    // Inline shows the first 6
    expect(getAllByTestId('pill')).toHaveLength(6)
    // Plus a +3 badge for the rest
    expect(getByText('+3')).toBeInTheDocument()
  })

  it('clicking +N opens the overflow popover with the remaining chips', () => {
    minimizedIds = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
    const { getByText, getAllByTestId } = render(<ToolbarMinimizedStrip />)
    fireEvent.click(getByText('+2'))
    // Popover renders the 2 overflow pills in addition to the 6 inline
    expect(getAllByTestId('pill')).toHaveLength(8)
  })

  it('clicking the trailing chevron toggles the collapsed flag', () => {
    minimizedIds = ['a', 'b']
    const { container } = render(<ToolbarMinimizedStrip />)
    const collapseBtn = container.querySelector('button[aria-label="Collapse minimized strip"]')
    expect(collapseBtn).not.toBeNull()
    fireEvent.click(collapseBtn!)
    expect(toggleCollapsed).toHaveBeenCalledTimes(1)
  })

  it('renders the count badge (Layers icon + count) when collapsed', () => {
    collapsed = true
    minimizedIds = ['a', 'b', 'c', 'd']
    const { getByLabelText, queryAllByTestId } = render(<ToolbarMinimizedStrip />)
    const badge = getByLabelText('4 minimized sessions')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toContain('4')
    // Pills are not rendered until the peek popover opens
    expect(queryAllByTestId('pill')).toHaveLength(0)
  })

  it('clicking the badge opens a peek popover listing every minimized pill', () => {
    collapsed = true
    minimizedIds = ['a', 'b', 'c']
    const { getByLabelText, getAllByTestId } = render(<ToolbarMinimizedStrip />)
    fireEvent.click(getByLabelText('3 minimized sessions'))
    expect(getAllByTestId('pill')).toHaveLength(3)
  })

  it('clicking Expand inside the peek popover toggles the strip back to inline', () => {
    collapsed = true
    minimizedIds = ['a', 'b']
    const { getByLabelText, getByTitle } = render(<ToolbarMinimizedStrip />)
    fireEvent.click(getByLabelText('2 minimized sessions'))
    fireEvent.click(getByTitle('Expand strip'))
    expect(toggleCollapsed).toHaveBeenCalledTimes(1)
  })

  it('placement=both still renders the toolbar strip (chip duplication is by design)', () => {
    minimizedPlacement = 'both'
    minimizedIds = ['x']
    const { getAllByTestId } = render(<ToolbarMinimizedStrip />)
    expect(getAllByTestId('pill')).toHaveLength(1)
  })
})
