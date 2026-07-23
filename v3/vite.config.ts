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
    // Absolute asset base. Must NOT be relative ('./'): the app uses
    // BrowserRouter with nested routes (e.g. /:bookId/products), and relative
    // asset URLs resolve against the current route depth on reload, so they
    // 404 and get rewritten to index.html -> "wrong MIME type" module error.
    // Defaults to the domain root; set VITE_BASE=/sub/path/ for a sub-folder
    // deploy (and match RewriteBase + RewriteRule in .htaccess accordingly).
    base: env.VITE_BASE || '/',
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
