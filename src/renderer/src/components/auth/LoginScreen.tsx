import appIcon from '@renderer/assets/icon.png'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, LogIn, Shield, ShieldOff } from 'lucide-react'
import { useState } from 'react'
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
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated)
  const { orgUrlHistory, addOrgUrlToHistory } = useSettingsStore()

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

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <TitleBar />
      <div className="flex flex-1 items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md px-8"
        >
          {/* Logo / Header */}
          <div className="mb-10 text-center">
            <img
              src={appIcon}
              alt=""
              className="mb-4 inline-block h-32 w-32 select-none"
              draggable={false}
            />
            <h1 className="text-3xl font-bold tracking-tight text-white">{t('app.name')}</h1>
            <p className="mt-2 text-sm text-slate-400">{t('login.subtitle')}</p>
          </div>

          {/* Form */}
          <div className="space-y-5 rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-700/50">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                {t('login.orgUrl')}
              </label>
              <input
                type="url"
                list="org-url-history"
                value={orgUrl}
                onChange={(e) => setOrgUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('login.orgUrlPlaceholder')}
                className="selectable w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {orgUrlHistory.length > 0 && (
                <datalist id="org-url-history">
                  {orgUrlHistory.map((url) => (
                    <option key={url} value={url} />
                  ))}
                </datalist>
              )}
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
                  onKeyDown={handleKeyDown}
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
              <p className="mt-1.5 text-xs text-slate-500">{t('login.patHint')}</p>
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
    </div>
  )
}
