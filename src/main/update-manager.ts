import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import { IPC } from '../shared/types'
import log from './logger'

export type UpdateChannel = 'stable' | 'beta'

class UpdateManager {
  private mainWindow: BrowserWindow | null = null
  private checkInterval: ReturnType<typeof setInterval> | null = null

  init(mainWindow: BrowserWindow, channel: UpdateChannel = 'stable'): void {
    if (!app.isPackaged) return

    this.mainWindow = mainWindow
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    this.setChannel(channel)

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      this.mainWindow?.webContents.send(IPC.UPDATE_DOWNLOADED, {
        version: info.version
      })
    })

    autoUpdater.on('error', (err) => {
      log.error('[updater] Error:', err.message)
    })

    this.checkForUpdates()
    this.checkInterval = setInterval(() => this.checkForUpdates(), 4 * 60 * 60 * 1000)
  }

  /**
   * Set the update channel. 'beta' receives both beta and stable releases.
   * 'stable' (default) receives only stable releases.
   */
  setChannel(channel: UpdateChannel): void {
    autoUpdater.channel = channel === 'beta' ? 'beta' : 'latest'
    autoUpdater.allowPrerelease = channel === 'beta'
    log.info(`[updater] channel set to "${channel}" (allowPrerelease=${channel === 'beta'})`)
  }

  checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('[updater] Check failed:', err.message)
    })
  }

  installUpdate(): void {
    autoUpdater.quitAndInstall(false, true)
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
}

export const updateManager = new UpdateManager()
