import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      manifest: {
        name: 'ミルケア（MiruCare）',
        short_name: 'ミルケア',
        description: 'カメラだけで心拍数・HRV・ストレスレベルを計測。ウェアラブル不要、完全プライバシー保護の健康経営支援ツール。',
        theme_color: '#1a3a6b',
        background_color: '#0a1628',
        display: 'standalone',
        lang: 'ja',
        start_url: '/vitallens/',
        scope: '/vitallens/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/guides/*/og-image.png'],
        navigateFallback: '/vitallens/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-cdn-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/vitallens/',
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
})
