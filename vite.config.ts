import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // MapLibre GL сам по себе ~1 МБ — это ожидаемо
  build: { chunkSizeWarningLimit: 1600 },
})
