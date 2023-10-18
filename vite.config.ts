import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import suidPlugin from "@suid/vite-plugin"
import pluginRewriteAll from 'vite-plugin-rewrite-all'

export default defineConfig({
  plugins: [suidPlugin(), solid(), pluginRewriteAll()],
  appType: 'spa',
  optimizeDeps: {
    // Solve the problem: Error: Unrecognized extension value in extension set ([object Object]).
    include: ['@codemirror/state', '@codemirror/view'],
  }
})
