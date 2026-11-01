import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Librerie pesanti in chunk separati: primo avvio più leggero e
        // aggiornamenti più veloci (queste cambiano di rado, restano in cache).
        // React ha la priorità più alta: altrimenti finirebbe dentro il chunk
        // dei grafici e lo trascinerebbe nel primo avvio anche quando non serve.
        codeSplitting: {
          groups: [
            { name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
            { name: 'firebase', test: /[\\/]node_modules[\\/](@?firebase)/, priority: 2 },
            { name: 'charts', test: /[\\/]node_modules[\\/](recharts|d3-|victory|react-redux|@reduxjs|redux|immer|reselect|es-toolkit|decimal\.js|eventemitter3|react-is|use-sync-external-store)/, priority: 1 },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Chōwa 調和 — Strength in Balance',
        short_name: 'Chōwa',
        description: 'Il tuo percorso di forza, equilibrio e disciplina.',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f3ed',
        theme_color: '#f6f3ed',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // font di Google: il CSS si aggiorna in background, i file restano in cache
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // libreria esercizi (JSON): veloce dalla cache, aggiornata in background
            urlPattern: ({ url }) => url.pathname === '/exercises-lib.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'exercise-lib' },
          },
          {
            // foto degli esercizi: una volta viste restano disponibili offline
            urlPattern: ({ url }) => url.hostname === 'raw.githubusercontent.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'exercise-images',
              expiration: { maxEntries: 600, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
})
