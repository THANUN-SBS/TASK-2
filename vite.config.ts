import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy requests from /api to http://localhost:8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // Rewrite /api/servers to /servers
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})