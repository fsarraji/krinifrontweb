import process from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Dev local contre un backend distant : le navigateur parle au serveur Vite
  // (même origine, donc pas de CORS) qui relaie /api vers VITE_PROXY_TARGET.
  // Exemple dans .env.local : VITE_API_URL=/api/ et VITE_PROXY_TARGET=https://...
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET

  return {
    plugins: [react()],
    server: proxyTarget
      ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true, secure: true } } }
      : undefined,
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // Leaflet n'est utilisé que par /gps -> chunk séparé, chargé à la demande
            if (id.includes('leaflet')) return 'leaflet';
            if (id.includes('react-select')) return 'react-select';
            // Bibliothèques partagées, chargées une fois et mises en cache
            if (id.includes('react') || id.includes('react-router') || id.includes('axios')) return 'vendor';
            return undefined;
          },
        },
      },
    },
  }
})
