import { readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import type { Config, Env } from '../env'
import { RadashiError } from './error'

export async function updateRadashiConfig(
  env: Env,
  newConfig: Partial<Config>,
) {
  if (!env.configPath) {
    throw new RadashiError('No radashi.json exists in this project')
  }
  const config = JSON.parse(readFileSync(env.configPath, 'utf8')) as Config
  await writeFile(
    env.configPath,
    JSON.stringify({ ...config, ...newConfig }, null, 2),
  )
  Object.assign(env.config, newConfig)
}
