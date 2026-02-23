import appIcon from '@renderer/assets/icon.png'
import { getVersion } from '@tauri-apps/api/app'
import { AnimatePresence, motion } from 'framer-motion'
import { Code2, ExternalLink, Github, Heart, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  onClose: () => void
}

const TECH_STACK = [
  { name: 'Tauri', href: 'https://tauri.app' },
  { name: 'React', href: 'https://react.dev' },
  { name: 'TypeScript', href: 'https://www.typescriptlang.org' },
  { name: 'Rust', href: 'https://www.rust-lang.org' },
  { name: 'Tailwind CSS', href: 'https://tailwindcss.com' }
]

export function AboutModal({ onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [version, setVersion] = useState<string>('…')

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion('—'))
  }, [])

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
          key="about-panel"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mx-4 w-full max-w-sm overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl"
        >
          {/* Close button */}
          <div className="flex justify-end px-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Hero */}
          <div className="flex flex-col items-center gap-3 px-8 pb-6 pt-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-800 ring-1 ring-slate-700/60 shadow-xl">
              <img src={appIcon} alt="ADOLens" className="h-14 w-14" draggable={false} />
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight text-slate-100">ADOLens</h2>
              <p className="mt-0.5 text-xs text-slate-500">{t('about.description')}</p>
            </div>

            {/* Version badge */}
            <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-0.5 font-mono text-[11px] text-slate-400">
              v{version}
            </span>
          </div>

          {/* Divider */}
          <div className="mx-6 border-t border-slate-800" />

          {/* Details */}
          <div className="space-y-4 px-6 py-5">
            {/* Author */}
            <div className="flex items-start gap-3">
              <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  {t('about.author')}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">Jorge Torregrosa Lloret</p>
              </div>
            </div>

            {/* Tech stack */}
            <div className="flex items-start gap-3">
              <Code2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  {t('about.builtWith')}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {TECH_STACK.map((tech) => (
                    <a
                      key={tech.name}
                      href={tech.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                    >
                      {tech.name}
                      <ExternalLink className="h-2.5 w-2.5 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* GitHub */}
            <div className="flex items-start gap-3">
              <Github className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                  {t('about.source')}
                </p>
                <a
                  href="https://github.com/jtorregrosa/adolens-tauri"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-400 underline-offset-2 hover:underline"
                >
                  github.com/jtorregrosa/adolens-tauri
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-6 py-3 text-center">
            <p className="text-[10px] text-slate-700">
              {t('about.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
