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
    headers: {
      // Three.js usa new Function() para compilar shaders GLSL de forma óptima.
      // Sin unsafe-eval cae a rutas lentas → spikes de ~2000ms al compilar shaders.
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "connect-src 'self' ws: wss:",
      ].join('; '),
    },
  },
});
