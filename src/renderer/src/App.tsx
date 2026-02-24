import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LoginScreen } from './components/auth/LoginScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ResizableLayout } from './components/layout/ResizableLayout'
import { SplashView } from './components/SplashView'
import { getUserProfile, loadCredentials, loadFavorites } from './lib/api'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'

const SPLASH_MIN_MS = 1000

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => useAuthStore.getState().isAuthenticated
  )
  const orgUrl = useAuthStore((s) => s.orgUrl)
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated)
  const setProfile = useAuthStore((s) => s.setProfile)
  const { loadFavorites: hydrateUiStore } = useUIStore()
  const [showSplash, setShowSplash] = useState(true)

  // Keep React state in sync with auth store so logout always triggers a re-render
  useEffect(() => {
    return useAuthStore.subscribe((state) => setIsAuthenticated(state.isAuthenticated))
  }, [])

  // Load credentials and favorites, then hide splash after a minimum display time
  useEffect(() => {
    const start = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    Promise.all([
      loadCredentials().then((creds) => {
        if (creds) {
          setAuthenticated(creds.orgUrl)
        }
      }),
      loadFavorites().then((result) => {
        if (result) {
          hydrateUiStore(result.projectIds, result.libraryIds)
        }
      })
    ]).finally(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed)
      timeoutId = setTimeout(() => setShowSplash(false), remaining)
    })

    return () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [setAuthenticated, hydrateUiStore])

  // Fetch user profile whenever authentication is established.
  useEffect(() => {
    if (!isAuthenticated) return
    getUserProfile()
      .then(setProfile)
      .catch((err) => {
        console.warn('[ADOLens] getUserProfile failed:', err)
        // Even on total failure show at least the org name extracted from the stored URL.
        const orgName =
          isAuthenticated && orgUrl
            ? orgUrl.replace(/^https?:\/\/dev\.azure\.com\//, '').split('/')[0] ||
              orgUrl.replace(/^https?:\/\//, '').split('.')[0]
            : ''
        setProfile({ displayName: '', email: '', avatarDataUrl: null, orgName })
      })
  }, [isAuthenticated, setProfile, orgUrl])

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-slate-950"
      onContextMenu={(e) => e.preventDefault()}
    >
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashView key="splash" />
        ) : isAuthenticated ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full"
          >
            <ErrorBoundary>
              <ResizableLayout />
            </ErrorBoundary>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="h-full w-full"
          >
            <ErrorBoundary>
              <LoginScreen />
            </ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
