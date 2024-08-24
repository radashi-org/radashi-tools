import cac, { type CAC } from 'cac'
import { exec } from 'exec'
import { dedent } from './util/dedent'
import { log } from './util/log'

const app = cac('radashi')

app.option('-C, --dir <dir>', 'Set the directory where your Radashi is located')

app
  .command('build', 'Compile and bundle the project, writing to the filesystem')
  .option('-w, --watch', 'Watch for changes')
  .action(async flags => {
    const { default: build } = await import('./build')
    await build(flags)
  })

app
  .command('fn [subcommand]', 'Manage your functions')
  .allowUnknownOptions()
  .action(async () => {
    const fn = cac('radashi fn')

    fn.option(
      '-C, --dir <dir>',
      'Set the directory where your Radashi is located',
    )

    fn.command('create [name]', 'Scaffold the files for a custom function')
      .alias('add')
      .option('-e, --editor', 'Open the new function in the specified editor')
      .option('-d, --description', 'Set the description for the new function')
      .option('-g, --group', 'Set the group for the new function')
      .action(async (name: string | undefined, flags) => {
        if (name?.includes('/')) {
          const parts = name.split('/')
          flags.group = parts[0]
          name = parts[1]
        }
        const { createFunction } = await import('./fn-create')
        await createFunction(name, flags)
      })

    fn.command('move [funcPath] [dest]', 'Rename a function‘s files')
      .alias('rename')
      .alias('mv')
      .example(
        bin =>
          dedent`
          # Rename "objectify" to "objectToArray"
          ${bin} move array/objectify objectToArray
        `,
      )
      .example(
        bin =>
          dedent`
          # Move "sum" to the array group.
          ${bin} move number/sum array/sum
        `,
      )
      .action(
        async (
          funcPath: string | undefined,
          dest: string | undefined,
          flags,
        ) => {
          const { moveFunction } = await import('./fn-move')
          await moveFunction({ ...flags, funcPath, dest })

          log.warn(
            'This command has only renamed the files. It didn‘t edit the codebase or commit the changes.',
          )
        },
      )

    fn.command(
      'override [query]',
      'Override a function from radashi-org/radashi',
    )
      .option('-E, --exact-match', 'Only match exact function names')
      .action(async (query, flags) => {
        const { addOverride } = await import('./fn-override')
        await addOverride(query ?? '', flags)
      })

    await execute(fn, app.rawArgs.slice(1))
  })

app
  .command('pr [subcommand]', 'Create and import pull requests')
  .allowUnknownOptions()
  .action(async () => {
    const pr = cac('radashi pr')

    pr.option(
      '-C, --dir <dir>',
      'Set the directory where your Radashi is located',
    )

    pr.command(
      'import <number>',
      'Copy files from a radashi-org/radashi pull request into your fork',
    )
      .option(
        '-f, --files <file>',
        'Only import the specified files (comma separated)',
      )
      .action(async (prNumber: string, flags) => {
        flags.files = flags.files?.split(',')
        const { importPullRequest } = await import('./pr-import')
        await importPullRequest(prNumber, flags)
      })

    await execute(pr, app.rawArgs.slice(1))
  })

app
  .command('open [query]', 'Open function files in your editor')
  .option('-s, --source', 'Open the source file')
  .option('-t, --test', 'Open the test file (and type tests)')
  .option('-T, --type-test', 'Open the type tests')
  .option('-b, --benchmark', 'Open the benchmark file')
  .option('-d, --docs', 'Open the documentation file')
  .option('-A, --all', 'Open all related files')
  .action(async (query, flags) => {
    // If the user specifies the all flag, open all related files.
    if (flags.all) {
      flags.source =
        flags.test =
        flags.typeTest =
        flags.benchmark =
        flags.docs =
          true
    }
    // If the user doesn't specify any flags, open the source file.
    else if (
      flags.test == null &&
      flags.typeTest == null &&
      flags.benchmark == null &&
      flags.docs == null
    ) {
      flags.source = true
    }
    // If the user specifies a test flag, we assume they want to open
    // the type test as well.
    else if (flags.typeTest == null) {
      flags.typeTest = flags.test
    }

    const { openFunction } = await import('./open')
    await openFunction(query, flags)
  })

app
  .command('lint [...files]', 'Check for browser compatibility issues')
  .allowUnknownOptions()
  .action(async (files: string[], flags) => {
    const { lint } = await import('./lint')
    await lint(files, flags)
  })

app
  .command('format [...files]', 'Format files using Biome and Prettier')
  .action(async (files: string[], flags) => {
    const { format } = await import('./format')
    await format(files, flags)
  })

app
  .command('test [...globs]', 'Run tests using Vitest')
  .allowUnknownOptions()
  .action(async (globs: string[], flags) => {
    const { startTestRunner } = await import('./test')
    await startTestRunner(globs, flags)
  })

app.command('help', 'Walk through a tutorial').action(async () => {
  const { help } = await import('./cli/help')
  help()
})

export function run(argv: string[]) {
  return execute(app, argv, sections => {
    if (argv[0] === 'test') {
      exec('pnpm', ['-s', 'vitest', '--help'], { stdio: 'inherit' })
      return []
    }
    return sections
  })
}

export { EarlyExitError, RadashiError } from './util/error'
export { setLogHandler } from './util/log'
export { setFileOpener } from './util/openInEditor'
export { setPromptHandler } from './util/prompt'
export { setStdio } from './util/stdio'

type HelpCallback = Parameters<typeof app.help>[0]

/**
 * Used by both the root program and child programs to parse the given
 * CLI arguments and run the appropriate command.
 */
async function execute(program: CAC, argv: string[], help?: HelpCallback) {
  if (argv.length === 0) {
    program.outputHelp()
  } else {
    program.help(help)
    program.parse(argv, { run: false })
    if (process.env.NODE_ENV === 'test' && !program.matchedCommand) {
      throw new Error(`Unknown command: ${argv[0]}`)
    }
    return await program.runMatchedCommand()
  }
}
