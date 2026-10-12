import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const useHttps = (process.env.VITE_DEV_HTTPS ?? env.VITE_DEV_HTTPS) !== 'false'
  return {
    plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://127.0.0.1:5000',
          changeOrigin: true,
        }
      }
    }
  }
})
