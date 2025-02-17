import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import suidPlugin from '@suid/vite-plugin'
// import devtools from 'solid-devtools/vite'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  build: {
    target: ['es2022', 'chrome111', 'edge111', 'firefox111', 'safari16'],
    chunkSizeWarningLimit: 10240,
  },
  plugins: [
    suidPlugin(),
    // devtools({
    //   autoname: true,
    // }),
    solid(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/workers',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false, // SW and devtools adds > 1 sec to loading time. Enable only when nesessary.
      },
      includeAssets: ['ndn_app.png', 'ndn.svg', 'font', 'font/*.woff2', 'swiftlatex/swiftlatexpdftex.wasm'],
      manifest: {
        name: 'NDN Workspace',
        short_name: 'NDN Workspace',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        theme_color: '#ce93d8',
        background_color: '#121212',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
      },
      injectManifest: {
        maximumFileSizeToCacheInBytes: 10485760, // increasing the file size to cached 10mb
      },
    }),
  ],
  appType: 'spa',
  optimizeDeps: {
    // Solve the problem: Error: Unrecognized extension value in extension set ([object Object]).
    include: ['@codemirror/state', '@codemirror/view'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      }
    }
  }
})
