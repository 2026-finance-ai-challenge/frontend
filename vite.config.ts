import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      strictPort: true,
      proxy: {
        '/api': {
          target: process.env.KART_DEV_API_TARGET || 'https://api.kartkr.cloud',
          changeOrigin: true,
          secure: true,
          configure(proxy) {
            proxy.on('proxyRes', (response, request) => {
              // HTTP 루프백 개발 서버에서만 Secure 속성을 조정한다. 배포 쿠키는 항상 Secure다.
              if (request.headers.host === '127.0.0.1:5173'
                && request.url?.startsWith('/api/v1/auth/browser/')) {
                response.headers['set-cookie'] = response.headers['set-cookie']?.map((cookie) =>
                  cookie.startsWith('kart_browser_refresh=') ? cookie.replace(/;\s*Secure\b/gi, '') : cookie)
              }
            })
          },
        },
      },
    },
  }
})
