// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const mockStore = {
  setSettingsOpen: vi.fn(),
  setOnboardingOpen: vi.fn()
}

vi.mock('../src/renderer/stores', () => ({
  useAppStore: (selector?: (state: unknown) => unknown) => {
    return selector ? selector(mockStore) : mockStore
  }
}))

vi.mock('../src/renderer/components/Tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>
}))

const { SidebarFooter } = await import('../src/renderer/components/project-sidebar/SidebarFooter')

beforeEach(() => {
  mockStore.setSettingsOpen.mockReset()
  mockStore.setOnboardingOpen.mockReset()
})

describe('SidebarFooter', () => {
  it('renders Welcome Guide and Settings icon buttons with accessible names', () => {
    render(<SidebarFooter isCollapsed={false} closeSidebarOnMobile={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Welcome Guide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })

  it('opens the Welcome Guide when the help button is clicked', () => {
    render(<SidebarFooter isCollapsed={false} closeSidebarOnMobile={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Welcome Guide' }))
    expect(mockStore.setOnboardingOpen).toHaveBeenCalledWith(true)
  })

  it('opens Settings and dismisses the mobile sidebar when the settings button is clicked', () => {
    const closeSidebarOnMobile = vi.fn()
    render(<SidebarFooter isCollapsed={false} closeSidebarOnMobile={closeSidebarOnMobile} />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(mockStore.setSettingsOpen).toHaveBeenCalledWith(true)
    expect(closeSidebarOnMobile).toHaveBeenCalled()
  })

  it('still renders both buttons when the sidebar is collapsed', () => {
    render(<SidebarFooter isCollapsed={true} closeSidebarOnMobile={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Welcome Guide' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  })
})
