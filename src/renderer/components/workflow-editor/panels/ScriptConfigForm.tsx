import { ScriptConfig } from '../../../../shared/types'
import { useAppStore } from '../../../stores'

interface Props {
  config: ScriptConfig
  onChange: (config: ScriptConfig) => void
}

const SCRIPT_TYPES: ScriptConfig['scriptType'][] = ['bash', 'powershell', 'python', 'node']

export function ScriptConfigForm({ config, onChange }: Props) {
  const projects = useAppStore((s) => s.config?.projects || [])

  return (
    <div className="space-y-4">
      {/* Script Type */}
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
          Type
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {SCRIPT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => onChange({ ...config, scriptType: type })}
              className={`px-2.5 py-1.5 text-[12px] rounded-md transition-colors capitalize
                         ${config.scriptType === type
                           ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                           : 'bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.08]'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Project Context (for CWD) */}
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
          Project Context (CWD)
        </label>
        <select
          value={config.projectName || ''}
          onChange={(e) => {
            const proj = projects.find((p) => p.name === e.target.value)
            if (proj) {
              onChange({
                ...config,
                projectName: proj.name,
                projectPath: proj.path,
                cwd: proj.path // Default CWD to project path
              })
            } else {
              // Clear project context
              const { projectName, projectPath, ...rest } = config
              onChange(rest as ScriptConfig)
            }
          }}
          className="w-full px-3 py-2 text-[13px] bg-white/[0.06] border border-white/[0.1] rounded-md
                     text-white focus:outline-none focus:border-blue-500/50 appearance-none"
        >
          <option value="">None (Use default CWD)</option>
          {projects.map((p) => (
            <option key={p.name} value={p.name}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Script Content */}
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
          Script
        </label>
        <textarea
          value={config.scriptContent || ''}
          onChange={(e) => onChange({ ...config, scriptContent: e.target.value })}
          placeholder={`Enter ${config.scriptType} script...`}
          rows={10}
          className="w-full px-3 py-2 text-[12px] font-mono bg-[#0d0d0f] border border-white/[0.1] rounded-md
                     text-gray-300 placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50
                     resize-none leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Arguments */}
      <div>
        <label className="text-[11px] text-gray-500 uppercase tracking-wider font-medium block mb-1.5">
          Arguments
        </label>
        <input
          type="text"
          value={(config.args || []).join(' ')}
          onChange={(e) => onChange({ ...config, args: e.target.value.split(' ').filter(Boolean) })}
          placeholder="arg1 arg2..."
          className="w-full px-3 py-2 text-[13px] bg-white/[0.06] border border-white/[0.1] rounded-md
                     text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
        />
        <p className="text-[10px] text-gray-500 mt-1">
          Space-separated arguments passed to the script
        </p>
      </div>
    </div>
  )
}
