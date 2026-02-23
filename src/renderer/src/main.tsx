import './assets/main.css'
import './i18n'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ThemeToaster } from './components/ThemeToaster'
import { TooltipPrimitive } from './components/ui/Tooltip'
import { initTheme } from './lib/theme'

initTheme()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipPrimitive.Provider delayDuration={500} skipDelayDuration={100}>
        <App />
        <ThemeToaster />
      </TooltipPrimitive.Provider>
    </QueryClientProvider>
  </StrictMode>
)
