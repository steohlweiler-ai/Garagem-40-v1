import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3001,
  },
  build: {
    target: 'es2019',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2019',
    },
  },
})

