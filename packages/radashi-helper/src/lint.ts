import { exec } from 'exec'
import glob from 'fast-glob'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { RadashiError } from './util/error'
import { log } from './util/log'
import { stdio } from './util/stdio'

export async function lint(files: string[], options: CommonOptions) {
  const env = options.env ?? getEnv(options.dir)

  const binFiles = glob.sync('*', {
    cwd: join(env.root, 'node_modules/.bin'),
  })

  for (const binFile of binFiles) {
    if (binFile === 'biome' && existsSync(join(env.root, 'biome.json'))) {
      const biomeGlobs = ['./src', './tests', './benchmarks'].flatMap(
        rootGlob => [rootGlob, rootGlob.replace('./', './overrides/')],
      )
      await exec('pnpm', ['biome', 'check', ...biomeGlobs], {
        cwd: env.root,
        stdio,
      }).catch(error => {
        log.error(error.message)
        throw new RadashiError('Biome failed to lint.')
      })
    } else if (
      binFile === 'eslint' &&
      (await glob('eslint.config.*', { cwd: env.root })).length > 0
    ) {
      await exec('pnpm', ['eslint', ...files], {
        cwd: env.root,
        stdio,
      }).catch(error => {
        log.error(error.message)
        throw new RadashiError('ESLint failed to lint.')
      })
    }
  }
}
