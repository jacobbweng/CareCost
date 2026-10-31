import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run dev`           → local app (http://localhost:5173)
// `npm run build`         → production build in dist/
// `npm run build:single`  → one self-contained HTML file in dist-single/
//
// Optional AI (DeepSeek): put these in `.env.local` (git-ignored):
//   DEEPSEEK_API_KEY=<your DeepSeek API key>
//   DEEPSEEK_MODEL=deepseek-chat
// The key is added server-side by the proxy below and is never sent to the browser.

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const key = (env.DEEPSEEK_API_KEY || '').trim();
  const model = (env.DEEPSEEK_MODEL || 'deepseek-chat').trim();

  const proxy: Record<string, ProxyOptions> | undefined = key
    ? {
        '/api/ai': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          secure: true,
          rewrite: () => '/chat/completions',
          headers: { Authorization: `Bearer ${key}` },
        },
      }
    : undefined;

  return {
    base: './',
    plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
    define: { __AI_ENABLED__: JSON.stringify(Boolean(key)), __AI_MODEL__: JSON.stringify(model) },
    server: { proxy },
    preview: { proxy },
    build: { chunkSizeWarningLimit: 1200, ...(mode === 'single' ? { outDir: 'dist-single' } : {}) },
    test: { environment: 'node' },
  };
});
