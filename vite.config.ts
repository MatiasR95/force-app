import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base path: served from GitHub Pages under /force-app/ in prod, root in dev.
export default defineConfig(({ mode }) => {
const base = mode === 'production' ? '/force-app/' : '/'
return {
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'FORCE — Mi Rutina',
        short_name: 'FORCE',
        description: 'Tu rutina de entrenamiento FORCE, siempre con vos.',
        lang: 'es-AR',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the app shell; the routine JSON is cached in IndexedDB by the API layer.
        cleanupOutdatedCaches: true, // drop stale precaches so old chunks can't be served
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /script\.google\.com\/macros\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'force-api', networkTimeoutSeconds: 6 },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: { host: true },
}
})
