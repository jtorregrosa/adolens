import { AnimatePresence, motion } from 'framer-motion'
import { HelpCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

const HELP_SECTION_IDS = [
  'gettingStarted',
  'connecting',
  'sidebar',
  'comparing',
  'exportImport',
  'ai',
  'shortcuts'
] as const

type HelpSectionId = (typeof HELP_SECTION_IDS)[number]

// Load all help markdown files (raw). Pattern relative to this file -> ../../content/help
const helpModules = import.meta.glob<string>('./../../content/help/**/*.md', {
  query: '?raw',
  import: 'default'
})

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-sm font-semibold text-slate-200 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-3 text-sm font-medium text-slate-200">{children}</h3>
  ),
  code: ({ children }) => (
    <code className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-200">
      {children}
    </code>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-100">{children}</strong>,
  table: ({ children }) => (
    <div className="my-4 w-full overflow-x-auto rounded-lg border border-slate-700/60">
      <table className="min-w-full table-auto border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-slate-600 bg-slate-800/60">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-700/60 last:border-b-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="whitespace-nowrap px-4 py-2.5 text-left font-semibold text-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-slate-300 [&>p]:mb-0 [&>p:last-child]:mb-0">{children}</td>
  )
}

interface Props {
  onClose: () => void
}

function getLoaderForSection(
  modules: Record<string, () => Promise<unknown>>,
  locale: string,
  section: HelpSectionId
): (() => Promise<unknown>) | null {
  // Vite glob keys can vary (e.g. ./src/... or /src/... or src/...). Try exact path then match by suffix.
  const suffixes = [
    `${locale}/${section}.md`,
    `content/help/${locale}/${section}.md`,
    `src/content/help/${locale}/${section}.md`
  ]
  for (const key of Object.keys(modules)) {
    if (suffixes.some((s) => key.endsWith(s))) return modules[key] as () => Promise<unknown>
  }
  return null
}

export function HelpModal({ onClose }: Props): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const [section, setSection] = useState<HelpSectionId>('gettingStarted')
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const locale = (i18n.language || 'en').split('-')[0]
  const fallbackLocale = 'en'

  useEffect(() => {
    setLoading(true)
    const loader =
      getLoaderForSection(helpModules as Record<string, () => Promise<unknown>>, locale, section) ??
      (locale !== fallbackLocale
        ? getLoaderForSection(
            helpModules as Record<string, () => Promise<unknown>>,
            fallbackLocale,
            section
          )
        : null)

    if (loader) {
      loader()
        .then((raw) => setMarkdown(typeof raw === 'string' ? raw : ''))
        .catch(() => setMarkdown(null))
        .finally(() => setLoading(false))
    } else {
      setMarkdown(null)
      setLoading(false)
    }
  }, [section, locale])

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
          key="help-panel"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="mx-4 flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl"
          style={{ height: 640 }}
        >
          {/* Header — same as Settings */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <HelpCircle className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-200">{t('help.title')}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Two-panel body — same as Settings */}
          <div className="flex min-h-0 flex-1">
            <aside
              className="w-52 shrink-0 border-r border-slate-800 bg-slate-950 p-2"
              aria-label={t('help.sectionsLabel')}
            >
              <nav className="space-y-0.5">
                {HELP_SECTION_IDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSection(id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      section === id
                        ? 'bg-slate-800 text-slate-100'
                        : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                    }`}
                  >
                    {t(`help.sections.${id}`)}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Right content — same as Settings */}
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-4 text-left">
              <h3 className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t(`help.sections.${section}`)}
              </h3>
              {loading ? (
                <p className="text-slate-500">{t('help.loading')}</p>
              ) : markdown ? (
                <div className="help-modal-content text-left">
                  <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    remarkPlugins={[remarkGfm]}
                    components={mdComponents}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-slate-500">{t('help.noContent')}</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
