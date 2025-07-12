// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// });

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import path from "path";

// export default defineConfig({
//   plugins: [react()],
//   resolve: {
//     alias: {
//       "@": path.resolve(__dirname, "./src"),
//     },
//   },
// });









// vite.config.js - Configuration for Shiki support with @ alias
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // Keep your existing alias configuration
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Critical for Shiki to work properly
  optimizeDeps: {
    exclude: ['shiki', 'vscode-oniguruma'], // Prevent pre-bundling these ESM modules
    include: ['react', 'react-dom'] // Ensure React is pre-bundled
  },

  // Include WASM files as assets
  assetsInclude: ['**/*.wasm'],

  // Define process variables for browser compatibility
  define: {
    'process.platform': JSON.stringify(process.platform),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },

  // Build configuration
  build: {
    rollupOptions: {
      output: {
        // Create separate chunk for Shiki to improve loading
        manualChunks: {
          'shiki-core': ['shiki']
        }
      }
    },
    // Increase chunk size warning limit due to Shiki's size
    chunkSizeWarningLimit: 1000
  },

  // Server configuration for development
  server: {
    fs: {
      // Allow serving files from node_modules (needed for Shiki assets)
      allow: ['..']
    }
  }
});