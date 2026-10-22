import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Unit test cho Admin Web (Vitest + Testing Library, DOM giả lập bằng jsdom).
// Bộ live test (src/__tests__/live) chỉ chạy khi có LIVE_API_URL trỏ tới backend thật.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/main.jsx', 'src/test/**', 'src/__tests__/**'],
      reporter: ['text', 'json-summary', 'json'],
    },
  },
})
