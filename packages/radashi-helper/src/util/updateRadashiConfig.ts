import { readFileSync } from 'fs'
import { writeFile } from 'fs/promises'
import { Config, Env } from '../env'

export async function updateRadashiConfig(
  env: Env,
  newConfig: Partial<Config>,
) {
  const config = JSON.parse(readFileSync(env.configPath, 'utf8')) as Config
  await writeFile(
    env.configPath,
    JSON.stringify({ ...config, ...newConfig }, null, 2),
  )
  Object.assign(env.config, newConfig)
}
