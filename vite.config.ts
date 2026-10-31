import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → normal multi-file production build in dist/
// `npm run build:single`  → one self-contained HTML file (easy to share / host anywhere)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 1200, ...(mode === 'single' ? { outDir: 'dist-single' } : {}) },
  test: { environment: 'node' },
}));
