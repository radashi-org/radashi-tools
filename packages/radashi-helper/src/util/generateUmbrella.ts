import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { flat, select } from 'radashi'
import type { Env } from '../env'
import { updateRewired } from '../rewired/updateRewired'
import { dedent } from './dedent'
import { extractExports, printExports } from './exports'
import { findSources } from './findSources'

export async function generateUmbrella(env: Env) {
  // Update rewired files on every build.
  await updateRewired(env)

  const typesPath = join(env.root, 'src/types.ts')
  const overrideTypesPath = join(env.root, 'overrides/src/types.ts')

  const pathsInside = await findSources(env)
  const namesBlocked = flat(Object.values(pathsInside))
    .concat(typesPath, overrideTypesPath)
    .flatMap(sourcePath => {
      return extractExports(sourcePath)
    })

  // Don't re-export names that were defined in the custom Radashi.
  const filterBlockedNames = (exportName: string) =>
    !namesBlocked.includes(exportName)

  const upstreamPath = join(env.root, 'node_modules/radashi/dist/radashi.d.ts')
  const upstreamTypes = extractExports(upstreamPath, { types: 'only' }).filter(
    filterBlockedNames,
  )
  const upstreamExports =
    extractExports(upstreamPath).filter(filterBlockedNames)

  let code = printExports({
    from: './node_modules/radashi/dist/radashi',
    names: upstreamExports.filter(name => !upstreamTypes.includes(name)),
    types: upstreamTypes,
  })

  const srcExports = printLocalExports(pathsInside.src, env)
  if (srcExports.length) {
    code += dedent`
      \n
      // Our custom functions.
      ${srcExports}
    `
  }

  const overrideExports = printLocalExports(pathsInside.overrides, env)
  if (overrideExports.length) {
    code += dedent`
      \n
      // Our overrides.
      ${overrideExports}
    `
  }

  const userTypeExports = existsSync(typesPath)
    ? printLocalExports([typesPath], env)
    : undefined

  const overrideTypeExports = existsSync(overrideTypesPath)
    ? printLocalExports([overrideTypesPath], env)
    : undefined

  if (userTypeExports?.length || overrideTypeExports?.length) {
    code += dedent`
      \n
      // Our types.\n
    `
    if (overrideTypeExports?.length) {
      code += overrideTypeExports
    }
    if (userTypeExports?.length) {
      code += userTypeExports
    }
  }

  const rewiredExports = printLocalExports(pathsInside.rewired, env)
  if (rewiredExports.length) {
    code += dedent`
      \n
      // Rewired to use our overrides.
      ${rewiredExports}
    `
  }

  return code + '\n'
}

function printLocalExports(files: string[], env: Env) {
  return select(
    files.map(file => ({
      file,
      exports: extractExports(file),
      types: extractExports(file, { types: 'only' }),
    })),
    mod =>
      printExports({
        from: './' + relative(env.root, mod.file),
        names: mod.exports.filter(name => !mod.types.includes(name)),
        types: mod.types,
      }),
    mod => mod.exports.length > 0,
  ).join('\n')
}
