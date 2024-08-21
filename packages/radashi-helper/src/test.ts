import { execa } from 'execa'
import glob from 'fast-glob'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { debug } from './util/debug'
import { stdio } from './util/stdio'

export async function startTestRunner(
  globs: string[],
  { dir, env, ...flags }: Record<string, any> & CommonOptions,
) {
  const files = await glob(
    globs.map(glob => `src/**/${glob}*`),
    {
      cwd: process.cwd(),
    },
  )

  const extraArgs: string[] = []

  // If a single file was matched, only check coverage for that file.
  if (files.length === 1) {
    extraArgs.push('--coverage.include', files[0])
  }

  env ??= getEnv(dir)

  const args = [
    '-s',
    'vitest',
    '--coverage',
    ...globs,
    ...arrifyFlags(flags),
    ...extraArgs,
  ]

  debug('Running:', ['pnpm', ...args])

  await execa('pnpm', args, {
    cwd: env.root,
    stdio,
  })
}

function arrifyFlags(flags: Record<string, any>) {
  return Object.entries(flags).flatMap(([key, value]) => {
    if (key === '--') {
      return []
    }
    const name = value === false ? 'no-' + key : key
    const flag = name.length === 1 ? `-${name}` : `--${name}`
    return value === true ? [flag] : [flag, value]
  })
}
