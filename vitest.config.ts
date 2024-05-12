import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    root: './tests',
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
})
