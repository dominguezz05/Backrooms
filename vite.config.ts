import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        game: 'game.html',
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
