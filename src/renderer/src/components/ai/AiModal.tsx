import { AnimatePresence, motion } from 'framer-motion'
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  WifiOff,
  X
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import { aiChat, aiCheckModel, aiCheckOllama } from '../../lib/api'
import type { AiMessage } from '../../store/aiStore'
import { useAiStore } from '../../store/aiStore'
import { useSettingsStore } from '../../store/settingsStore'

// ─── Markdown renderer (shared) ────────────────────────────────────────────────

const mdComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-1.5 list-disc space-y-0.5 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-1.5 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  code: ({ children }) => (
    <code className="rounded bg-slate-700 px-1 py-0.5 font-mono text-xs text-slate-200">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-1.5 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-300">
      {children}
    </pre>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
  hr: () => <hr className="my-2 border-slate-700" />
}

// ─── Tool call badge ───────────────────────────────────────────────────────────

const TOOL_LABEL_KEYS: Record<string, string> = {
  list_projects: 'ai.toolListingProjects',
  list_variable_groups: 'ai.toolListingLibraries',
  get_variable_group: 'ai.toolFetchingLibrary'
}

function ToolCallBadge({
  name,
  args,
  live
}: {
  name: string
  args: Record<string, unknown>
  live?: boolean
}): React.JSX.Element {
  const { t } = useTranslation()
  const labelKey = TOOL_LABEL_KEYS[name]
  const label = labelKey ? t(labelKey) : name

  const detail =
    name === 'list_variable_groups'
      ? `project: ${args.project_id ?? '...'}`
      : name === 'get_variable_group'
        ? `id: ${args.group_id ?? '...'}`
        : undefined

  return (
    <div
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${
        live
          ? 'border border-blue-700/40 bg-blue-900/30 text-blue-300'
          : 'border border-slate-700/40 bg-slate-800/60 text-slate-500'
      }`}
    >
      {live ? (
        <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
      ) : (
        <Sparkles className="h-2.5 w-2.5 shrink-0" />
      )}
      <span>{label}</span>
      {detail && <span className="text-slate-600">({detail})</span>}
    </div>
  )
}

// ─── Copy context menu ─────────────────────────────────────────────────────────

function CopyContextMenu({
  x,
  y,
  onClose,
  onCopy
}: {
  x: number
  y: number
  onClose: () => void
  onCopy: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', key)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[140px] rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        onClick={() => {
          onCopy()
          onClose()
        }}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-700"
      >
        <Copy className="h-3.5 w-3.5 shrink-0" />
        {t('ai.copy')}
      </button>
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: AiMessage }): React.JSX.Element {
  const { t } = useTranslation()
  const [toolsOpen, setToolsOpen] = useState(false)
  const isUser = msg.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] space-y-1.5 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}
      >
        {/* Tool calls summary (assistant only) */}
        {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setToolsOpen((o) => !o)}
              className="flex items-center gap-1 text-[10px] text-slate-600 hover:text-slate-400 transition"
            >
              {toolsOpen ? (
                <ChevronUp className="h-2.5 w-2.5" />
              ) : (
                <ChevronDown className="h-2.5 w-2.5" />
              )}
              {t('ai.toolCallCount', { count: msg.toolCalls.length })}
            </button>
            <AnimatePresence>
              {toolsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-1 flex flex-wrap gap-1 overflow-hidden"
                >
                  {msg.toolCalls.map((tc, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    <ToolCallBadge key={i} name={tc.name} args={tc.args} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'rounded-tr-sm bg-blue-600 text-white'
              : 'rounded-tl-sm bg-slate-800 text-slate-200'
          }`}
        >
          {isUser ? (
            msg.content
          ) : (
            <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Active tool calls indicator ───────────────────────────────────────────────

function ActiveToolCalls(): React.JSX.Element {
  const activeToolCalls = useAiStore((s) => s.activeToolCalls)

  if (activeToolCalls.length === 0) return <></>

  return (
    <div className="flex justify-start px-1">
      <div className="max-w-[85%] space-y-1">
        <div className="flex flex-wrap gap-1">
          {activeToolCalls.map((tc, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral live list
            <ToolCallBadge key={i} name={tc.name} args={tc.args} live />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Not-setup placeholder ─────────────────────────────────────────────────────

function NotSetupPlaceholder({
  onOpenSettings
}: {
  onOpenSettings: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
        <Bot className="h-7 w-7 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-300">{t('ai.notEnabled')}</p>
        <p className="mt-1 text-xs text-slate-500">{t('ai.notEnabledHint')}</p>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
      >
        <Settings className="h-3.5 w-3.5" />
        {t('ai.openSettings')}
      </button>
    </div>
  )
}

// ─── Ollama-not-running placeholder ────────────────────────────────────────────

function OllamaOfflinePlaceholder({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
        <WifiOff className="h-7 w-7 text-slate-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-300">{t('ai.ollamaOffline')}</p>
        <p className="mt-1 text-xs text-slate-500">{t('ai.ollamaOfflineHint')}</p>
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-block text-xs text-blue-400 underline hover:text-blue-300"
        >
          ollama.com ↗
        </a>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
      >
        {t('ai.retry')}
      </button>
    </div>
  )
}

// ─── Model-missing placeholder ──────────────────────────────────────────────────

function ModelMissingPlaceholder({
  model,
  onOpenSettings
}: {
  model: string
  onOpenSettings: () => void
}): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 ring-1 ring-slate-700">
        <Bot className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-300">{t('ai.modelMissing')}</p>
        <p className="mt-1 text-xs text-slate-500">{t('ai.modelMissingHint', { model })}</p>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
      >
        <Settings className="h-3.5 w-3.5" />
        {t('ai.openSettings')}
      </button>
    </div>
  )
}

// ─── Main modal ────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void
  onOpenSettings: () => void
}

type ReadinessState = 'checking' | 'ready' | 'no-ollama' | 'no-model'

export function AiModal({ onClose, onOpenSettings }: Props): React.JSX.Element {
  const { t } = useTranslation()
  const { aiEnabled, aiModel } = useSettingsStore()
  const {
    messages,
    isLoading,
    activeToolCalls,
    addMessage,
    setLoading,
    pushToolCall,
    clearActiveToolCalls,
    clearMessages,
    clearStreaming
  } = useAiStore()

  const [readiness, setReadiness] = useState<ReadinessState>('checking')
  const [input, setInput] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleCopyFromSelection = useCallback(() => {
    const text = window.getSelection()?.toString() ?? ''
    if (text) {
      void navigator.clipboard.writeText(text)
    }
  }, [])

  // Check Ollama + model on open
  // biome-ignore lint/correctness/useExhaustiveDependencies: checkReadiness is stable
  useEffect(() => {
    if (!aiEnabled) return
    checkReadiness()
  }, [aiEnabled])

  // Auto-scroll on new messages / tool call updates
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — scroll on content change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, activeToolCalls.length])

  // Sync textarea height and overflow when input is set programmatically (e.g. suggestion click)
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync height/overflow when input state changes
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const maxH = 120
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [input])

  async function checkReadiness() {
    setReadiness('checking')
    const ok = await aiCheckOllama()
    if (!ok) {
      setReadiness('no-ollama')
      return
    }
    const present = await aiCheckModel(aiModel).catch(() => false)
    setReadiness(present ? 'ready' : 'no-model')
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    const userMsg: AiMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text
    }
    addMessage(userMsg)
    setLoading(true)
    clearActiveToolCalls()

    const { listen } = await import('@tauri-apps/api/event')
    const unlisten = await listen<{ toolName: string; args: Record<string, unknown> }>(
      'ai:tool-call',
      (event) => {
        pushToolCall({ name: event.payload.toolName, args: event.payload.args })
      }
    )

    try {
      const history = messages.concat(userMsg).map((m) => ({ role: m.role, content: m.content }))
      const reply = await aiChat(history, aiModel)

      const toolCallsCopy = useAiStore.getState().activeToolCalls.slice()
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply.content ?? '',
        toolCalls: toolCallsCopy.length > 0 ? toolCallsCopy : undefined
      })
    } catch (e) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `${t('ai.errorPrefix')}: ${e instanceof Error ? e.message : String(e)}`
      })
    } finally {
      unlisten()
      clearActiveToolCalls()
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleResetContext() {
    clearMessages()
    clearActiveToolCalls()
    clearStreaming()
    setLoading(false)
    setContextMenu(null)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <motion.div
          key="ai-panel"
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="ai-modal-panel mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl"
          style={{ height: 600 }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-800/60">
                <span className="ai-modal-title-icon" aria-hidden />
              </div>
              <span className="text-sm font-semibold text-slate-200">{t('ai.title')}</span>
              {readiness === 'ready' && (
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {aiModel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {readiness === 'ready' && (messages.length > 0 || isLoading) && (
                <button
                  type="button"
                  onClick={handleResetContext}
                  disabled={isLoading}
                  title={t('ai.resetContext')}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!aiEnabled ? (
            <NotSetupPlaceholder
              onOpenSettings={() => {
                onClose()
                onOpenSettings()
              }}
            />
          ) : readiness === 'checking' ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
            </div>
          ) : readiness === 'no-ollama' ? (
            <OllamaOfflinePlaceholder onRetry={checkReadiness} />
          ) : readiness === 'no-model' ? (
            <ModelMissingPlaceholder
              model={aiModel}
              onOpenSettings={() => {
                onClose()
                onOpenSettings()
              }}
            />
          ) : (
            <>
              {/* Preview & local disclaimer */}
              <div className="ai-modal-disclaimer shrink-0 border-b border-slate-800/80 bg-slate-800/40 px-4 py-2 text-center">
                <p className="text-[11px] text-amber-400/90">{t('ai.previewWarning')}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{t('ai.localDisclaimer')}</p>
              </div>
              {/* Messages (selectable; Ctrl+C and context menu to copy) */}
              <div className="ai-chat-scroll-wrap ai-chat-bg relative flex min-h-0 flex-1 pr-3">
                <div
                  ref={scrollRef}
                  className="ai-chat-scroll select-text relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3"
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setContextMenu({ x: e.clientX, y: e.clientY })
                  }}
                >
                  {messages.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                      <Sparkles className="h-8 w-8 text-slate-700" />
                      <p className="text-sm text-slate-500">{t('ai.emptyHint')}</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-1">
                        {(t('ai.suggestions', { returnObjects: true }) as string[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setInput(s)}
                            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}

                  {/* Live tool-call badges during inference */}
                  {isLoading && activeToolCalls.length > 0 && <ActiveToolCalls />}

                  {/* Thinking dots while waiting for the model */}
                  {isLoading && activeToolCalls.length === 0 && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-slate-800 px-4 py-3">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}
                </div>
                {contextMenu && (
                  <CopyContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onCopy={handleCopyFromSelection}
                  />
                )}
              </div>

              {/* Input area */}
              <div className="shrink-0 border-t border-slate-800 px-4 py-3">
                <div className="flex items-stretch gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder={t('ai.inputPlaceholder')}
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 outline-none transition focus:border-blue-600 disabled:opacity-50"
                    style={{ maxHeight: 120, overflowY: 'hidden' }}
                    onInput={(e) => {
                      const el = e.currentTarget
                      const maxH = 120
                      el.style.height = 'auto'
                      el.style.height = `${Math.min(el.scrollHeight, maxH)}px`
                      el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
                    }}
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="flex min-w-9 shrink-0 items-center justify-center self-stretch rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:opacity-40"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-700">{t('ai.inputHint')}</p>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
