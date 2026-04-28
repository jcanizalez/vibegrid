// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mockSaveConfig = vi.fn()
Object.defineProperty(window, 'api', {
  value: { saveConfig: (...args: unknown[]) => mockSaveConfig(...args) },
  writable: true
})

import { useAppStore } from '../src/renderer/stores'
import { AppearanceSettings } from '../src/renderer/components/settings/AppearanceSettings'

const initialState = useAppStore.getState()

beforeEach(() => {
  mockSaveConfig.mockReset()
  act(() => {
    useAppStore.setState({
      config: {
        version: 1,
        projects: [],
        workflows: [],
        defaults: { shell: '/bin/zsh', fontSize: 13, theme: 'dark' },
        agentCommands: {},
        remoteHosts: [],
        workspaces: []
      }
    })
  })
})

afterEach(() => {
  act(() => {
    useAppStore.setState(initialState)
  })
})

describe('AppearanceSettings: Minimized cards row', () => {
  it('renders all three placement options', () => {
    render(<AppearanceSettings />)
    expect(screen.getByRole('radio', { name: /canvas strip/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /top toolbar/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /both/i })).toBeInTheDocument()
  })

  it('selecting "Canvas strip" persists minimizedPlacement=canvas via saveConfig', () => {
    render(<AppearanceSettings />)
    fireEvent.click(screen.getByRole('radio', { name: /canvas strip/i }))
    expect(mockSaveConfig).toHaveBeenCalled()
    const payload = mockSaveConfig.mock.calls[0][0]
    expect(payload.defaults.minimizedPlacement).toBe('canvas')
  })

  it('selecting "Both" persists minimizedPlacement=both via saveConfig', () => {
    render(<AppearanceSettings />)
    fireEvent.click(screen.getByRole('radio', { name: /both/i }))
    const payload = mockSaveConfig.mock.calls[0][0]
    expect(payload.defaults.minimizedPlacement).toBe('both')
  })
})
