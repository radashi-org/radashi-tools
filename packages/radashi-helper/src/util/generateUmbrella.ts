import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { flat } from 'radashi'
import { Env } from '../env'
import { updateRewired } from '../rewired/updateRewired'
import { dedent } from './dedent'
import { findSources } from './findSources'
import { getExportedNames } from './getExportedNames'

export async function generateUmbrella(env: Env) {
  // Update rewired files on every build.
  await updateRewired(env)

  const typesPath = join(env.root, 'src/types.ts')
  const overrideTypesPath = join(env.root, 'overrides/src/types.ts')

  const pathsInside = await findSources(env)
  const namesBlocked = flat(Object.values(pathsInside))
    .concat(typesPath, overrideTypesPath)
    .flatMap(sourcePath => {
      return getExportedNames(sourcePath)
    })

  function parseExports(
    file: string,
    filter?: (exportName: string) => boolean,
  ) {
    const exportedTypeNames = getExportedNames(file, { types: 'only' })
    const exportedNames = getExportedNames(file)

    const forwarded = filter ? exportedNames.filter(filter) : exportedNames
    const exports = forwarded.map(name =>
      exportedTypeNames.includes(name) ? `type ${name}` : name,
    )

    return { exports }
  }

  const radashiUpstream = parseExports(
    join(env.root, 'node_modules/radashi/dist/radashi.d.ts'),
    // Don't re-export names that were defined in the custom Radashi.
    exportName => !namesBlocked.includes(exportName),
  )

  let code = printExports(
    radashiUpstream.exports,
    './node_modules/radashi/dist/radashi',
  )

  const srcModules = pathsInside.src
    .map(file => ({ file, exports: parseExports(file).exports }))
    .filter(mod => mod.exports.length > 0)

  if (srcModules.length) {
    code += dedent`
      \n
      // Our custom functions.
      ${srcModules
        .map(mod => {
          return printExports(mod.exports, './' + relative(env.root, mod.file))
        })
        .join('\n')}
    `
  }

  const overrides = pathsInside.overrides
    .map(file => ({
      file,
      exports: parseExports(file).exports,
    }))
    .filter(mod => mod.exports.length > 0)

  if (overrides.length) {
    code += dedent`
      \n
      // Our overrides.
      ${overrides
        .map(mod => {
          return printExports(mod.exports, './' + relative(env.root, mod.file))
        })
        .join('\n')}
    `
  }

  const typesModule = existsSync(typesPath)
    ? parseExports(typesPath)
    : undefined

  const overrideTypesModule = existsSync(overrideTypesPath)
    ? parseExports(overrideTypesPath)
    : undefined

  if (typesModule?.exports.length || overrideTypesModule?.exports.length) {
    code += dedent`
      \n
      // Our types.\n
    `
    if (overrideTypesModule?.exports.length) {
      code += printExports(
        overrideTypesModule.exports,
        './' + relative(env.root, overrideTypesPath),
      )
    }
    if (typesModule?.exports.length) {
      code += printExports(
        typesModule.exports,
        './' + relative(env.root, typesPath),
      )
    }
  }

  const rewiredModules = pathsInside.rewired
    .map(file => ({ file, exports: parseExports(file).exports }))
    .filter(mod => mod.exports.length > 0)

  if (rewiredModules.length) {
    code += dedent`
      \n
      // Rewired to use our overrides.
      ${rewiredModules
        .map(mod => {
          return printExports(mod.exports, './' + relative(env.root, mod.file))
        })
        .join('\n')}
    `
  }

  return code + '\n'
}

function printExports(exportedNames: string[], specifier: string) {
  return `export { ${exportedNames.join(', ')} } from '${specifier}'`
}
