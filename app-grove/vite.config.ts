import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/app-grove/',
  build: {
    rollupOptions: {
      input: 'dev.html',
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'AppGrove',
        short_name: 'AppGrove',
        description: 'Personal utility apps hub',
        theme_color: '#0f0b18',
        background_color: '#0f0b18',
        display: 'standalone',
        scope: '/app-grove/',
        start_url: '/app-grove/',
        icons: [
          { src: '/app-grove/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/app-grove/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/app-grove/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
