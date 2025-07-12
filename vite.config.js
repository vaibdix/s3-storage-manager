import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ['shiki', 'vscode-oniguruma'],
    include: ['react', 'react-dom']
  },
  assetsInclude: ['**/*.wasm'],
  define: {
    'process.platform': JSON.stringify(process.platform),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'shiki-core': ['shiki']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
});