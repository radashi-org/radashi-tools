import glob from 'fast-glob'
import { join } from 'node:path'
import { select } from 'radashi'
import type { Env } from '../env'

/**
 * Get the function paths (e.g. `"array/select"`) from the upstream
 * Radashi repository.
 */
export async function getRadashiFuncPaths(env: Env) {
  const srcRoot = join(env.radashiDir ?? env.root, 'src')
  return select(
    (await glob('**/*.ts', { cwd: srcRoot })).sort(),
    f => f.replace(/\.ts$/, ''),
    f => f.includes('/'),
  )
}
