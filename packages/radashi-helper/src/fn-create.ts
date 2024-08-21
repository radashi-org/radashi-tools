import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path, { dirname, join } from 'node:path'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { dedent } from './util/dedent'
import { EarlyExitError, RadashiError } from './util/error'
import { getRadashiGroups } from './util/getRadashiGroups'
import { log } from './util/log'
import { openInEditor } from './util/openInEditor'
import { prompt } from './util/prompt'
import { pullRadashi } from './util/pullRadashi'

export interface CreateFunctionOptions extends CommonOptions {
  /**
   * The description of the function. If not defined, the user will be
   * prompted to enter a description.
   */
  description?: string
  /**
   * Open the new `src/` file in editor.
   * @default true
   */
  editor?: string | false
  /**
   * The group to create the function in. If not defined, the user
   * will be prompted to select a group.
   */
  group?: string
}

export async function createFunction(
  funcName?: string,
  options: CreateFunctionOptions = {},
) {
  if (funcName == null) {
    funcName = await prompt({
      type: 'text',
      name: 'funcName',
      message: 'Enter the name for the new function:',
    })
  }
  if (!funcName) {
    throw new RadashiError('Function name cannot be empty')
  }
  if (funcName.includes('/')) {
    throw new RadashiError('Function name cannot include slashes')
  }

  const env = options.env ?? getEnv(options.dir)
  await pullRadashi(env)

  let { group, description } = options

  if (group == null) {
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
        message: 'Enter the name for the new group:',
      })
      if (!newGroup) {
        throw new RadashiError('Group name cannot be empty')
      }

      group = newGroup
    } else {
      group = selectedGroup
    }
  }

  const directories = {
    src: join(env.root, 'src', group),
    docs: join(env.root, 'docs', group),
    tests: join(env.root, 'tests', group),
    benchmarks: join(env.root, 'benchmarks', group),
  }

  const files = {
    src: join(directories.src, `${funcName}.ts`),
    docs: join(directories.docs, `${funcName}.mdx`),
    tests: join(directories.tests, `${funcName}.test.ts`),
    benchmarks: join(directories.benchmarks, `${funcName}.bench.ts`),
  }

  // Create docs file
  if (!existsSync(files.docs)) {
    if (description == null) {
      description = await prompt({
        type: 'text',
        name: 'description',
        message: `Enter a description for ${funcName}:`,
      })
      if (description == null) {
        throw new EarlyExitError('No description provided. Exiting...')
      }
      if (description.trim() === '') {
        throw new RadashiError('Function description cannot be empty')
      }
    }

    await createFile(files.docs, generateDocsContent(funcName, description))
  } else {
    log.error(`Warning: ${files.docs} already exists. Skipping.`)
  }

  // Create other files
  await createFileIfNotExists(files.src, generateSrcContent(group, funcName))
  await createFileIfNotExists(files.tests, generateTestsContent(funcName))
  await createFileIfNotExists(
    files.benchmarks,
    generateBenchmarksContent(funcName),
  )

  // Open the new src file in editor.
  if (options.editor !== false) {
    await openInEditor(files.src, env, options.editor)
  }

  // Update mod.ts
  const { default: build } = await import('./build')
  await build()
}

async function createFile(file: string, content: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
  log(`Created ${path.relative(process.cwd(), file)}`)
}

async function createFileIfNotExists(
  file: string,
  content: string,
): Promise<void> {
  if (!existsSync(file)) {
    await createFile(file, content)
  } else {
    log.error(`Warning: ${file} already exists. Skipping.`)
  }
}

function generateDocsContent(funcName: string, description: string): string {
  return dedent`
    ---
    title: ${funcName}
    description: ${description}
    ---

    ### Usage

    Does a thing. Returns a value.

    \`\`\`ts
    import * as _ from 'radashi'

    _.${funcName}()
    \`\`\`

  `
}

function generateSrcContent(group: string, funcName: string): string {
  return dedent`
    /**
      * Does a thing.
      *
      * @see https://radashi.js.org/reference/${group}/${funcName}
      * @example
      * \`\`\`ts
      * ${funcName}()
      * \`\`\`
      */
      export function ${funcName}(): void {}

  `
}

function generateTestsContent(funcName: string): string {
  return dedent`
    import * as _ from 'radashi'

    describe('${funcName}', () => {
      test('does a thing', () => {
        expect(_.${funcName}()).toBe(undefined)
      })
    })

  `
}

function generateBenchmarksContent(funcName: string): string {
  return dedent`
    import * as _ from 'radashi'
    import { bench } from 'vitest'

    describe('${funcName}', () => {
      bench('with no arguments', () => {
        _.${funcName}()
      })
    })

  `
}
