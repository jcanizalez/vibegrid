/**
 * Platform detection for conditional rendering between Electron and Web.
 *
 * In the web app, the API shim sets getAppVersion() to return 'web'.
 * In Electron, it returns the actual version string (e.g. '0.2.1').
 */
export const isWeb =
  typeof window !== 'undefined' &&
  typeof window.api?.getAppVersion === 'function' &&
  window.api.getAppVersion() === 'web'

export const isElectron = !isWeb
