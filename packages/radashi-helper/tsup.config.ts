import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/vitest/plugin.ts', 'src/esbuild/plugin.ts'],
  format: ['esm', 'cjs'],
  splitting: true,
  dts: true,
})
