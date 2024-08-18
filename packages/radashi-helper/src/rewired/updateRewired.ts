import { copyFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Env } from '../env'
import { rewire } from '../rewired/rewire'
import { debug } from '../util/debug'
import { loadRewired } from './loadRewired'

export async function updateRewired(env: Env) {
  const prevRewired = await loadRewired(env)
  if (prevRewired.length) {
    debug(`Updating ${prevRewired.length} rewired files...`)
    await Promise.all(
      prevRewired.map(async funcPath => {
        await rewire(funcPath, env)
      }),
    )
    await copyFile(
      join(env.root, 'overrides/src/tsconfig.json'),
      join(env.root, 'overrides/rewired/tsconfig.json'),
    )
  }
}
