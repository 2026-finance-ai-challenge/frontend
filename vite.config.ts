import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'https://api.kartkr.cloud',
          changeOrigin: true,
          secure: true,
        },
      },
    },
  }
})
