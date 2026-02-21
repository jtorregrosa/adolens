import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import { SplashView } from './components/SplashView'
import { LoginScreen } from './components/auth/LoginScreen'
import { ResizableLayout } from './components/layout/ResizableLayout'

const SPLASH_MIN_MS = 5000

function App(): React.JSX.Element {
  const { isAuthenticated, setAuthenticated } = useAuthStore()
  const { loadFavorites } = useUIStore()
  const [showSplash, setShowSplash] = useState(true)

  // Load credentials and favorites, then hide splash after a minimum display time
  useEffect(() => {
    const start = Date.now()
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    Promise.all([
      window.api.loadCredentials().then((result) => {
        if (result.ok && result.orgUrl) {
          setAuthenticated(result.orgUrl)
        }
      }),
      window.api.loadFavorites().then((result) => {
        if (result.ok) {
          loadFavorites(result.favoriteProjectIds, result.favoriteLibraryIds)
        }
      })
    ]).finally(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, SPLASH_MIN_MS - elapsed)
      timeoutId = setTimeout(() => setShowSplash(false), remaining)
    })
    return () => { if (timeoutId !== undefined) clearTimeout(timeoutId) }
  }, [setAuthenticated, loadFavorites])

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
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
            <ResizableLayout />
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
            <LoginScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
