import glob from 'fast-glob'
import * as path from 'path'
import { select } from 'radashi'

export async function getRadashiFuncPaths(radashiDir: string) {
  const srcRoot = path.join(radashiDir, 'src')
  return select(
    await glob('**/*.ts', { cwd: srcRoot }),
    f => f.replace(/\.ts$/, ''),
    f => f.includes('/'),
  )
}
