import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Env } from '../env'
import { debug } from '../util/debug'

export async function rewire(funcPath: string, env: Env) {
  const srcFile = join(env.radashiDir, 'src', funcPath + '.ts')
  const contents = readFileSync(srcFile, 'utf8')
  try {
    const filename = join(env.overrideDir, 'rewired', funcPath + '.ts')
    if (!existsSync(filename)) {
      debug(`Rewiring "${funcPath}" to use your overrides.`)
      await mkdir(dirname(filename), { recursive: true })
    }
    await writeFile(
      filename,
      '// BEWARE: Copied from the upstream repository. Do not edit directly!\n' +
        contents,
    )
    return true
  } catch {
    return false
  }
}
