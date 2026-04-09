import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts")) {
            return "vendor-recharts"
          }
          if (id.includes("node_modules/react-router")) {
            return "vendor-router"
          }
          if (id.includes("node_modules/react")) {
            return "vendor-react"
          }
          return undefined
        },
      },
    },
  },
})
