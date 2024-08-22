import { exec } from 'exec'
import glob from 'fast-glob'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { stdio } from './util/stdio'

export async function format(filter: string[], options: CommonOptions) {
  const env = options.env ?? getEnv(options.dir)

  // 1. Remember if the user has uncommitted changes (ignoring untracked files).
  const { stdout: uncommittedChanges } = await exec(
    'git',
    ['status', '--porcelain', '-uno'],
    { cwd: env.root },
  )

  const biomeGlobs = ['src/**/*', 'tests/**/*', 'benchmarks/**/*']
  let biomeFiles = await glob(biomeGlobs)

  const prettierGlobs = [
    'package.json',
    'README.md',
    'docs/**/*',
    'scripts/**/*',
  ]
  let prettierFiles = await glob(prettierGlobs)

  // If arguments were passed, filter the list of files to only include those.
  if (filter.length > 0) {
    const filterRE = new RegExp(`^(${filter.join('|')}).*`)
    biomeFiles = biomeFiles.filter(file => filterRE.test(file))
    prettierFiles = prettierFiles.filter(file => filterRE.test(file))
  }

  // 2. Update the formatting.
  if (biomeFiles.length > 0) {
    await exec(
      'pnpm',
      [
        'biome',
        'check',
        '--diagnostic-level',
        'info',
        '--fix',
        '--unsafe',
        ...biomeFiles,
      ],
      { cwd: env.root, stdio },
    )
  }

  if (prettierFiles.length > 0) {
    await exec('pnpm', ['prettier', '--write', ...prettierFiles], {
      cwd: env.root,
      stdio,
    })
  }

  // 3. Commit if there were no uncommitted changes, but there are now.
  const { stdout: currentChanges } = await exec(
    'git',
    ['status', '--porcelain', '-uno'],
    { cwd: env.root },
  )
  if (!uncommittedChanges && currentChanges) {
    await exec('git', ['add', '-u'], { cwd: env.root })
    await exec('git', ['commit', '-m', 'chore: format'], { cwd: env.root })
  }
}
