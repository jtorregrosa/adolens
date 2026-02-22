import { useState } from 'react'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import appIcon from '@resources/icon.png'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import { saveCredentials, clearCredentials, getProjects } from '../../lib/api'

export function LoginScreen(): React.JSX.Element {
  const [orgUrl, setOrgUrl] = useState('')
  const [pat, setPat] = useState('')
  const [showPat, setShowPat] = useState(false)
  const [loading, setLoading] = useState(false)
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated)

  const handleLogin = async (): Promise<void> => {
    if (!orgUrl.trim() || !pat.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    const normalizedUrl = orgUrl.trim().replace(/\/$/, '')
    setLoading(true)

    try {
      await saveCredentials(normalizedUrl, pat.trim())
      await getProjects()
      setAuthenticated(normalizedUrl)
      toast.success('Connected successfully')
    } catch (err) {
      await clearCredentials()
      toast.error(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md px-8"
      >
        {/* Logo / Header */}
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/80 ring-1 ring-slate-700/50">
            <img src={appIcon} alt="" className="h-10 w-10 select-none" draggable={false} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ADOLens</h1>
          <p className="mt-2 text-sm text-slate-400">
            Azure DevOps Variable Group Comparison Tool
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5 rounded-2xl bg-slate-900 p-8 ring-1 ring-slate-700/50">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Organization URL
            </label>
            <input
              type="url"
              value={orgUrl}
              onChange={(e) => setOrgUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://dev.azure.com/your-org"
              className="selectable w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••••••••••••••"
                className="selectable w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
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
              Requires Read &amp; Write access on Variable Groups (Library scope)
            </p>
          </div>

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
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Your PAT is stored securely in the OS keychain
        </p>
      </motion.div>
    </div>
  )
}
