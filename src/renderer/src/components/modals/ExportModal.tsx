import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Download, Check, Braces, List, Terminal, Hash } from 'lucide-react'
import { toast } from 'sonner'
import type { AdoVariable } from '../../types'

// ─── Formats ─────────────────────────────────────────────────────────────────

export type ExportFormat = 'json' | 'keyvalue' | 'powershell' | 'bash'

interface FormatOption {
  id: ExportFormat
  label: string
  ext: string
  icon: React.ReactNode
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'json',       label: 'JSON',       ext: 'json', icon: <Braces   className="h-3.5 w-3.5" /> },
  { id: 'keyvalue',   label: 'Key=Value',  ext: 'env',  icon: <List     className="h-3.5 w-3.5" /> },
  { id: 'powershell', label: 'PowerShell', ext: 'ps1',  icon: <Terminal className="h-3.5 w-3.5" /> },
  { id: 'bash',       label: 'Bash',       ext: 'sh',   icon: <Hash     className="h-3.5 w-3.5" /> },
]

const SECRET_MASK = '***'

/** Serialize all variables; secrets appear with *** as their value. */
export function serializeVariables(
  variables: Record<string, AdoVariable>,
  format: ExportFormat
): string {
  const entries = Object.entries(variables)
  const val = (v: AdoVariable): string => (v.isSecret ? SECRET_MASK : (v.value ?? ''))

  switch (format) {
    case 'json': {
      const obj: Record<string, string> = {}
      for (const [k, v] of entries) obj[k] = val(v)
      return JSON.stringify(obj, null, 2)
    }
    case 'keyvalue':
      return entries.map(([k, v]) => `${k}=${val(v)}`).join('\n')
    case 'powershell':
      return entries
        .map(([k, v]) => `$env:${k} = "${val(v).replace(/"/g, '`"')}"`)
        .join('\n')
    case 'bash':
      return entries
        .map(([k, v]) => `export ${k}="${val(v).replace(/"/g, '\\"')}"`)
        .join('\n')
  }
}

/** Plain-text version for clipboard/file — secrets excluded. */
function serializeForExport(
  variables: Record<string, AdoVariable>,
  format: ExportFormat
): string {
  const entries = Object.entries(variables)
  const val = (v: AdoVariable): string => (v.isSecret ? SECRET_MASK : (v.value ?? ''))

  switch (format) {
    case 'json': {
      const obj: Record<string, string> = {}
      for (const [k, v] of entries) obj[k] = val(v)
      return JSON.stringify(obj, null, 2)
    }
    case 'keyvalue':
      return entries.map(([k, v]) => `${k}=${val(v)}`).join('\n')
    case 'powershell':
      return entries
        .map(([k, v]) => `$env:${k} = "${val(v).replace(/"/g, '`"')}"`)
        .join('\n')
    case 'bash':
      return entries
        .map(([k, v]) => `export ${k}="${val(v).replace(/"/g, '\\"')}"`)
        .join('\n')
  }
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Syntax highlighter ──────────────────────────────────────────────────────

export type Token = { text: string; cls: string }

export const T = {
  punct:   'text-slate-500',
  key:     'text-blue-300',
  str:     'text-emerald-300',
  secret:  'text-slate-500 italic',
  num:     'text-amber-300',
  bool:    'text-orange-400',
  kw:      'text-purple-400',
  op:      'text-slate-500',
  plain:   'text-slate-300',
}

function isSecret(text: string): boolean {
  return text === SECRET_MASK
}

