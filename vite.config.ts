import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Treat src/renderer as the root so index.html and /src/* resolve correctly.
  root: resolve(__dirname, 'src/renderer'),

  plugins: [react(), tailwindcss()],

  resolve: {
    // Keep in sync with tsconfig.json "paths" for IDE and build
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },

  // Prevent Vite from clearing the screen so Tauri CLI output is visible.
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Watch Rust source files so a Tauri rebuild is triggered automatically.
      ignored: ['**/src-tauri/**']
    }
  },

  build: {
    // Tauri supports ES2021+.
    target: ['es2021', 'chrome105', 'safari13'],
    // Don't minify for debug builds; Tauri will handle release minification.
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-motion': ['framer-motion'],
          'vendor-tauri': [
            '@tauri-apps/api',
            '@tauri-apps/plugin-shell',
            '@tauri-apps/plugin-store'
          ],
          'vendor-query': ['@tanstack/react-query', 'zustand'],
          'vendor-ui': [
            'lucide-react',
            'react-resizable-panels',
            'sonner',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-tooltip'
          ]
        }
      }
    }
  }
})
