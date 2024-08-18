import { existsSync } from 'node:fs'
import fs, { mkdir, readdir, rename } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { objectify } from 'radashi'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { cwdRelative } from './util/cwdRelative'
import { debug } from './util/debug'
import { EarlyExitError, RadashiError } from './util/error'
import { findSources } from './util/findSources'
import { getRadashiGroups } from './util/getRadashiGroups'
import { log } from './util/log'
import { projectFolders } from './util/projectFolders'
import { prompt } from './util/prompt'

export interface MoveFunctionOptions extends CommonOptions {
  /**
   * The function to be moved. You must include the group and function
   * name, separated by a slash.
   *
   * If not provided, the user will be prompted to select a function
   * to move.
   */
  funcPath?: string
  /**
   * Either a group (e.g. `array`) or a group/function name (e.g.
   * `array/sum`).
   *
   * If not provided, the user will be prompted to decide what to do.
   */
  dest?: string
}

export async function moveFunction(options: MoveFunctionOptions = {}) {
  const env = getEnv(options.dir)

  let oldFuncPath = options.funcPath
  const dest = options.dest

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
      message: 'Select a function to move:',
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

  if (!existsSync(join(env.root, 'src', oldFuncPath + '.ts'))) {
    throw new RadashiError(
      `Function ${oldFuncPath} was not found in ${env.root}/src`,
    )
  }

  const [oldGroup, oldFuncName] = oldFuncPath.split('/')

  let [group, funcName] = dest
    ? dest.includes('/')
      ? dest.split('/')
      : [oldGroup, dest]
    : [oldGroup, oldFuncName]

  if (!dest) {
    const action = await prompt({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Move function to a new group', value: 'move' },
        { title: 'Rename function', value: 'rename' },
        { title: 'Both move and rename', value: 'both' },
      ],
    })

    if (!action) {
      throw new EarlyExitError('No action selected. Exiting...')
    }

    if (action === 'move' || action === 'both') {
      const groups = await getRadashiGroups(env)
      const selectedGroup = await prompt({
        type: 'autocomplete',
        name: 'selectedGroup',
        message: 'Select a group for the function:',
        choices: [
          { title: 'Create a new group', value: 'new' },
          ...groups.map(g => ({ title: g, value: g })),
        ],
      })
      if (!selectedGroup) {
        throw new EarlyExitError('No group selected. Exiting...')
      }
      if (selectedGroup === 'new') {
        const newGroup = await prompt({
          type: 'text',
          name: 'newGroup',
          message: 'Enter the new group name:',
        })
        if (!newGroup) {
          throw new EarlyExitError('No new group name provided. Exiting...')
        }
        group = newGroup
      } else {
        group = selectedGroup
      }
    }

    if (action === 'rename' || action === 'both') {
      const newFuncName = await prompt({
        type: 'text',
        name: 'newFuncName',
        message: 'Enter the new function name:',
      })
      if (!newFuncName) {
        throw new EarlyExitError()
      }
      funcName = newFuncName
    }
  }

  for (const folder of projectFolders) {
    const prevPath = join(
      env.root,
      folder.name,
      oldGroup,
      oldFuncName + folder.extension,
    )
    if (!existsSync(prevPath)) {
      continue
    }
    const dest = join(env.root, folder.name, group, funcName + folder.extension)
    if (existsSync(dest)) {
      const overwrite = await prompt({
        type: 'confirm',
        name: 'overwrite',
        message: `File ${cwdRelative(dest)} already exists. Do you want to overwrite it?`,
        initial: false,
      })
      if (overwrite == null) {
        throw new EarlyExitError()
      }
      if (!overwrite) {
        continue
      }
    }

    log(`Renaming ${cwdRelative(prevPath)} to ${cwdRelative(dest)}`)
    await mkdir(dirname(dest), { recursive: true })
    await rename(prevPath, dest)

    // Remove the directory if it's empty after moving the file
    const prevDir = dirname(prevPath)
    if ((await readdir(prevDir)).length === 0) {
      log(`Removing empty directory: ${cwdRelative(prevDir)}`)
      await fs.rm(prevDir, { recursive: true })
    }
  }
}
