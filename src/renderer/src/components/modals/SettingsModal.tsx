import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Settings, SlidersHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

// ─── Section definitions ──────────────────────────────────────────────────────

type SectionId = 'appearance' | 'general'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ca', label: 'Català' },
  { code: 'it', label: 'Italiano' },
  { code: 'gl', label: 'Galego' }
]

// ─── Section content components ───────────────────────────────────────────────

function AppearanceSection(): React.JSX.Element {
  const { t, i18n } = useTranslation()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-200">{t('settings.appearance.language')}</p>
        <p className="mt-1 text-xs text-slate-500">
          {t('settings.appearance.languageDescription')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                i18n.language === lang.code
                  ? 'border-blue-500 bg-blue-600/10 text-blue-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function GeneralSection(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-sm text-slate-500">{t('settings.general.comingSoon')}</p>
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  const sections: { id: SectionId; labelKey: string; icon: React.ElementType }[] = [
    { id: 'appearance', labelKey: 'settings.sections.appearance', icon: Globe },
    { id: 'general', labelKey: 'settings.sections.general', icon: SlidersHorizontal }
  ]

  return (
    <AnimatePresence>
      <motion.div
        key="settings-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
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
          {/* ── Unified header ───────────────────────────────────────────── */}
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

          {/* ── Two-panel body ───────────────────────────────────────────── */}
          <div className="flex min-h-0 flex-1">
            {/* Left sidebar */}
            <aside className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 p-2">
              <nav className="space-y-0.5">
                {sections.map(({ id, labelKey, icon: Icon }) => (
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
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-5">
              <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t(sections.find((s) => s.id === activeSection)!.labelKey)}
              </h3>
              {activeSection === 'appearance' && <AppearanceSection />}
              {activeSection === 'general' && <GeneralSection />}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
