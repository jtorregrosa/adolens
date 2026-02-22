import { Braces, Hash, List, Terminal } from 'lucide-react'
import type { AdoVariable } from '../../types'

// ─── Format types ─────────────────────────────────────────────────────────────

export type ExportFormat = 'json' | 'keyvalue' | 'powershell' | 'bash'

export interface FormatOption {
  id: ExportFormat
  label: string
  ext: string
  icon: React.ReactNode
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'json', label: 'JSON', ext: 'json', icon: <Braces className="h-3.5 w-3.5" /> },
  { id: 'keyvalue', label: 'Key=Value', ext: 'env', icon: <List className="h-3.5 w-3.5" /> },
  { id: 'powershell', label: 'PowerShell', ext: 'ps1', icon: <Terminal className="h-3.5 w-3.5" /> },
  { id: 'bash', label: 'Bash', ext: 'sh', icon: <Hash className="h-3.5 w-3.5" /> }
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
      return entries.map(([k, v]) => `$env:${k} = "${val(v).replace(/"/g, '`"')}"`).join('\n')
    case 'bash':
      return entries.map(([k, v]) => `export ${k}="${val(v).replace(/"/g, '\\"')}"`).join('\n')
  }
}

// ─── Syntax highlighter ──────────────────────────────────────────────────────

export type Token = { text: string; cls: string }

export const T = {
  punct: 'text-slate-500',
  key: 'text-blue-300',
  str: 'text-emerald-300',
  secret: 'text-slate-500 italic',
  num: 'text-amber-300',
  bool: 'text-orange-400',
  kw: 'text-purple-400',
  op: 'text-slate-500',
  plain: 'text-slate-300'
}

function isSecret(text: string): boolean {
  return text === SECRET_MASK
}

function highlightJSON(line: string): Token[] {
  const keyValMatch = line.match(
    /^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)("(?:[^"\\]|\\.)*"|-?\d[\d.eE+-]*|true|false|null)(,?)$/
  )
  if (keyValMatch) {
    const [, indent, rawKey, colon, rawValue, comma] = keyValMatch
    const unquotedVal = rawValue.startsWith('"') ? rawValue.slice(1, -1) : rawValue
    const valCls = rawValue.startsWith('"')
      ? isSecret(unquotedVal)
        ? T.secret
        : T.str
      : rawValue === 'true' || rawValue === 'false' || rawValue === 'null'
        ? T.bool
        : T.num
    return [
      { text: indent, cls: T.plain },
      { text: rawKey, cls: T.key },
      { text: colon, cls: T.op },
      { text: rawValue, cls: valCls },
      { text: comma, cls: T.punct }
    ]
  }
  const strOnlyMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(,?)$/)
  if (strOnlyMatch) {
    const [, indent, rawStr, comma] = strOnlyMatch
    const inner = rawStr.slice(1, -1)
    return [
      { text: indent, cls: T.plain },
      { text: rawStr, cls: isSecret(inner) ? T.secret : T.str },
      { text: comma, cls: T.punct }
    ]
  }
  return line.split('').map((ch) => ({
    text: ch,
    cls: '{}[],'.includes(ch) ? T.punct : T.plain
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
    { text: v, cls: isSecret(v) ? T.secret : T.str }
  ]
}

function highlightPowershell(line: string): Token[] {
  const m = line.match(/^(\$env:)([^=\s]+)(\s*=\s*)(")(.*)(")$/)
  if (!m) return [{ text: line, cls: T.plain }]
  const [, prefix, key, eq, q1, val, q2] = m
  return [
    { text: prefix, cls: T.kw },
    { text: key, cls: T.key },
    { text: eq, cls: T.op },
    { text: q1, cls: T.punct },
    { text: val, cls: isSecret(val) ? T.secret : T.str },
    { text: q2, cls: T.punct }
  ]
}

function highlightBash(line: string): Token[] {
  const m = line.match(/^(export )([^=]+)(=)(")(.*)(")$/)
  if (!m) return [{ text: line, cls: T.plain }]
  const [, kw, key, eq, q1, val, q2] = m
  return [
    { text: kw, cls: T.kw },
    { text: key, cls: T.key },
    { text: eq, cls: T.op },
    { text: q1, cls: T.punct },
    { text: val, cls: isSecret(val) ? T.secret : T.str },
    { text: q2, cls: T.punct }
  ]
}

export function tokenizeLine(line: string, format: ExportFormat): Token[] {
  if (!line.trim()) return [{ text: line || ' ', cls: T.plain }]
  switch (format) {
    case 'json':
      return highlightJSON(line)
    case 'keyvalue':
      return highlightKeyValue(line)
    case 'powershell':
      return highlightPowershell(line)
    case 'bash':
      return highlightBash(line)
  }
}
