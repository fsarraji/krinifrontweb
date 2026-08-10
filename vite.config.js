import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
})
