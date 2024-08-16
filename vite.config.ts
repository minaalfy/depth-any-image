import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/depth-any-image/',
  build: {
    outDir: './docs', // necessary for GitHub Pages
    emptyOutDir: true, // also necessary
    rollupOptions: {
      // Ensure to externalize deps that shouldn't be bundled
      // into your library
      external: ['gyronorm'],
      output: {
        globals: {
          gyronorm: 'GyroNorm',
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon/favicon.ico', 'favicon/apple-touch-icon.png', 'favicon/mask-icon.svg'],
      manifest: {
        name: 'Animated 3D images',
        short_name: '3D images',
        description: 'Generate Depth image and 3D animated canvas for any image',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'favicon/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});