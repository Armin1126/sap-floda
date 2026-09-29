import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/health': {
        target: 'http://localhost:4004',
        changeOrigin: true
      },
      '/api/ranking': {
        target: 'http://localhost:4004',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/ranking/, '/odata/v4/ranking')
      },
      '/api': {
        target: 'http://localhost:4004',
        changeOrigin: true
      }
    }
  }
})
