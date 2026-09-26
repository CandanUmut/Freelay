import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// No network at runtime, enforced in production builds (dev needs inline scripts for HMR).
const CSP =
  "default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self'; manifest-src 'self'; font-src 'self'"

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    {
      name: 'csp',
      apply: 'build',
      transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        // Deliberately neutral: nothing on the home screen says what this is.
        name: 'Ledger',
        short_name: 'Ledger',
        description: 'A private daily ledger.',
        theme_color: '#121314',
        background_color: '#121314',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache everything the app needs; nothing is fetched at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  base: './',
  test: {
    environment: 'node',
    setupFiles: ['src/test-setup.ts'],
  },
})
