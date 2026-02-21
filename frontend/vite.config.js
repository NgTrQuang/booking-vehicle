import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        passenger: resolve(__dirname, 'passenger.html'),
        driver: resolve(__dirname, 'driver.html'),
      },
    },
  },
  server: {
    port: 5173,
    open: '/passenger.html',
  },
});
