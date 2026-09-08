import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // GitHub'ın OAuth uçları (github.com/login/*) CORS başlığı göndermez, yani
    // tarayıcıdan doğrudan çağrılamaz. Dev'de Vite proxy'si, prod'da hosting
    // rewrite'ı (vercel.json / public/_redirects) aynı yolu üstlenir.
    // Böylece dashboard hâlâ backend-less: çalışan bir sunucu kodu yok.
    proxy: {
      '/gh-oauth': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gh-oauth/, ''),
      },
    },
  },
})
