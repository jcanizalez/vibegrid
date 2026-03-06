/**
 * Centralized theme colors for VibeGrid.
 * Use these constants instead of hardcoded rgba/hex values.
 */
export const theme = {
  /** Main app background */
  bg: '#1a1a1e',
  /** Sidebar, panels — slightly darker than bg */
  bgSurface: '#141416',
  /** Cards, inputs, elevated surfaces */
  bgElevated: '#232326',
  /** Dropdowns, popovers, tooltips */
  bgPopover: '#1e1e22',
  /** Dialog/modal panels */
  bgDialog: '#1a1a1e',
  /** Terminal/content inset areas */
  bgInset: 'rgba(0, 0, 0, 0.2)',
  /** Overlay/backdrop */
  bgOverlay: 'rgba(0, 0, 0, 0.5)',
} as const
