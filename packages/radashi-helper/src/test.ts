import glob from 'fast-glob'
import $ from 'picospawn'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { debug } from './util/debug'
import { stdio } from './util/stdio'

export async function startTestRunner(
  globs: string[],
  { dir, env, ...flags }: Record<string, any> & CommonOptions,
) {
  env ??= getEnv(dir)

  // The "vitest run" command disables watch mode.
  let subCommand: string | undefined
  if (globs[0] === 'run') {
    subCommand = 'run'
  }

  const args = [
    '-s',
    'vitest',
    subCommand,
    '--coverage',
    ...globs,
    ...arrifyFlags(flags),
  ]

  // If globs are passed, only check coverage for the files that match
  // the globs.
  if (globs.length > 0) {
    const globbishRE = /(^src\b|\*)/
    const files = await glob(
      globs.map(glob => (globbishRE.test(glob) ? glob : `src/**/${glob}*`)),
      {
        cwd: process.cwd(),
      },
    )
    for (const file of files) {
      args.push('--coverage.include', file)
    }
  }

  debug('Running:', ['pnpm', ...args])

  await $('pnpm', args, {
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
