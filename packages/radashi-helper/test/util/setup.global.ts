import { existsSync } from 'node:fs'
import $ from 'picospawn'

process.env.DEBUG = 'radashi'

const forkDir = 'test/my-radashi'

export async function setup() {
  if (!existsSync(forkDir)) {
    await $(
      'git clone https://github.com/radashi-org/radashi-template.git %s --depth=1 --branch=test',
      [forkDir],
    )
  }

  process.chdir(forkDir)

  // Install template dependencies.
  await $('pnpm install radashi-helper@link:../..')
}
