import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import pkg from './package.json';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Poll instead of relying on FS events: edits made from the WSL side of
    // the WSL/Windows boundary don't reliably reach Windows file watchers.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
