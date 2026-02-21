import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from './store/authStore'
import { useUIStore } from './store/uiStore'
import { LoginScreen } from './components/auth/LoginScreen'
import { ResizableLayout } from './components/layout/ResizableLayout'

function App(): React.JSX.Element {
  const { isAuthenticated, setAuthenticated } = useAuthStore()
  const { loadFavorites } = useUIStore()

  // Auto-load persisted credentials on startup
  useEffect(() => {
    window.api.loadCredentials().then((result) => {
      if (result.ok && result.orgUrl) {
        setAuthenticated(result.orgUrl)
      }
    })
  }, [setAuthenticated])

  // Hydrate favorites from electron-store
  useEffect(() => {
    window.api.loadFavorites().then((result) => {
      if (result.ok) {
        loadFavorites(result.favoriteProjectIds, result.favoriteLibraryIds)
      }
    })
  }, [loadFavorites])

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950">
      <AnimatePresence mode="wait">
        {isAuthenticated ? (
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
