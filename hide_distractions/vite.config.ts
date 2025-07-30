import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// ESM workaround to get __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

export default defineConfig({
  plugins: [ 
    react(),
    viteStaticCopy({
      targets: [
        { src: 'src/styles/*', dest: 'assets' },
        { src: 'public/manifest.json', dest: '.' },
        { src: 'public/icons/**/*', dest: 'icons' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        floatingPopup: resolve(__dirname, 'src/intentionPopup.tsx'),
        popup: resolve(__dirname, 'src/popup.html'),
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        youtube: resolve(__dirname, 'src/youtube/youtube.ts'),
        linkedin: resolve(__dirname, 'src/linkedin/linkedin.ts')
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
})