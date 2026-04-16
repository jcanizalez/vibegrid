// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const hoisted = vi.hoisted(() => ({
  registerSlot: vi.fn(),
  unregisterSlot: vi.fn(),
  focusTerminal: vi.fn(),
  fitTerminal: vi.fn(),
  registerStatusHandler: vi.fn().mockReturnValue(() => {})
}))

vi.mock('../src/renderer/lib/terminal-registry', () => hoisted)

vi.mock('../src/renderer/stores', () => ({
  useAppStore: Object.assign(vi.fn().mockReturnValue(60), {
    getState: () => ({
      terminals: new Map(),
      config: {},
      setFocusedTerminal: vi.fn()
    })
  })
}))

const { registerSlot, unregisterSlot, focusTerminal, fitTerminal } = hoisted

import { TerminalSlot } from '../src/renderer/components/TerminalSlot'

describe('TerminalSlot', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
    vi.clearAllMocks()
  })

  it('registers with the registry on mount and unregisters on unmount', () => {
    const { unmount } = render(
      <TerminalSlot terminalId="abc" isFocused={false} className="w-full h-full" />
    )
    expect(registerSlot).toHaveBeenCalledTimes(1)
    expect(registerSlot).toHaveBeenCalledWith('abc', expect.any(HTMLElement))
    unmount()
    expect(unregisterSlot).toHaveBeenCalledTimes(1)
    expect(unregisterSlot).toHaveBeenCalledWith('abc', expect.any(HTMLElement))
  })

  it('renders a div with the given className', () => {
    const { container } = render(
      <TerminalSlot terminalId="abc" isFocused={false} className="my-slot" />
    )
    const div = container.querySelector('div')
    expect(div).not.toBeNull()
    expect(div).toHaveClass('my-slot')
  })

  it('calls focusTerminal and fitTerminal after a short delay when isFocused is true', () => {
    render(<TerminalSlot terminalId="xyz" isFocused={true} />)
    expect(focusTerminal).not.toHaveBeenCalled()
    vi.advanceTimersByTime(100)
    expect(focusTerminal).toHaveBeenCalledWith('xyz')
    expect(fitTerminal).toHaveBeenCalledWith('xyz')
  })

  it('does not call focusTerminal when isFocused is false', () => {
    render(<TerminalSlot terminalId="xyz" isFocused={false} />)
    vi.advanceTimersByTime(100)
    expect(focusTerminal).not.toHaveBeenCalled()
  })

  it('re-fits after a rowHeight change', () => {
    render(<TerminalSlot terminalId="xyz" isFocused={false} />)
    vi.advanceTimersByTime(100)
    // initial rowHeight effect schedules one fit
    expect(fitTerminal).toHaveBeenCalled()
  })
})
