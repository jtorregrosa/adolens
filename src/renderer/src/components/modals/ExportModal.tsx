import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { type ExportFormat, FORMAT_OPTIONS, serializeVariables, tokenizeLine } from './exportUtils'

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  variables: Record<string, AdoVariable>
  groupName?: string | null
  onClose: () => void
}

export function ExportModal({ variables, groupName, onClose }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const [format, setFormat] = useState<ExportFormat>('json')
  const [copied, setCopied] = useState(false)

  const content = useMemo(() => serializeVariables(variables, format), [variables, format])
  const lines = content.split('\n')
  const fmt = FORMAT_OPTIONS.find((f) => f.id === format)!
  const baseName = groupName ? groupName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'variables'
  const totalCount = Object.keys(variables).length
  const secretCount = Object.values(variables).filter((v) => v.isSecret).length

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(serializeVariables(variables, format))
    setCopied(true)
    toast.success(t('modals.export.toast.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave(): void {
    downloadText(serializeVariables(variables, format), `${baseName}.${fmt.ext}`)
    toast.success(t('modals.export.toast.saved', { filename: `${baseName}.${fmt.ext}` }))
  }

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mx-4 flex w-full max-w-2xl flex-col rounded-2xl bg-slate-900 ring-1 ring-slate-700/50"
          style={{ maxHeight: '82vh' }}
        >
          {/* ── Header ──────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-white">{t('modals.export.title')}</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('modals.export.variableCount', { count: totalCount })}
                {secretCount > 0 && (
                  <span className="ml-1 text-slate-600">
                    {t('modals.export.secretCount', { count: secretCount })}
                  </span>
                )}
                {groupName && (
                  <>
                    {' '}
                    — <span className="text-slate-400">{groupName}</span>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Format tabs ─────────────────────────────────────── */}
          <div className="flex shrink-0 gap-1 border-b border-slate-800 px-6 py-2">
            {FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFormat(opt.id)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  format === opt.id
                    ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {opt.icon}
                {opt.label}
                <span
                  className={`font-mono ${format === opt.id ? 'text-blue-600' : 'text-slate-700'}`}
                >
                  .{opt.ext}
                </span>
              </button>
            ))}
          </div>

          {/* ── Code preview (scrollable) ────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-auto bg-slate-950">
            <table className="w-full border-collapse font-mono text-xs leading-[1.6]">
              <tbody>
                {lines.map((line, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered lines from serialized content
                  <tr key={i} className="group hover:bg-white/[0.03]">
                    {/* Line number */}
                    <td
                      className="select-none border-r border-slate-800 px-4 py-0 text-right text-slate-700 group-hover:text-slate-600"
                      style={{ width: '3.5rem', minWidth: '3.5rem' }}
                    >
                      {i + 1}
                    </td>
                    {/* Highlighted line */}
                    <td className="whitespace-pre px-4 py-0">
                      {tokenizeLine(line, format).map((tok, j) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: stable ordered tokens per line
                        <span key={j} className={tok.cls}>
                          {tok.text}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
            >
              {t('modals.export.close')}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? t('modals.export.copied') : t('modals.export.copy')}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              {t('modals.export.save')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
