import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
    exclude: ['**/my-radashi/**'],
    environment: 'node',
    globalSetup: ['test/util/setup.global.ts'],
    setupFiles: ['test/util/setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    restoreMocks: true,
  },
  server: {
    watch: {
      ignored: ['**/my-radashi/**'],
    },
  },
})
