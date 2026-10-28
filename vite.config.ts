import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = resolve(import.meta.dirname, 'src')

export default defineConfig({
  root: src,
  publicDir: resolve(import.meta.dirname, 'public'),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'chrome121',
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        newtab: resolve(src, 'newtab/index.html'),
        sidepanel: resolve(src, 'sidepanel/index.html'),
        command: resolve(src, 'command/index.html'),
        options: resolve(src, 'options/index.html'),
        offscreen: resolve(src, 'offscreen/index.html'),
        background: resolve(src, 'background.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
      },
    },
  },
})
