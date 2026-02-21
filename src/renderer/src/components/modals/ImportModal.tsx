import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderOpen, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'
import { FORMAT_OPTIONS, type ExportFormat, tokenizeLine } from './ExportModal'

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseJSON(text: string): Record<string, AdoVariable> | null {
  try {
    const obj = JSON.parse(text)
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return null
    const result: Record<string, AdoVariable> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = { value: String(v ?? ''), isSecret: false }
    }
    return result
  } catch {
    return null
  }
}

function parseKeyValue(text: string): Record<string, AdoVariable> {
  const result: Record<string, AdoVariable> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1)
    if (key) result[key] = { value: val, isSecret: false }
  }
  return result
}

function parsePowershell(text: string): Record<string, AdoVariable> {
  const result: Record<string, AdoVariable> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^\$env:([^=\s]+)\s*=\s*"(.*)"$/)
    if (!m) continue
    result[m[1]] = { value: m[2].replace(/`"/g, '"'), isSecret: false }
  }
  return result
}

function parseBash(text: string): Record<string, AdoVariable> {
  const result: Record<string, AdoVariable> = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^export ([^=]+)="(.*)"$/)
    if (!m) continue
    result[m[1]] = { value: m[2].replace(/\\"/g, '"'), isSecret: false }
  }
  return result
}

function detectFormat(filename: string, content: string): ExportFormat {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'json') return 'json'
  if (ext === 'ps1') return 'powershell'
  if (ext === 'sh') return 'bash'
  // Heuristic detection by content
  if (content.trimStart().startsWith('{')) return 'json'
  if (/^\$env:/m.test(content)) return 'powershell'
  if (/^export /m.test(content)) return 'bash'
  return 'keyvalue'
}

function parseVariables(
  content: string,
  format: ExportFormat
): Record<string, AdoVariable> | null {
  switch (format) {
    case 'json':       return parseJSON(content)
    case 'keyvalue':   return parseKeyValue(content)
    case 'powershell': return parsePowershell(content)
    case 'bash':       return parseBash(content)
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onImport: (variables: Record<string, AdoVariable>) => void
}

export function ImportModal({ onClose, onImport }: Props): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [format, setFormat] = useState<ExportFormat>('json')
  const [parseError, setParseError] = useState<string | null>(null)

  const parsed = useMemo((): Record<string, AdoVariable> | null => {
    if (!content.trim()) return null
    const result = parseVariables(content, format)
    return result
  }, [content, format])

  const varCount = parsed ? Object.keys(parsed).length : 0

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setParseError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setContent(text)
      const detected = detectFormat(file.name, text)
      setFormat(detected)
    }
    reader.onerror = () => {
      setParseError('Failed to read file')
      toast.error('Failed to read file')
    }
    reader.readAsText(file)

    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleImport(): void {
    if (!parsed || varCount === 0) {
      toast.warning('No variables could be parsed from this file')
      return
    }
    onImport(parsed)
    onClose()
  }

  const lines = content ? content.split('\n') : []
  const fmt = FORMAT_OPTIONS.find((f) => f.id === format)!

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
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
              <h2 className="text-base font-semibold text-white">Import Variables</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Supported formats: JSON, Key=Value, PowerShell, Bash
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── File picker + format row ─────────────────────────── */}
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-6 py-3">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".json,.env,.ps1,.sh,.txt"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Choose File
            </button>

            {fileName ? (
              <span className="min-w-0 truncate text-xs text-slate-400">{fileName}</span>
            ) : (
              <span className="text-xs text-slate-600">No file chosen</span>
            )}

            {/* Format selector (auto-detected, but user can override) */}
            {content && (
              <div className="ml-auto flex items-center gap-1">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setFormat(opt.id)}
                    title={opt.label}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition ${
                      format === opt.id
                        ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                        : 'text-slate-600 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {opt.icon}
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Code preview ────────────────────────────────────── */}
          <div className="min-h-0 flex-1 overflow-auto bg-slate-950">
            {!content ? (
              /* Empty state */
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-slate-600">
                <FolderOpen className="h-10 w-10 opacity-30" />
                <p className="text-sm">Choose a file to preview its contents</p>
              </div>
            ) : (
              <table className="w-full border-collapse font-mono text-xs leading-[1.6]">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="group hover:bg-white/[0.03]">
                      <td
                        className="select-none border-r border-slate-800 px-4 py-0 text-right text-slate-700 group-hover:text-slate-600"
                        style={{ width: '3.5rem', minWidth: '3.5rem' }}
                      >
                        {i + 1}
                      </td>
                      <td className="whitespace-pre px-4 py-0">
                        {tokenizeLine(line, format).map((tok, j) => (
                          <span key={j} className={tok.cls}>{tok.text}</span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Status bar ──────────────────────────────────────── */}
          {content && (
            <div className="flex shrink-0 items-center gap-2 border-t border-slate-800 bg-slate-900/50 px-6 py-2 text-xs">
              {parseError ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-red-400">{parseError}</span>
                </>
              ) : varCount > 0 ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">
                    {varCount} variable{varCount !== 1 ? 's' : ''} detected
                  </span>
                  <span className="ml-1 text-slate-600">
                    as <span className="text-slate-400">{fmt.label}</span>
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-amber-400">No variables detected — try a different format</span>
                </>
              )}
            </div>
          )}

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parsed || varCount === 0}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Import {varCount > 0 ? `${varCount} variable${varCount !== 1 ? 's' : ''}` : ''}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
