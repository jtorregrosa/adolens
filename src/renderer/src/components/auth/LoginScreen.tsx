import appIcon from '@renderer/assets/icon.png'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Eye, EyeOff, Loader2, LogIn, Shield, ShieldOff, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { clearCredentials, getProjects, saveCredentials } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { TitleBar } from '../layout/TitleBar'

export function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation()
  const [orgUrl, setOrgUrl] = useState('')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [rememberToken, setRememberToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [patModalOpen, setPatModalOpen] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated)
  const { orgUrlHistory, addOrgUrlToHistory } = useSettingsStore()

  const filteredHistory = orgUrlHistory.filter((url) =>
    url.toLowerCase().includes(orgUrl.trim().toLowerCase())
  )

  useEffect(() => {
    if (!comboOpen) setHighlightedIndex(-1)
    else setHighlightedIndex(filteredHistory.length > 0 ? 0 : -1)
  }, [comboOpen, filteredHistory.length])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (comboRef.current && !comboRef.current.contains(event.target as Node)) {
        setComboOpen(false)
      }
    }
    if (comboOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [comboOpen])

  const handleLogin = async (): Promise<void> => {
    if (!orgUrl.trim() || !pat.trim()) {
      toast.error(t('login.toast.missingFields'))
      return
    }

    const normalizedUrl = orgUrl.trim().replace(/\/$/, '')
    setLoading(true)

    try {
      await saveCredentials(normalizedUrl, pat.trim(), rememberToken)
      await getProjects()
      addOrgUrlToHistory(normalizedUrl)
      setAuthenticated(normalizedUrl)
      toast.success(t('login.toast.success'))
    } catch (err) {
      await clearCredentials()
      toast.error(
        t('login.toast.error', { message: err instanceof Error ? err.message : String(err) })
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFormKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !comboOpen) handleLogin()
  }

  const handleComboKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') {
      setComboOpen(false)
      return
    }
    if (e.key === 'Enter') {
      if (comboOpen && highlightedIndex >= 0 && filteredHistory[highlightedIndex]) {
        e.preventDefault()
        setOrgUrl(filteredHistory[highlightedIndex])
        setComboOpen(false)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!comboOpen) setComboOpen(true)
      else setHighlightedIndex((i) => (i < filteredHistory.length - 1 ? i + 1 : i))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (comboOpen) setHighlightedIndex((i) => (i > 0 ? i - 1 : -1))
      return
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-slate-950">
      {/* Subtle animated waves background — #9e5bdc, #fc8d33, #3dbccd */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="-100 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Wavy bands extended past viewBox so drift doesn’t clip — fluid fill */}
            <linearGradient
              id="login-wave-a-grad"
              x1="0"
              y1="500"
              x2="0"
              y2="580"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#9e5bdc" stopOpacity="0.22" />
              <stop offset="1" stopColor="#9e5bdc" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="login-wave-b-grad"
              x1="0"
              y1="580"
              x2="0"
              y2="660"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#fc8d33" stopOpacity="0.14" />
              <stop offset="1" stopColor="#fc8d33" stopOpacity="0" />
            </linearGradient>
            <linearGradient
              id="login-wave-c-grad"
              x1="0"
              y1="410"
              x2="0"
              y2="500"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#3dbccd" stopOpacity="0.18" />
              <stop offset="1" stopColor="#3dbccd" stopOpacity="0" />
            </linearGradient>
            <path
              id="login-wave-a"
              d="M-100 500 Q 50 450 200 500 T 500 500 T 800 500 T 1100 500 T 1400 500 L 1400 800 L -100 800 Z"
            />
            <path
              id="login-wave-b"
              d="M-100 580 Q 100 530 300 580 T 700 580 T 1100 580 T 1400 580 L 1400 800 L -100 800 Z"
            />
            <path
              id="login-wave-c"
              d="M-100 410 C 100 360 200 460 400 410 C 600 360 700 460 900 410 C 1100 360 1200 460 1400 410 L 1400 800 L -100 800 Z"
            />
            {/* Top-edge-only paths for 1px solid stroke */}
            <path
              id="login-wave-a-line"
              d="M-100 500 Q 50 450 200 500 T 500 500 T 800 500 T 1100 500 T 1400 500"
            />
            <path
              id="login-wave-b-line"
              d="M-100 580 Q 100 530 300 580 T 700 580 T 1100 580 T 1400 580"
            />
            <path
              id="login-wave-c-line"
              d="M-100 410 C 100 360 200 460 400 410 C 600 360 700 460 900 410 C 1100 360 1200 460 1400 410"
            />
          </defs>
          <g className="animate-login-wave-slow">
            <use href="#login-wave-a" fill="url(#login-wave-a-grad)" />
            <use
              href="#login-wave-a-line"
              fill="none"
              stroke="#9e5bdc"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="animate-login-wave-mid">
            <use href="#login-wave-b" fill="url(#login-wave-b-grad)" />
            <use
              href="#login-wave-b-line"
              fill="none"
              stroke="#fc8d33"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
          <g className="animate-login-wave-fast">
            <use href="#login-wave-c" fill="url(#login-wave-c-grad)" />
            <use
              href="#login-wave-c-line"
              fill="none"
              stroke="#3dbccd"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>
      </div>

      <TitleBar />
      <div className="relative flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md px-8"
        >
          {/* Logo / Header */}
          <div className="mb-10 text-center">
            <div className="login-logo-wrap mb-4 inline-block transition-[transform_400ms_ease-in-out,filter_400ms_ease-in-out] hover:scale-110 hover:[filter:drop-shadow(2px_-2px_6px_rgba(254,143,51,0.38))_drop-shadow(2px_2px_6px_rgba(58,181,196,0.38))_drop-shadow(-2px_0_6px_rgba(128,30,165,0.38))]">
              <img src={appIcon} alt="" className="h-32 w-32 select-none" draggable={false} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('app.name')}</h1>
            <p className="mt-2 text-sm text-slate-400">{t('login.subtitle')}</p>
          </div>

          {/* Form */}
          <div className="space-y-7 rounded-2xl bg-slate-900/40 p-8 text-center shadow-xl ring-1 ring-white/10 backdrop-blur-sm">
            <div ref={comboRef}>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                {t('login.orgUrl')}
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={orgUrl}
                  onChange={(e) => setOrgUrl(e.target.value)}
                  onFocus={() => orgUrlHistory.length > 0 && setComboOpen(true)}
                  onKeyDown={(e) => {
                    handleComboKeyDown(e)
                    handleFormKeyDown(e)
                  }}
                  placeholder={t('login.orgUrlPlaceholder')}
                  autoComplete="off"
                  className="selectable w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {orgUrlHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setComboOpen((o) => !o)}
                    className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-500 transition hover:text-slate-300"
                    aria-expanded={comboOpen}
                    aria-label={t('login.recentOrgs')}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${comboOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
                {comboOpen && orgUrlHistory.length > 0 && (
                  <div
                    className="absolute left-0 right-0 top-full z-10 mt-0.5 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl"
                    role="listbox"
                    aria-label={t('login.recentOrgs')}
                  >
                    {filteredHistory.length === 0 ? (
                      <div className="px-4 py-2.5 text-sm text-slate-500">
                        {t('login.noMatchingOrgs')}
                      </div>
                    ) : (
                      filteredHistory.map((url, i) => (
                        <button
                          key={url}
                          type="button"
                          role="option"
                          aria-selected={i === highlightedIndex}
                          onClick={() => {
                            setOrgUrl(url)
                            setComboOpen(false)
                          }}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          className={`w-full truncate px-4 py-2.5 text-left text-sm transition ${
                            i === highlightedIndex
                              ? 'bg-blue-600/30 text-blue-200'
                              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                          }`}
                        >
                          {url}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                {t('login.pat')}
              </label>
              <div className="relative">
                <input
                  type={showPat ? 'text' : 'password'}
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  onKeyDown={handleFormKeyDown}
                  placeholder="••••••••••••••••••••"
                  className="selectable w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 [&::-ms-reveal]:hidden [&::-webkit-contacts-auto-fill-button]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPat(!showPat)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPat ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {t('login.patInstructionPrefix')}
                <button
                  type="button"
                  onClick={() => setPatModalOpen(true)}
                  className="text-blue-400 underline decoration-blue-400/60 underline-offset-1 transition hover:text-blue-300 hover:decoration-blue-300"
                >
                  {t('login.patInstructionLink')}
                </button>
                {t('login.patInstructionSuffix')}
              </p>
            </div>

            {/* Remember token toggle */}
            <button
              type="button"
              onClick={() => setRememberToken((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 transition hover:bg-slate-800"
            >
              <div className="flex items-center gap-2.5">
                {rememberToken ? (
                  <Shield className="h-4 w-4 shrink-0 text-blue-400" />
                ) : (
                  <ShieldOff className="h-4 w-4 shrink-0 text-slate-500" />
                )}
                <span className="text-sm font-medium text-slate-300">
                  {t('login.rememberToken')}
                </span>
              </div>
              {/* Pill toggle */}
              <div
                className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${rememberToken ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${rememberToken ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </div>
            </button>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? t('login.connecting') : t('login.connect')}
            </button>
          </div>

          <p className="mt-6 text-center text-xs text-slate-600">
            {rememberToken ? t('login.patStored') : t('login.patStoredSession')}
          </p>
        </motion.div>
      </div>

      {/* PAT generation instructions modal — rendered outside max-w-md so it can use full width */}
      <AnimatePresence>
        {patModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPatModalOpen(false)
            }}
          >
            <motion.div
              key="pat-instruction-panel"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="mx-4 w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-700/50 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4 text-left">
                <h3 className="text-base font-semibold text-slate-100">
                  {t('login.patModal.title')}
                </h3>
                <button
                  type="button"
                  onClick={() => setPatModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-left text-sm text-slate-300">
                <p className="mb-4">{t('login.patModal.intro')}</p>
                <h4 className="mb-2 font-medium text-slate-200">
                  {t('login.patModal.stepsTitle')}
                </h4>
                <ol className="mb-4 list-decimal space-y-1.5 pl-4">
                  <li>{t('login.patModal.step1')}</li>
                  <li>{t('login.patModal.step2')}</li>
                  <li>{t('login.patModal.step3')}</li>
                  <li>{t('login.patModal.step4')}</li>
                </ol>
                <h4 className="mb-2 font-medium text-slate-200">
                  {t('login.patModal.requiredPermissions')}
                </h4>
                <ul className="list-disc space-y-1.5 pl-4">
                  <li>{t('login.patModal.librariesPermission')}</li>
                  <li>{t('login.patModal.profilePermission')}</li>
                </ul>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
