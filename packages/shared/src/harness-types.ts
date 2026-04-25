// ─── Harness Types ──────────────────────────────────────────────
// Provider-agnostic contract for the AI harness layer.
// The UI consumes only these types — it never knows which provider is active.

// ─── Provider Identity ──────────────────────────────────────────

export type HarnessProviderId = 'claude' | 'copilot' | 'codex'

export interface ProviderCapability {
  id: string
  name: string
  description?: string
  /** If scoped, e.g. "project" or "global" */
  scope?: string
  enabled: boolean
}

export interface ProviderInfo {
  id: HarnessProviderId
  name: string
  available: boolean
  models: ProviderModel[]
  capabilities: ProviderCapability[]
}

export interface ProviderModel {
  id: string
  name: string
  contextWindow?: number
  supportsStreaming: boolean
}

// ─── Session ────────────────────────────────────────────────────

export type HarnessSessionStatus =
  | 'initializing'
  | 'ready'
  | 'streaming'
  | 'waiting_permission'
  | 'interrupted'
  | 'ended'
  | 'error'

export interface HarnessSession {
  id: string
  providerId: HarnessProviderId
  modelId: string
  status: HarnessSessionStatus
  cwd: string
  createdAt: string
  /** Opaque cursor for session resume (provider-specific) */
  resumeCursor?: string
}

// ─── Messages ───────────────────────────────────────────────────

export type HarnessMessageRole = 'user' | 'assistant'

export interface HarnessMessage {
  id: string
  sessionId: string
  role: HarnessMessageRole
  parts: HarnessContentPart[]
  createdAt: string
}

export type HarnessContentPart =
  | HarnessTextPart
  | HarnessToolUsePart
  | HarnessToolResultPart
  | HarnessThinkingPart

export interface HarnessTextPart {
  type: 'text'
  text: string
}

export interface HarnessToolUsePart {
  type: 'tool_use'
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

export interface HarnessToolResultPart {
  type: 'tool_result'
  toolUseId: string
  output: string
  isError?: boolean
}

export interface HarnessThinkingPart {
  type: 'thinking'
  text: string
}

// ─── Canonical Events (streamed to UI) ──────────────────────────

export type HarnessEvent =
  | HarnessSessionStartedEvent
  | HarnessSessionEndedEvent
  | HarnessTurnStartedEvent
  | HarnessTurnCompletedEvent
  | HarnessContentDeltaEvent
  | HarnessContentCompleteEvent
  | HarnessToolStartedEvent
  | HarnessToolProgressEvent
  | HarnessToolCompletedEvent
  | HarnessPermissionRequestedEvent
  | HarnessPermissionResolvedEvent
  | HarnessStatusEvent
  | HarnessErrorEvent

interface HarnessEventBase {
  sessionId: string
  timestamp: string
}

export interface HarnessSessionStartedEvent extends HarnessEventBase {
  type: 'session.started'
  session: HarnessSession
}

export interface HarnessSessionEndedEvent extends HarnessEventBase {
  type: 'session.ended'
  reason: 'completed' | 'interrupted' | 'error'
}

export interface HarnessTurnStartedEvent extends HarnessEventBase {
  type: 'turn.started'
  turnId: string
}

export interface HarnessTurnCompletedEvent extends HarnessEventBase {
  type: 'turn.completed'
  turnId: string
  message: HarnessMessage
}

export interface HarnessContentDeltaEvent extends HarnessEventBase {
  type: 'content.delta'
  turnId: string
  delta: string
  /** Which content block index this delta belongs to */
  blockIndex: number
  blockType: 'text' | 'thinking'
}

export interface HarnessContentCompleteEvent extends HarnessEventBase {
  type: 'content.complete'
  turnId: string
  blockIndex: number
  text: string
}

export interface HarnessToolStartedEvent extends HarnessEventBase {
  type: 'tool.started'
  toolUseId: string
  toolName: string
  input: Record<string, unknown>
}

export interface HarnessToolProgressEvent extends HarnessEventBase {
  type: 'tool.progress'
  toolUseId: string
  output: string
}

export interface HarnessToolCompletedEvent extends HarnessEventBase {
  type: 'tool.completed'
  toolUseId: string
  output: string
  isError: boolean
}

export interface HarnessPermissionRequestedEvent extends HarnessEventBase {
  type: 'permission.requested'
  requestId: string
  toolName: string
  input: Record<string, unknown>
  description: string
}

export interface HarnessPermissionResolvedEvent extends HarnessEventBase {
  type: 'permission.resolved'
  requestId: string
  allowed: boolean
}

export interface HarnessStatusEvent extends HarnessEventBase {
  type: 'status'
  status: 'thinking' | 'working' | 'idle'
  message?: string
}

export interface HarnessErrorEvent extends HarnessEventBase {
  type: 'error'
  code: string
  message: string
}

// ─── Provider Connector Contract ────────────────────────────────
// Each provider adapter implements this interface.

export interface ProviderConnector {
  readonly providerId: HarnessProviderId

  /** Check if this provider's binary/API is available on the system */
  isAvailable(): Promise<boolean>

  /** Provider metadata + capabilities */
  getInfo(): Promise<ProviderInfo>

  /** Start a new session. Returns the session + begins streaming events. */
  startSession(opts: StartSessionOpts): Promise<HarnessSession>

  /** Resume a previous session from a cursor */
  resumeSession(opts: ResumeSessionOpts): Promise<HarnessSession>

  /** Send a user message into an active session */
  sendMessage(sessionId: string, message: string): Promise<void>

  /** Interrupt the current turn */
  interrupt(sessionId: string): Promise<void>

  /** Stop and close a session */
  stop(sessionId: string): Promise<void>

  /** Resolve a permission request */
  resolvePermission(sessionId: string, requestId: string, allowed: boolean): Promise<void>

  /** Subscribe to canonical events for a session */
  onEvent(handler: (event: HarnessEvent) => void): void

  /** Unsubscribe from events */
  offEvent(handler: (event: HarnessEvent) => void): void

  /** Cleanup all sessions */
  dispose(): Promise<void>
}

export interface StartSessionOpts {
  cwd: string
  modelId?: string
  systemPrompt?: string
  /** Initial user message to send immediately */
  initialMessage?: string
}

export interface ResumeSessionOpts {
  sessionId: string
  cwd: string
  resumeCursor: string
}
