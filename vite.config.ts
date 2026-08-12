import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            const cl = req.headers['content-length']
            console.log(`[proxy] → ${req.method} ${req.url}  cl=${cl ?? '?'} target=${options.target}`)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`[proxy] ← ${req.method} ${req.url}  status=${proxyRes.statusCode}`)
          })
          proxy.on('error', (err, req, _res) => {
            console.error(`[proxy] ✗ ERROR ${req.method} ${req.url}: ${err.name} ${err.message}`)
          })
          proxy.on('close', (_proxyReq, _proxySocket, _serverSocket) => {
            console.log(`[proxy] ⏹ CLOSE upstream socket`)
          })
        },
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
      },
      '/public/files': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
      },
      '/public/files': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        proxyTimeout: 20 * 60 * 1000,
        timeout: 20 * 60 * 1000,
      },
    },
  },
})
