import { existsSync } from 'node:fs'
import fs, { readdir, rm } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { objectify } from 'radashi'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { cwdRelative } from './util/cwdRelative'
import { debug } from './util/debug'
import { EarlyExitError, RadashiError } from './util/error'
import { findSources } from './util/findSources'
import { log } from './util/log'
import { projectFolders } from './util/projectFolders'
import { prompt } from './util/prompt'

export interface RemoveFunctionOptions extends CommonOptions {
  /**
   * The function to be removed. You must include the group and function
   * name, separated by a slash.
   *
   * If not provided, the user will be prompted to select a function
   * to remove.
   */
  funcPath?: string
}

export async function removeFunction(options: RemoveFunctionOptions = {}) {
  const env = options.env ?? getEnv(options.dir)

  let oldFuncPath = options.funcPath

  if (!oldFuncPath) {
    const pathsInside = await findSources(env, ['src', 'overrides'])
    debug('pathsInside:', pathsInside)

    const { src: sourceFuncs = [], overrides: overrideFuncs = [] } = objectify(
      Object.entries(pathsInside),
      ([type]) => type,
      ([type, sourcePaths]) => {
        const sourceRoot = join(
          type === 'src' ? env.root : env.overrideDir,
          'src',
        )
        return sourcePaths?.map(sourcePath =>
          relative(sourceRoot, sourcePath).replace(/\.ts$/, ''),
        )
      },
    )

    debug('sourceFuncs:', sourceFuncs)
    debug('overrideFuncs:', overrideFuncs)

    const selectedFunc = await prompt({
      type: 'autocomplete',
      name: 'selectedFunc',
      message: 'Select a function to remove:',
      choices: [...sourceFuncs, ...overrideFuncs].sort().map(funcPath => ({
        title: funcPath,
        value: funcPath,
      })),
    })

    if (!selectedFunc) {
      throw new EarlyExitError('No function selected. Exiting...')
    }

    oldFuncPath = selectedFunc
  }

  const checkFile = (folderPrefix: string) =>
    existsSync(join(folderPrefix, oldFuncPath + '.ts'))

  const folderPrefix = checkFile(join(env.root, 'src'))
    ? env.root
    : checkFile(join(env.overrideDir, 'src'))
      ? env.overrideDir
      : null

  if (!folderPrefix) {
    throw new RadashiError(
      `Function ${oldFuncPath} was not found in ${env.root}/src or the overrides folder`,
    )
  }

  const [oldGroup, oldFuncName] = oldFuncPath.split('/')

  for (const folder of projectFolders) {
    const prevPath = join(
      folderPrefix,
      folder.name,
      oldGroup,
      oldFuncName + folder.extension,
    )
    if (!existsSync(prevPath)) {
      continue
    }

    log(`Removing ${cwdRelative(prevPath)}`)
    await rm(prevPath)

    // Remove the directory if it's empty after removing the file
    const prevDir = dirname(prevPath)
    if ((await readdir(prevDir)).length === 0) {
      log(`Removing empty directory: ${cwdRelative(prevDir)}`)
      await fs.rm(prevDir, { recursive: true })
    }
  }

  // Update mod.ts
  if (env.radashiDir) {
    const { default: build } = await import('./build')
    await build({ env })
  }
}
