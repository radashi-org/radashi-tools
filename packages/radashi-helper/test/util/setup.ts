import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { setLogHandler } from '../../src/util/log'
import { setFileOpener } from '../../src/util/openInEditor'
import { setPromptHandler } from '../../src/util/prompt'
import { setStdio } from '../../src/util/stdio'
import { gitClobberBranch, gitHardReset } from './git'
import { log, openFile, prompt } from './mocks'

// biome-ignore lint/correctness/useYield:
const stdout = async function* (data: unknown) {
  log('info', String(data))
}

// biome-ignore lint/correctness/useYield:
const stderr = async function* (data: unknown) {
  log('error', String(data))
}

setPromptHandler(prompt as any)
setFileOpener(openFile)
setLogHandler(log)
setStdio(['ignore', stdout, stderr])

beforeEach(async () => {
  await gitHardReset('origin/test')
  await gitClobberBranch()
  await resetRadashiClone()

  // Clear any rewired modules from previous tests.
  await fs.rm('overrides/rewired', { recursive: true }).catch(() => {})
})

async function resetRadashiClone() {
  const ref = 'v12.2.0-beta.af825f4'
  const cwd = path.resolve('.radashi/upstream')

  if (existsSync(cwd)) {
    await gitHardReset(ref, cwd)
  } else {
    const { cloneRadashi } = await import('../../src/util/cloneRadashi')

    // Ensure radashi is cloned before any testing, so the pullRadashi
    // function always logs the same things (for reliable snapshots).
    await cloneRadashi(ref, cwd)
  }
}
