import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: '/index.html'
      }
    }
  },
  server: {
    open: true,
    port: 3000
  },
  publicDir: 'public'
})