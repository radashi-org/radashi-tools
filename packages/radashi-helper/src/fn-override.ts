import { exec } from 'exec'
import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { defer } from 'radashi'
import { botCommit } from './bot'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { rewireDependents } from './rewired/rewireDependents'
import { assertRepoClean } from './util/assertRepoClean'
import { cwdRelative } from './util/cwdRelative'
import { debug } from './util/debug'
import { RadashiError } from './util/error'
import { getRadashiFuncPaths } from './util/getRadashiFuncPaths'
import { log } from './util/log'
import { openInEditor } from './util/openInEditor'
import { projectFolders } from './util/projectFolders'
import { pullRadashi } from './util/pullRadashi'
import { queryFuncs } from './util/queryFuncs'
import { stdio } from './util/stdio'

export interface AddOverrideOptions extends CommonOptions {
  /**
   * Open the new `src/` file in editor.
   * @default true
   */
  editor?: string | false
  exactMatch?: boolean
  fromBranch?: string
}

export async function addOverride(
  query: string,
  options: AddOverrideOptions = {},
) {
  const env = options.env ?? getEnv(options.dir)

  const { radashiDir } = env
  if (!radashiDir) {
    throw new RadashiError('No upstream repository exists')
  }

  await assertRepoClean(env.root)
  await pullRadashi(env)

  let bestMatch: string
  let bestMatchName: string

  await defer(async onFinish => {
    if (options.fromBranch) {
      // Checkout the specified branch.
      await exec('git', ['checkout', options.fromBranch], {
        cwd: radashiDir,
        stdio,
      })

      // Checkout the previous branch when copying is done.
      onFinish(async () => {
        await exec('git', ['checkout', '-'], {
          cwd: radashiDir,
        })
      })
    }

    const funcPaths = await getRadashiFuncPaths(env)
    const { funcPath, funcName } = await queryFuncs(query, funcPaths, {
      exactMatch: options.exactMatch,
      message: 'Which function do you want to copy?',
      confirmMessage: 'Is "{funcPath}" the function you want to copy?',
    })

    bestMatch = funcPath
    bestMatchName = funcName

    let copied = 0

    for (const folder of projectFolders) {
      const fromPath = join(
        radashiDir,
        folder.name,
        bestMatch + folder.extension,
      )
      const outPath = join(
        env.overrideDir,
        folder.name,
        bestMatch + folder.extension,
      )
      const success = await tryCopyFile(fromPath, outPath)
      if (success) {
        copied++

        if (folder.name === 'src' && options.editor !== false) {
          await openInEditor(outPath, env, options.editor)
        }
      }
    }

    copied += (await rewireDependents(bestMatchName, env, funcPaths)).length

    log(`${copied} files copied.`)
  })

  const { default: build } = await import('./build')
  await build({ env })

  // Log a blank line.
  log('')

  // Commit the override to the current branch, using radashi-bot as
  // the author.
  await botCommit(`chore: override ${bestMatch!}`, {
    cwd: env.root,
    add: ['mod.ts', 'overrides'],
  })
}

async function tryCopyFile(src: string, dst: string) {
  debug(`Copying ${cwdRelative(src)} to ${cwdRelative(dst)}`)
  if (existsSync(src)) {
    try {
      await mkdir(dirname(dst), { recursive: true })
      await copyFile(src, dst)
      return true
    } catch {}
  }
  return false
}
