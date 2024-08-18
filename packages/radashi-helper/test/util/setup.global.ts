import { execa } from 'execa'
import { existsSync } from 'node:fs'

process.env.DEBUG = 'radashi'

const forkDir = 'test/my-radashi'

export async function setup() {
  if (!existsSync(forkDir)) {
    await execa('git', [
      'clone',
      'https://github.com/radashi-org/radashi-template.git',
      forkDir,
      '--depth=1',
      '--branch=test',
    ])
  }

  process.chdir(forkDir)

  // Install template dependencies.
  await execa('pnpm', ['install', 'radashi-helper@link:../..'])
}
