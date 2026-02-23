import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  Cable,
  CheckCircle,
  Cpu,
  FileDown,
  Globe,
  Settings,
  ToggleRight,
  Trash2,
  X,
  Zap
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  aiCheckGpu,
  aiCheckModel,
  aiCheckOllama,
  aiPullModel,
  setRequestTimeout
} from '../../lib/api'
import type { AiModel, PaneSplit, TimeoutSeconds } from '../../store/settingsStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import type { ExportFormat } from './exportUtils'
import { FORMAT_OPTIONS } from './exportUtils'

// ─── Shared UI primitives ─────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-start justify-between gap-4 rounded-lg px-3 py-3 text-left transition hover:bg-slate-800/50"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
          value ? 'bg-blue-600' : 'bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}

interface SettingRowProps {
  label: string
  description: string
  children: React.ReactNode
}

function SettingRow({ label, description, children }: SettingRowProps): React.JSX.Element {
  return (
    <div className="space-y-2 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  )
}

// ─── Language data ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ca', label: 'Català', flag: '🏴󠁥󠁳󠁣󠁴󠁿' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'gl', label: 'Galego', flag: '🏴' }
]

// ─── Section components ───────────────────────────────────────────────────────

function AppearanceSection(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { defaultPaneSplit, setDefaultPaneSplit, compactMode, setCompactMode } = useSettingsStore()

  const paneSplitOptions: { value: PaneSplit; label: string }[] = [
    { value: '50/50', label: t('settings.appearance.split5050') },
    { value: '60/40', label: t('settings.appearance.split6040') },
    { value: '40/60', label: t('settings.appearance.split4060') }
  ]

  return (
    <div className="space-y-1">
      {/* Language */}
      <SettingRow
        label={t('settings.appearance.language')}
        description={t('settings.appearance.languageDescription')}
      >
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                i18n.language === lang.code
                  ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              <span>{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="mx-3 border-t border-slate-800/80" />

      {/* Pane split */}
      <SettingRow
        label={t('settings.appearance.paneSplit')}
        description={t('settings.appearance.paneSplitDescription')}
      >
        <div className="flex gap-2">
          {paneSplitOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDefaultPaneSplit(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                defaultPaneSplit === opt.value
                  ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="mx-3 border-t border-slate-800/80" />

      {/* Compact mode */}
      <ToggleRow
        label={t('settings.appearance.compactMode')}
        description={t('settings.appearance.compactModeDescription')}
        value={compactMode}
        onChange={setCompactMode}
      />
    </div>
  )
}

function BehaviorSection(): React.JSX.Element {
  const { t } = useTranslation()
  const {
    confirmBeforeDiscard,
    setConfirmBeforeDiscard,
    syncScrollEnabled,
    setSyncScrollEnabled,
    warnOnSecretOverwrite,
    setWarnOnSecretOverwrite
  } = useSettingsStore()
  const { setSyncScroll } = useUIStore()

  return (
    <div className="space-y-1">
      <ToggleRow
        label={t('settings.behavior.confirmBeforeDiscard')}
        description={t('settings.behavior.confirmBeforeDiscardDescription')}
        value={confirmBeforeDiscard}
        onChange={setConfirmBeforeDiscard}
      />
      <div className="mx-3 border-t border-slate-800/80" />
      <ToggleRow
        label={t('settings.behavior.syncScroll')}
        description={t('settings.behavior.syncScrollDescription')}
        value={syncScrollEnabled}
        onChange={(v) => {
          setSyncScrollEnabled(v)
          setSyncScroll(v)
        }}
      />
      <div className="mx-3 border-t border-slate-800/80" />
      <ToggleRow
        label={t('settings.behavior.warnOnSecretOverwrite')}
        description={t('settings.behavior.warnOnSecretOverwriteDescription')}
        value={warnOnSecretOverwrite}
        onChange={setWarnOnSecretOverwrite}
      />
    </div>
  )
}

function ExportImportSection(): React.JSX.Element {
  const { t } = useTranslation()
  const {
    defaultExportFormat,
    setDefaultExportFormat,
    includeSecretsInExport,
    setIncludeSecretsInExport
  } = useSettingsStore()

  return (
    <div className="space-y-1">
      <SettingRow
        label={t('settings.exportImport.defaultFormat')}
        description={t('settings.exportImport.defaultFormatDescription')}
      >
        <div className="flex flex-wrap gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDefaultExportFormat(opt.id as ExportFormat)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                defaultExportFormat === opt.id
                  ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {opt.icon}
              {opt.label}
              <span
                className={`font-mono ${defaultExportFormat === opt.id ? 'text-blue-500' : 'text-slate-600'}`}
              >
                .{opt.ext}
              </span>
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="mx-3 border-t border-slate-800/80" />

      <ToggleRow
        label={t('settings.exportImport.includeSecrets')}
        description={t('settings.exportImport.includeSecretsDescription')}
        value={includeSecretsInExport}
        onChange={setIncludeSecretsInExport}
      />
    </div>
  )
}

function ConnectionSection(): React.JSX.Element {
  const { t } = useTranslation()
  const {
    requestTimeoutSeconds,
    setRequestTimeoutSeconds,
    orgUrlHistory,
    clearOrgUrlHistory,
    removeOrgUrlFromHistory
  } = useSettingsStore()

  const timeoutOptions: { value: TimeoutSeconds; label: string }[] = [
    { value: 15, label: `15 ${t('settings.connection.seconds')}` },
    { value: 30, label: `30 ${t('settings.connection.seconds')}` },
    { value: 60, label: `60 ${t('settings.connection.seconds')}` }
  ]

  return (
    <div className="space-y-1">
      <SettingRow
        label={t('settings.connection.requestTimeout')}
        description={t('settings.connection.requestTimeoutDescription')}
      >
        <div className="flex gap-2">
          {timeoutOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setRequestTimeoutSeconds(opt.value)
                setRequestTimeout(opt.value).catch(console.error)
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                requestTimeoutSeconds === opt.value
                  ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingRow>

      <div className="mx-3 border-t border-slate-800/80" />

      <div className="px-3 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-200">
              {t('settings.connection.orgUrlHistory')}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t('settings.connection.orgUrlHistoryDescription')}
            </p>
          </div>
          {orgUrlHistory.length > 0 && (
            <button
              type="button"
              onClick={clearOrgUrlHistory}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('settings.connection.clearHistory')}
            </button>
          )}
        </div>

        {orgUrlHistory.length === 0 ? (
          <p className="text-xs italic text-slate-600">{t('settings.connection.noHistory')}</p>
        ) : (
          <ul className="space-y-1">
            {orgUrlHistory.map((url) => (
              <li
                key={url}
                className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/50 px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs font-mono text-slate-400">{url}</span>
                <button
                  type="button"
                  onClick={() => removeOrgUrlFromHistory(url)}
                  className="shrink-0 rounded p-0.5 text-slate-600 transition hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── AI Section ───────────────────────────────────────────────────────────────

const AI_MODEL_NOTE_KEYS = {
  fastest: 'settings.ai.modelNote.fastest',
  fast: 'settings.ai.modelNote.fast',
  balanced: 'settings.ai.modelNote.balanced',
  microsoft: 'settings.ai.modelNote.microsoft',
  recommended: 'settings.ai.modelNote.recommended',
  alternative: 'settings.ai.modelNote.alternative'
} as const

type AiModelNoteKey = keyof typeof AI_MODEL_NOTE_KEYS

const AI_MODELS: {
  value: AiModel
  label: string
  size: string
  noteKey: AiModelNoteKey
  tier: 'light' | 'standard'
}[] = [
  {
    value: 'qwen2.5:1.5b',
    label: 'Qwen 2.5 1.5B',
    size: '986 MB',
    noteKey: 'fastest',
    tier: 'light'
  },
  { value: 'llama3.2:3b', label: 'Llama 3.2 3B', size: '2.0 GB', noteKey: 'fast', tier: 'light' },
  { value: 'qwen2.5:3b', label: 'Qwen 2.5 3B', size: '1.9 GB', noteKey: 'balanced', tier: 'light' },
  {
    value: 'phi4-mini',
    label: 'Phi 4 Mini',
    size: '2.5 GB',
    noteKey: 'microsoft',
    tier: 'standard'
  },
  {
    value: 'qwen2.5:7b',
    label: 'Qwen 2.5 7B',
    size: '4.7 GB',
    noteKey: 'recommended',
    tier: 'standard'
  },
  {
    value: 'llama3.1:8b',
    label: 'Llama 3.1 8B',
    size: '4.9 GB',
    noteKey: 'alternative',
    tier: 'standard'
  }
]

const AI_MODEL_TIERS = [
  {
    key: 'light' as const,
    labelKey: 'settings.ai.tierLight' as const,
    hintKey: 'settings.ai.tierLightHint' as const
  },
  {
    key: 'standard' as const,
    labelKey: 'settings.ai.tierStandard' as const,
    hintKey: 'settings.ai.tierStandardHint' as const
  }
]

type ModelStatus = 'idle' | 'checking' | 'present' | 'missing' | 'downloading' | 'error'

function AiSection(): React.JSX.Element {
  const { t } = useTranslation()
  const { aiEnabled, setAiEnabled, aiModel, setAiModel } = useSettingsStore()

  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [pullProgress, setPullProgress] = useState<{ total: number; completed: number } | null>(
    null
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [gpuInfo, setGpuInfo] = useState<string | null | 'checking'>('checking')
  const unlistenRef = useRef<(() => void) | null>(null)

  // Check Ollama + model status whenever AI gets enabled or model changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: checkStatus is stable; aiModel triggers re-check
  useEffect(() => {
    if (!aiEnabled) {
      setOllamaOk(null)
      setModelStatus('idle')
      setGpuInfo('checking')
      return
    }
    checkStatus()
  }, [aiEnabled, aiModel])

  async function checkStatus() {
    setModelStatus('checking')
    setGpuInfo('checking')
    setErrorMsg(null)
    const ok = await aiCheckOllama()
    setOllamaOk(ok)
    if (!ok) {
      setModelStatus('idle')
      setGpuInfo(null)
      return
    }
    const [present, gpu] = await Promise.all([
      aiCheckModel(aiModel).catch(() => false as boolean | false),
      aiCheckGpu().catch(() => null)
    ])
    setModelStatus(present ? 'present' : 'missing')
    setGpuInfo(gpu)
  }

  async function startDownload() {
    setModelStatus('downloading')
    setPullProgress(null)
    setErrorMsg(null)

    const { listen } = await import('@tauri-apps/api/event')
    unlistenRef.current = await listen<{ status: string; total?: number; completed?: number }>(
      'ai:pull-progress',
      (event) => {
        const { total, completed } = event.payload
        if (total && completed !== undefined) {
          setPullProgress({ total, completed })
        }
      }
    )

    try {
      await aiPullModel(aiModel)
      setModelStatus('present')
      setPullProgress(null)
    } catch (e) {
      setModelStatus('error')
      setErrorMsg(e instanceof Error ? e.message : String(e))
    } finally {
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }

  const downloadPercent =
    pullProgress && pullProgress.total > 0
      ? Math.round((pullProgress.completed / pullProgress.total) * 100)
      : null

  return (
    <div className="space-y-1">
      {/* Enable toggle */}
      <ToggleRow
        label={t('settings.ai.enable')}
        description={t('settings.ai.enableDescription')}
        value={aiEnabled}
        onChange={setAiEnabled}
      />

      {aiEnabled && (
        <>
          <div className="mx-3 border-t border-slate-800/80" />
          <div className="mx-3 mt-2 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2">
            <p className="text-[11px] text-amber-400/90">{t('settings.ai.previewWarning')}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{t('settings.ai.localDisclaimer')}</p>
          </div>

          {/* Ollama status */}
          {ollamaOk === false && (
            <div className="mx-3 my-1 rounded-lg border border-amber-700/40 bg-amber-900/20 px-3 py-2.5">
              <p className="text-xs font-medium text-amber-300">
                {t('settings.ai.ollamaNotRunning')}
              </p>
              <p className="mt-0.5 text-xs text-amber-500/80">
                {t('settings.ai.ollamaInstallHint')}
              </p>
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-xs text-blue-400 underline hover:text-blue-300"
              >
                ollama.com ↗
              </a>
            </div>
          )}

          {/* Model selector */}
          <SettingRow
            label={t('settings.ai.model')}
            description={t('settings.ai.modelDescription')}
          >
            <div className="space-y-3">
              {AI_MODEL_TIERS.map((tier) => {
                const models = AI_MODELS.filter((m) => m.tier === tier.key)
                return (
                  <div key={tier.key}>
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t(tier.labelKey)}
                      </span>
                      <span className="text-[10px] text-slate-700">{t(tier.hintKey)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {models.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => {
                            setAiModel(m.value)
                            setModelStatus('idle')
                          }}
                          className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition ${
                            aiModel === m.value
                              ? 'border-blue-500/50 bg-blue-600/20 text-blue-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          <span className="text-xs font-medium">{m.label}</span>
                          <span
                            className={`text-[10px] ${aiModel === m.value ? 'text-blue-400/70' : 'text-slate-600'}`}
                          >
                            {m.size} ·{' '}
                            {(t as (key: string) => string)(AI_MODEL_NOTE_KEYS[m.noteKey])}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </SettingRow>

          {/* Model status + actions */}
          {ollamaOk !== false && (
            <div className="px-3 pb-2">
              {modelStatus === 'checking' && (
                <p className="text-xs text-slate-500">{t('settings.ai.checkingModel')}</p>
              )}

              {modelStatus === 'present' && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                    {t('settings.ai.modelReady')}
                  </div>
                  {/* GPU / CPU inference badge */}
                  {gpuInfo === 'checking' && (
                    <p className="text-[10px] text-slate-600">{t('settings.ai.gpuChecking')}</p>
                  )}
                  {gpuInfo !== 'checking' && gpuInfo !== null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-700/30 bg-emerald-900/10 px-2.5 py-1.5">
                      <Zap className="h-3 w-3 shrink-0 text-emerald-400" />
                      <span className="text-[10px] font-medium text-emerald-300">
                        {t('settings.ai.gpuFound')} {gpuInfo}
                      </span>
                    </div>
                  )}
                  {gpuInfo !== 'checking' && gpuInfo === null && (
                    <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-2.5 py-1.5">
                      <Cpu className="h-3 w-3 shrink-0 text-slate-500" />
                      <span className="text-[10px] text-slate-500">
                        {t('settings.ai.gpuNotFound')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {modelStatus === 'missing' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-400">{t('settings.ai.modelNotDownloaded')}</p>
                  <button
                    type="button"
                    onClick={startDownload}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
                  >
                    {t('settings.ai.downloadModel')}
                  </button>
                </div>
              )}

              {modelStatus === 'downloading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{t('settings.ai.downloading')}</span>
                    {downloadPercent !== null && (
                      <span className="tabular-nums text-slate-300">{downloadPercent}%</span>
                    )}
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${downloadPercent ?? 0}%` }}
                    />
                  </div>
                  {pullProgress && (
                    <p className="text-[10px] text-slate-600 tabular-nums">
                      {(pullProgress.completed / 1e9).toFixed(2)} /{' '}
                      {(pullProgress.total / 1e9).toFixed(2)} GB
                    </p>
                  )}
                </div>
              )}

              {modelStatus === 'error' && (
                <div className="space-y-1.5">
                  <p className="text-xs text-red-400">{t('settings.ai.error')}</p>
                  {errorMsg && <p className="text-[10px] text-red-600/80">{errorMsg}</p>}
                  <button
                    type="button"
                    onClick={checkStatus}
                    className="text-xs text-slate-400 underline hover:text-slate-300"
                  >
                    {t('settings.ai.retry')}
                  </button>
                </div>
              )}

              {modelStatus === 'idle' && ollamaOk === true && (
                <button
                  type="button"
                  onClick={checkStatus}
                  className="text-xs text-slate-500 underline hover:text-slate-300"
                >
                  {t('settings.ai.checkStatus')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

const SECTIONS = [
  { id: 'appearance', labelKey: 'settings.sections.appearance', icon: Globe },
  { id: 'behavior', labelKey: 'settings.sections.behavior', icon: ToggleRight },
  { id: 'exportImport', labelKey: 'settings.sections.exportImport', icon: FileDown },
  { id: 'connection', labelKey: 'settings.sections.connection', icon: Cable },
  { id: 'ai', labelKey: 'settings.sections.ai', icon: Bot }
] as const

type SectionId = (typeof SECTIONS)[number]['id']

export function SettingsModal({ onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          key="settings-panel"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mx-4 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl"
          style={{ height: 560 }}
        >
          {/* ── Unified header ────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <Settings className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">{t('settings.title')}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Two-panel body ────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1">
            {/* Left sidebar */}
            <aside className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 p-2">
              <nav className="space-y-0.5">
                {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      activeSection === id
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {t(labelKey)}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Right content */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-4">
              <h3 className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t(SECTIONS.find((s) => s.id === activeSection)!.labelKey)}
              </h3>
              {activeSection === 'appearance' && <AppearanceSection />}
              {activeSection === 'behavior' && <BehaviorSection />}
              {activeSection === 'exportImport' && <ExportImportSection />}
              {activeSection === 'connection' && <ConnectionSection />}
              {activeSection === 'ai' && <AiSection />}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
