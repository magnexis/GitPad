import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : './',
  plugins: [react()],
  build: {
    outDir: 'target/dist',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
}));
