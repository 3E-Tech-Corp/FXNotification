import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/admin/',
  build: {
    outDir: path.resolve(__dirname, '../../Backend/Service/wwwroot/admin'),
    emptyOutDir: true,
  },
  server: {
    port: 3100,
    host: 'localhost', // dev server: localhost only
    proxy: {
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
});
