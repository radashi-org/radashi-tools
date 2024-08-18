import { parse } from '@babel/parser'
import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { flat, memo, reduce, select, traverse, unique } from 'radashi'
import type { Env } from '../env'
import { cwdRelative } from '../util/cwdRelative'
import { debug } from '../util/debug'
import { getRadashiFuncPaths } from '../util/getRadashiFuncPaths'
import { isBabelNode } from '../util/isBabelNode'
import { loadRewired } from './loadRewired'
import { rewire } from './rewire'

export async function rewireDependents(
  funcName: string,
  env: Env,
  radashiFuncPaths?: string[],
): Promise<string[]> {
  radashiFuncPaths ??= await getRadashiFuncPaths(env)

  const parseImports = memo((filename: string) => {
    const fileContents = readFileSync(filename, 'utf8')
    const parseResult = parse(fileContents, {
      plugins: [['typescript', { dts: false }]],
      sourceType: 'module',
      sourceFilename: filename,
    })

    const importedNames = new Set<string>()
    traverse(parseResult.program, (node, _key, _parent, context) => {
      if (isBabelNode(node)) {
        // Do not traverse past the top-level nodes.
        context.skip()

        // Add to names if this node is an import from "radashi"
        if (
          node.type === 'ImportDeclaration' &&
          node.source.value === 'radashi'
        ) {
          for (const specifier of node.specifiers) {
            importedNames.add(specifier.imported?.name ?? specifier.local.name)
          }
        }
      }
    })

    return importedNames
  })

  // Get the "radashi" imports of every source file, so we can
  // determine if any functions rely on the override target. If they
  // do, they too will need an override.
  const findDependentFiles: (funcName: string, stack?: string[]) => string[] =
    memo(
      (funcName, stack = []) => {
        const selected = select(
          radashiFuncPaths,
          (funcPath: string): string[] | null => {
            const filename = join(env.radashiDir, 'src', funcPath + '.ts')
            const importedNames = parseImports(filename)

            if (importedNames.has(funcName)) {
              let dependents: string[] = []
              if (!stack.includes(funcPath)) {
                stack.push(funcPath)
                const srcFuncName = funcPath.split('/').at(-1)!
                dependents = findDependentFiles(srcFuncName, stack)
                stack.pop()
              }
              dependents.unshift(funcPath)
              return dependents
            }

            return null
          },
        )

        return unique(flat(selected))
      },
      {
        key: bestMatchName => bestMatchName,
      },
    )

  const prevRewired = await loadRewired(env)
  const dependentFiles = findDependentFiles(funcName)
    .filter(file => {
      // Skip files that have already been rewired or overridden.
      return (
        !prevRewired.includes(file) &&
        !existsSync(join(env.overrideDir, 'src', file + '.ts'))
      )
    })
    .sort()

  if (!dependentFiles.length) {
    return []
  }

  await writeFile(
    join(env.overrideDir, 'rewired.json'),
    JSON.stringify([...prevRewired, ...dependentFiles], null, 2),
  )
  await tryCopyFile(
    join(env.root, 'src/tsconfig.json'),
    join(env.root, 'overrides/rewired/tsconfig.json'),
  )

  return reduce(
    dependentFiles,
    async (copiedFiles, file) => {
      if (await rewire(file, env)) {
        copiedFiles.push(file)
      }
      return copiedFiles
    },
    [] as string[],
  )
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
