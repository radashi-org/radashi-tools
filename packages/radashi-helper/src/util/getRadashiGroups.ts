import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Env } from '../env'

export async function getRadashiGroups(env: Env) {
  const upstreamDir = join(env.root, '.radashi/upstream/src')
  const existingDirs = await readdir(upstreamDir, { withFileTypes: true })
  return existingDirs
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
}
