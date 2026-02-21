import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: [
        { find: '@renderer', replacement: path.resolve(__dirname, 'src/renderer/src') },
        { find: '@resources', replacement: path.resolve(__dirname, 'resources') }
      ]
    },
    plugins: [react(), tailwindcss()]
  }
})
