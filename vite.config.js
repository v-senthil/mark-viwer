import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isDesktop = !!process.env.TAURI_BUILD;

export default defineConfig({
  plugins: [
    react(),
    // Custom plugin to handle multi-page routing in dev
    {
      name: 'multi-page-routing',
      configureServer(server) {
        // Run BEFORE Vite's built-in middleware (no return)
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          
          // Handle /mark-viwer/app or /mark-viwer/app/ -> redirect to app/index.html
          if (url === '/mark-viwer/app' || url === '/mark-viwer/app/' || 
              url === '/app' || url === '/app/') {
            res.writeHead(302, { Location: '/mark-viwer/app/index.html' });
            res.end();
            return;
          }
          
          next();
        });
      },
    },
  ],
  base: isDesktop ? '' : '/mark-viwer/',
  appType: 'mpa', // Multi-page application mode
  build: {
    rollupOptions: {
      input: isDesktop
        ? { app: resolve(__dirname, 'app/index.html') }
        : {
            main: resolve(__dirname, 'index.html'),
            app: resolve(__dirname, 'app/index.html'),
          },
    },
  },
  server: {
    strictPort: true,
    fs: {
      strict: false,
    },
  },
  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
