import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/app',
  build: {
    outDir: '../../dist/client/assets',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/app/main.tsx',
      output: {
        entryFileNames: 'main.js',
        assetFileNames: 'main.[ext]',
      },
    },
  },
})