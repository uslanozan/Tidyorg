import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // GitHub's OAuth endpoints (github.com/login/*) do not send CORS headers, meaning
    // they cannot be called directly from the browser. In dev, the Vite proxy handles
    // this path; in prod, hosting rewrites (vercel.json / public/_redirects) do so.
    // Thus the dashboard remains backend-less: no server code is running.
    proxy: {
      '/gh-oauth': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gh-oauth/, ''),
      },
    },
  },
})