function highlightJSON(line: string): Token[] {
  // e.g.   "KEY": "VALUE",   OR  {  }  ,
  const keyValMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)("(?:[^"\\]|\\.)*"|-?\d[\d.eE+\-]*|true|false|null)(,?)$/)
  if (keyValMatch) {
    const [, indent, rawKey, colon, rawValue, comma] = keyValMatch
    const unquotedVal = rawValue.startsWith('"') ? rawValue.slice(1, -1) : rawValue
    const valCls = rawValue.startsWith('"')
      ? (isSecret(unquotedVal) ? T.secret : T.str)
      : (rawValue === 'true' || rawValue === 'false' || rawValue === 'null') ? T.bool : T.num
    return [
      { text: indent, cls: T.plain },
      { text: rawKey, cls: T.key },
      { text: colon, cls: T.op },
      { text: rawValue, cls: valCls },
      { text: comma, cls: T.punct },
    ]
  }
  // standalone string line (first/last line value)
  const strOnlyMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(,?)$/)
  if (strOnlyMatch) {
    const [, indent, rawStr, comma] = strOnlyMatch
    const inner = rawStr.slice(1, -1)
    return [
      { text: indent, cls: T.plain },
      { text: rawStr, cls: isSecret(inner) ? T.secret : T.str },
      { text: comma, cls: T.punct },
    ]
  }
  // fallback: colorize { } , individually
  return line.split('').map((ch) => ({
    text: ch,
    cls: '{}[],'.includes(ch) ? T.punct : T.plain,
  }))
}

function highlightKeyValue(line: string): Token[] {
  const eq = line.indexOf('=')
  if (eq === -1) return [{ text: line, cls: T.plain }]
  const k = line.slice(0, eq)
  const v = line.slice(eq + 1)
  return [
    { text: k, cls: T.key },
    { text: '=', cls: T.op },
    { text: v, cls: isSecret(v) ? T.secret : T.str },
  ]
}

function highlightPowershell(line: string): Token[] {
  // $env:KEY = "VALUE"
  const m = line.match(/^(\$env:)([^=\s]+)(\s*=\s*)(")(.*)(")$/)
  if (!m) return [{ text: line, cls: T.plain }]
  const [, prefix, key, eq, q1, val, q2] = m
  return [
    { text: prefix, cls: T.kw },
    { text: key, cls: T.key },
    { text: eq, cls: T.op },
    { text: q1, cls: T.punct },
    { text: val, cls: isSecret(val) ? T.secret : T.str },
    { text: q2, cls: T.punct },
  ]
}

function highlightBash(line: string): Token[] {
  // export KEY="VALUE"
  const m = line.match(/^(export )([^=]+)(=)(")(.*)(")$/)
  if (!m) return [{ text: line, cls: T.plain }]
  const [, kw, key, eq, q1, val, q2] = m
  return [
    { text: kw, cls: T.kw },
    { text: key, cls: T.key },
    { text: eq, cls: T.op },
    { text: q1, cls: T.punct },
    { text: val, cls: isSecret(val) ? T.secret : T.str },
    { text: q2, cls: T.punct },
  ]
}

export function tokenizeLine(line: string, format: ExportFormat): Token[] {
  if (!line.trim()) return [{ text: line || ' ', cls: T.plain }]
  switch (format) {
    case 'json':       return highlightJSON(line)
    case 'keyvalue':   return highlightKeyValue(line)
    case 'powershell': return highlightPowershell(line)
    case 'bash':       return highlightBash(line)
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  variables: Record<string, AdoVariable>
  groupName?: string | null
  onClose: () => void
}

export function ExportModal({ variables, groupName, onClose }: Props): React.JSX.Element {
  const [format, setFormat] = useState<ExportFormat>('json')
  const [copied, setCopied] = useState(false)

  const content = useMemo(() => serializeVariables(variables, format), [variables, format])
  const lines = content.split('\n')
  const fmt = FORMAT_OPTIONS.find((f) => f.id === format)!
  const baseName = groupName ? groupName.replace(/[^a-zA-Z0-9_-]/g, '_') : 'variables'
  const totalCount = Object.keys(variables).length
  const secretCount = Object.values(variables).filter((v) => v.isSecret).length

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(serializeForExport(variables, format))
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave(): void {
    downloadText(serializeForExport(variables, format), `${baseName}.${fmt.ext}`)
    toast.success(`Saved as ${baseName}.${fmt.ext}`)
  }

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
              <h2 className="text-base font-semibold text-white">Export Variables</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {totalCount} variable(s)
                {secretCount > 0 && (
                  <span className="ml-1 text-slate-600">({secretCount} secret, shown as ***)</span>
                )}
                {groupName && <> — <span className="text-slate-400">{groupName}</span></>}
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
                <span className={`font-mono ${format === opt.id ? 'text-blue-600' : 'text-slate-700'}`}>
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
                        <span key={j} className={tok.cls}>{tok.text}</span>
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
              Close
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
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              Save File
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

