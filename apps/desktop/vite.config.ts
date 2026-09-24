import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/renderer',
  base: './',
  plugins: [react()],
  server: { port: 5199, strictPort: true },
  build: { outDir: '../../out/renderer', emptyOutDir: true, target: 'chrome130' },
});
