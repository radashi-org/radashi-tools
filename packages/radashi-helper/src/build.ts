import * as esbuild from 'esbuild'
import { exec } from 'exec'
import fs from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { sift } from 'radashi'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { esbuildRadashi } from './esbuild/plugin'
import { stdio } from './util/stdio'

export interface BuildOptions extends CommonOptions {
  watch?: boolean
  outDir?: string
}

export default async function (options: BuildOptions = {}) {
  const env = options.env ?? getEnv(options.dir)
  const { root, config } = env

  const outDir = resolve(options.outDir ?? env.outDir)
  await fs.rm(outDir, { recursive: true }).catch(() => {})

  const esmOptions: esbuild.BuildOptions = {
    entryPoints: [env.modPath],
    external: ['radashi'],
    bundle: true,
    outfile: join(outDir, 'radashi.js'),
    platform: 'node',
    target: 'node16',
    format: 'esm',
    plugins: [esbuildRadashi({ env })],
    logLevel: 'info',
  }

  const cjsOptions = {
    ...esmOptions,
    format: 'cjs' as const,
    outfile: join(outDir, 'radashi.cjs'),
  }

  if (options?.watch) {
    const ctx = await esbuild.context(
      config.formats.includes('esm') ? esmOptions : cjsOptions,
    )
    await ctx.watch()
  } else {
    // ESM
    if (config.formats.includes('esm')) {
      await esbuild.build(esmOptions)
    }

    // CJS
    if (config.formats.includes('cjs')) {
      await esbuild.build(cjsOptions)
    }
  }

  // DTS
  if (config.dts) {
    await emitDeclarationTypes(root, join(outDir, 'types'), options)
  }
}

async function emitDeclarationTypes(
  root: string,
  outDir: string,
  flags: { watch?: boolean } = {},
) {
  const result = exec(
    'pnpm',
    sift([
      'tsc',
      flags.watch && '--watch',
      flags.watch && '--preserveWatchOutput',
      '--emitDeclarationOnly',
      '--outDir',
      outDir,
      '--project',
      'tsconfig.dts.json',
    ]),
    {
      cwd: root,
      stdio,
    },
  )
  if (!flags.watch) {
    await result
  }
}
