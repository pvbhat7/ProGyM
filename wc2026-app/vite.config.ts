import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/wc2026/',
  server: {
    port: 5180,
    proxy: {
      '/progym-api': {
        target: 'https://tavrostechinfo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/progym-api/, '/PROGYM/ggs/api'),
        secure: true,
      },
    },
  },
})
