import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Konva into its own chunk for better caching
          konva: ['konva', 'react-konva'],
          // Vendor libraries
          vendor: ['react', 'react-dom', 'zustand'],
        },
      },
    },
  },
});
