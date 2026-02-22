import { AnimatePresence, motion } from 'framer-motion'
import { Cable, FileDown, Globe, Settings, ToggleRight, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setRequestTimeout } from '../../lib/api'
import type { PaneSplit, TimeoutSeconds } from '../../store/settingsStore'
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

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

const SECTIONS = [
  { id: 'appearance', labelKey: 'settings.sections.appearance', icon: Globe },
  { id: 'behavior', labelKey: 'settings.sections.behavior', icon: ToggleRight },
  { id: 'exportImport', labelKey: 'settings.sections.exportImport', icon: FileDown },
  { id: 'connection', labelKey: 'settings.sections.connection', icon: Cable }
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
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
