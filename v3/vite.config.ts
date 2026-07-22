import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Where the PHP API lives, relative to the web server root.
  // Defaults to the XAMPP layout: http://localhost/tally/api/
  const apiBase = env.VITE_API_BASE || '/tally/api/';

  return {
    plugins: [react()],
    // Relative asset paths so the built app can be served from any sub-folder.
    base: './',
    server: {
      port: 8888,
      // In dev, forward API calls to the running XAMPP/PHP backend so the app
      // talks to the real database without any code changes.
      proxy: {
        [apiBase.replace(/\/$/, '')]: {
          target: 'http://localhost',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      target: 'es2020',
      cssCodeSplit: true,
      // Keep the bundle lean and split vendor code for better caching.
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
          },
        },
      },
    },
  };
});
