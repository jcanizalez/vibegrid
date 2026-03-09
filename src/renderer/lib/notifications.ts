import { AgentStatus, AppConfig } from '../../shared/types'
import { TerminalState } from '../stores/types'
import { getDisplayName } from './terminal-display'
import { AGENT_DEFINITIONS } from './agent-definitions'

export type NotificationReason = 'waiting' | 'error' | 'bell'

const COOLDOWN_MS = 10_000
const lastNotified = new Map<string, number>()

// --- Web Audio API sound ---

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

const SOUND_PROFILES: Record<NotificationReason, { freq: number; duration: number }> = {
  waiting: { freq: 880, duration: 0.15 },
  error: { freq: 330, duration: 0.3 },
  bell: { freq: 660, duration: 0.2 }
}

export function playNotificationSound(reason: NotificationReason, volume: number = 0.5): void {
  const ctx = getAudioContext()
  const profile = SOUND_PROFILES[reason]

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)

  osc.frequency.value = profile.freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(Math.max(0.001, volume), ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + profile.duration)
  osc.start()
  osc.stop(ctx.currentTime + profile.duration)
}

// --- Notification logic ---

export function shouldNotifyStatus(
  config: AppConfig | null,
  prevStatus: AgentStatus,
  newStatus: AgentStatus
): boolean {
  const prefs = config?.defaults.notifications
  if (!prefs?.enabled) return false

  if (newStatus === 'waiting' && prevStatus !== 'waiting') {
    return prefs.onWaiting !== false
  }
  if (newStatus === 'error' && prevStatus !== 'error') {
    return prefs.onError !== false
  }
  return false
}

export function shouldNotifyBell(config: AppConfig | null): boolean {
  const prefs = config?.defaults.notifications
  return !!prefs?.enabled && prefs.onBell !== false
}

export function sendAgentNotification(
  terminal: TerminalState,
  reason: NotificationReason,
  config: AppConfig | null,
  onClick?: () => void
): void {
  const prefs = config?.defaults.notifications

  // Play sound even when window is focused
  if (prefs?.soundEnabled) {
    playNotificationSound(reason, prefs.soundVolume ?? 0.5)
  }

  // OS notification only when window is not focused
  if (Notification.permission !== 'granted') return
  if (document.hasFocus()) return

  // Cooldown per terminal
  const lastTime = lastNotified.get(terminal.id) ?? 0
  if (Date.now() - lastTime < COOLDOWN_MS) return
  lastNotified.set(terminal.id, Date.now())

  const name = getDisplayName(terminal.session)
  const agent = AGENT_DEFINITIONS[terminal.session.agentType].displayName

  let title: string
  let body: string

  switch (reason) {
    case 'waiting':
      title = `${agent} needs input`
      body = `${name} is waiting for your response`
      break
    case 'error':
      title = `${agent} error`
      body = `${name} encountered an error`
      break
    case 'bell':
      title = `${agent} notification`
      body = `${name} is requesting your attention`
      break
  }

  const notification = new Notification(title, { body, silent: false })
  notification.onclick = () => {
    window.focus()
    onClick?.()
  }
}
