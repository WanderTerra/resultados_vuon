import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: [
      'resultados.vuon.portes.com.br',
      'api-resultados.vuon.portes.com.br',
      'localhost',
      '127.0.0.1'
    ]
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild', // Usar esbuild ao invés de terser (mais rápido e já incluído)
  },
})
