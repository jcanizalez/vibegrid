import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores'
import { SettingsPageHeader } from './SettingsPageHeader'
import { ConnectorIcon } from '../ConnectorIcon'
import { Plus, RefreshCw, Trash2, Check, AlertCircle } from 'lucide-react'
import type {
  SourceConnection,
  ConnectorManifest,
  ConnectorConfigField,
  TaskStatus
} from '../../../shared/types'

interface ConnectorInfo {
  id: string
  name: string
  icon: string
  capabilities: string[]
  manifest: ConnectorManifest
}

export function ConnectorSettings() {
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([])
  const [connections, setConnections] = useState<SourceConnection[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [syncResult, setSyncResult] = useState<{
    id: string
    created: number
    updated: number
    error?: string
  } | null>(null)

  const load = useCallback(async () => {
    const [c, conns] = await Promise.all([
      window.api.listConnectors(),
      window.api.listConnections()
    ])
    setConnectors(c)
    setConnections(conns)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId)
    setSyncResult(null)
    try {
      const result = await window.api.syncConnection(connectionId)
      setSyncResult({ id: connectionId, ...result })
    } finally {
      setSyncing(null)
      load()
    }
  }

  const handleDelete = async (connectionId: string) => {
    await window.api.deleteConnection(connectionId)
    load()
  }

  return (
    <div>
      <SettingsPageHeader
        title="Connectors"
        description="Connect external task sources like GitHub and Linear"
      />

      {/* Available connectors */}
      <div className="mb-8">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
          Available Connectors
        </h3>
        <div className="space-y-2">
          {connectors.map((c) => {
            const existingConns = connections.filter((conn) => conn.connectorId === c.id)
            return (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <ConnectorIcon connectorId={c.id} size={18} className="text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-200 font-medium">{c.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{c.capabilities.join(' · ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {existingConns.length > 0 && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <Check size={12} /> {existingConns.length} connected
                    </span>
                  )}
                  <button
                    onClick={() => setAdding(c.id)}
                    className="text-xs text-gray-400 hover:text-white px-2.5 py-1 border border-white/[0.1] rounded-md hover:bg-white/[0.06] transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>
              </div>
            )
          })}
          {connectors.length === 0 && (
            <p className="text-sm text-gray-500">No connectors available.</p>
          )}
        </div>
      </div>

      {adding && (
        <AddConnectionForm
          connector={connectors.find((c) => c.id === adding)!}
          onDone={() => {
            setAdding(null)
            load()
          }}
          onCancel={() => setAdding(null)}
        />
      )}

      {connections.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
            Active Connections
          </h3>
          <div className="space-y-2">
            {connections.map((conn) => {
              const isSyncing = syncing === conn.id
              const result = syncResult?.id === conn.id ? syncResult : null
              return (
                <div
                  key={conn.id}
                  className="px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ConnectorIcon
                        connectorId={conn.connectorId}
                        size={16}
                        className="text-gray-400"
                      />
                      <div>
                        <span className="text-sm text-gray-200 font-medium">{conn.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={isSyncing}
                        className="p-1.5 text-gray-500 hover:text-white rounded transition-colors disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => handleDelete(conn.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 rounded transition-colors"
                        title="Remove connection"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    {conn.lastSyncAt && (
                      <span className="text-gray-500">
                        Last synced: {new Date(conn.lastSyncAt).toLocaleString()}
                      </span>
                    )}
                    {conn.lastSyncError && (
                      <span className="text-red-400 flex items-center gap-1">
                        <AlertCircle size={10} /> {conn.lastSyncError}
                      </span>
                    )}
                    {result && !result.error && (
                      <span className="text-green-400">
                        +{result.created} created, {result.updated} updated
                      </span>
                    )}
                    {result?.error && <span className="text-red-400">{result.error}</span>}
                  </div>
                  {Object.keys(conn.filters).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(conn.filters).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded text-gray-400"
                        >
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function AddConnectionForm({
  connector,
  onDone,
  onCancel
}: {
  connector: ConnectorInfo
  onDone: () => void
  onCancel: () => void
}) {
  const projects = useAppStore((s) => s.config?.projects || [])
  const manifest = connector.manifest

  const [selectedProject, setSelectedProject] = useState(projects[0]?.name || '')
  const [detectedRepo, setDetectedRepo] = useState<{
    owner: string
    repo: string
  } | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const project = projects.find((p) => p.name === selectedProject)
    if (!project) return
    setDetecting(true)
    setDetectedRepo(null)
    window.api.detectRepo(project.path).then((result) => {
      setDetectedRepo(result)
      setDetecting(false)
    })
  }, [selectedProject, projects])

  const statusMapping: Record<string, TaskStatus> = {}
  for (const opt of manifest.statusMapping || []) {
    statusMapping[opt.upstream] = opt.suggestedLocal
  }

  const handleSave = async () => {
    if (!detectedRepo) return
    setSaving(true)
    try {
      const conn = await window.api.createConnection({
        connectorId: connector.id,
        name: `${detectedRepo.owner}/${detectedRepo.repo}`,
        filters: { ...filters, owner: detectedRepo.owner, repo: detectedRepo.repo },
        syncIntervalMinutes: 5,
        statusMapping,
        executionProject: selectedProject
      })
      await window.api.syncConnection(conn.id)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-8 px-4 py-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <ConnectorIcon connectorId={connector.id} size={16} className="text-gray-400" />
        <h3 className="text-sm font-medium text-gray-200">Connect {connector.name}</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Project</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-md text-sm text-gray-200 focus:border-white/[0.2] outline-none"
          >
            {projects.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs">
          {detecting && <span className="text-gray-500">Detecting repository...</span>}
          {detectedRepo && (
            <span className="text-green-400 flex items-center gap-1">
              <Check size={12} /> Detected: {detectedRepo.owner}/{detectedRepo.repo}
            </span>
          )}
          {!detecting && !detectedRepo && selectedProject && (
            <span className="text-amber-400">
              No GitHub repo detected. Is this a git repo with a GitHub remote?
            </span>
          )}
        </div>

        {(manifest.taskFilters || []).map((field) => (
          <DynamicField
            key={field.key}
            field={field}
            value={filters[field.key] || ''}
            onChange={(v) => setFilters((prev) => ({ ...prev, [field.key]: v }))}
          />
        ))}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !detectedRepo}
            className="px-4 py-1.5 text-sm bg-white/[0.1] hover:bg-white/[0.15] text-white rounded-md transition-colors disabled:opacity-50"
          >
            {saving ? 'Connecting...' : 'Connect & Sync'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function DynamicField({
  field,
  value,
  onChange
}: {
  field: ConnectorConfigField
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-md text-sm text-gray-200 focus:border-white/[0.2] outline-none"
        >
          <option value="">—</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-md text-sm text-gray-200 focus:border-white/[0.2] outline-none"
        />
      ) : (
        <input
          type={field.type === 'password' ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-md text-sm text-gray-200 focus:border-white/[0.2] outline-none"
        />
      )}
      {field.description && <p className="text-[10px] text-gray-600 mt-0.5">{field.description}</p>}
    </div>
  )
}
