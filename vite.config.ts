import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'path';

// `npm run build:single` produces one self-contained dist-single/index.html
// that can be opened straight from disk with no server.
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: single
      ? { outDir: 'dist-single' }
      : {
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
  };
});
