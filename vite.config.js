import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

const isDesktop = !!process.env.TAURI_BUILD;

export default defineConfig({
  plugins: [react()],
  base: isDesktop ? '/' : '/mark-viwer/',
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
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
