import fs, { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Env } from '../env'
import { debug } from '../util/debug'
import { loadRewired } from './loadRewired'

export async function undoRewire(funcPath: string, env: Env) {
  debug(`Removing rewired file for "${funcPath}"`)

  const rewiredFile = join(env.overrideDir, 'rewired', funcPath + '.ts')
  await fs.rm(rewiredFile)

  const rewired = await loadRewired(env)
  const newRewired = rewired.filter(path => path !== funcPath)
  await writeFile(rewiredFile, JSON.stringify(newRewired, null, 2))
}
