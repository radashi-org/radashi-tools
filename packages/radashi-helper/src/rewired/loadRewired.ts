import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Env } from '../env'

export async function loadRewired(env: Env) {
  const rewiredFile = join(env.overrideDir, 'rewired.json')
  try {
    return JSON.parse(readFileSync(rewiredFile, 'utf8')) as string[]
  } catch (error) {
    return []
  }
}
