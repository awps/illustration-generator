import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: "src/app",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/app"),
    },
  },
  build: {
    outDir: "../../dist/client/assets",
    emptyOutDir: true,
    rollupOptions: {
      input: "src/app/main.tsx",
      output: {
        entryFileNames: "main.js",
        assetFileNames: "main.[ext]",
      },
    },
  },
})
