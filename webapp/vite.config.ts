import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH ?? '/progym/',
  server: {
    proxy: {
      '/progym-api': {
        target: 'https://tavrostechinfo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/progym-api/, '/PROGYM/ggs/api'),
        secure: true,
      },
      '/progym-media': {
        target: 'https://tavrostechinfo.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/progym-media/, '/PROGYM/ggs'),
        secure: true,
      },
    },
  },
})
