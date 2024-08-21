import { bold, cyan, gray } from 'kleur/colors'
import { dedent } from '../util/dedent'

export async function help() {
  const tutorial = [
    dedent`
      Hey there! This tutorial will help you get started with your own Radashi.

      This tool helps you quickly add your own functions, edit existing functions, and even contribute your work back upstream. You might be thinking “I can already do all that!” but we believe this tool will make it easier than ever.

      In a typical utility library, you'd have an “umbrella file” that exports your functions from all the little modules. The Radashi CLI will generate that file for you! Just build the project and your "mod.ts" file will be magically up-to-date.

      ${bold('TIP:')} You can use number keys to jump to a specific page in the tutorial.
    `,
    dedent`
      First, let's learn how this CLI can help you add a new function to your Radashi.

          ${cyan('pnpm fn create foo/bar')}

      Run that command in another terminal. It creates the following files:

          src/foo/bar.ts
          tests/foo/bar.test.ts
          benchmarks/foo/bar.bench.ts
          docs/foo/bar.mdx

      Remember, you can always undo it with \`git clean -df\` (but take care to not run that before stashing or committing any other unrelated changes).
    `,
    dedent`
      By the way, there are built-in commands for bundling, linting, testing, and formatting.

          ${cyan('pnpm build')}   # Build your project.
          ${cyan('pnpm dev')}     # Build your project. Rebuild on file changes.

          # Check your files with Biome, the same formatter/linter used by 
          # Radashi upstream. Also checks for browser compatibility issues.
          ${cyan('pnpm lint')}
          ${cyan('pnpm test')}    # Run your tests with Vitest.
          ${cyan('pnpm bench')}   # Run your benchmarks with Vitest.
          ${cyan('pnpm format')}  # Format your files with Biome.
    `,
    dedent`
      Let's say you want to extend or fix an existing Radashi function. We made it as simple as running a command. The original code is copied from Radashi upstream, and you're free to edit it as you like.

          ${cyan('pnpm fn override debounce')}

      Run that command in another terminal. It creates the following files:

          overrides/src/curry/debounce.ts
          overrides/tests/curry/debounce.test.ts
          overrides/benchmarks/curry/debounce.bench.ts
          overrides/docs/curry/debounce.mdx

      If you run ${cyan('`ls overrides/rewired`')} after, you'll see a bunch of other files were added. If you ever copy a function that other Radashi functions depend on, those dependent functions need to be “re-wired” so that they point to your override. The dependent functions are copied into your Radashi, but they won't be committed so they can be updated on every build (to keep them in sync with the upstream Radashi).

      The \`fn override\` command will commit the files it just copied for you, so you can easily revert the override if ever necessary.
    `,
    dedent`
      If you see a PR on Radashi's Github that you'd like in your Radashi, we have a command that will copy in its changes hassle-free. All you need is the PR number!

          ${cyan('pnpm pr import 123')}

      This will copy files from the PR into your project. Take care to read the PR's changes before importing them, or you could become a victim of a malicious PR author.

      The \`pr import\` command will commit the files it just copied for you, so you can easily revert the PR if ever necessary.
    `,
    dedent`
      That's all for now! Please reach out on Github if you have any questions or feedback.

      https://github.com/radashi-org/radashi-vscode/issues
    `,
  ]

  for (let i = 0; i < tutorial.length; i++) {
    const message = tutorial[i]
    console.clear()
    console.log(
      dedent`
        ${bold(`Radashi CLI Tutorial (${i + 1}/${tutorial.length})`)}

      `,
    )
    console.log(message)
    await new Promise<void>(resolve => {
      console.log(gray('\nPress any key to continue... (Ctrl+C to exit)'))
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.once('data', key => {
        const keyCode = key.toString('hex')

        // Ctrl+C or Ctrl+D or Q key
        if (keyCode === '03' || keyCode === '04' || keyCode === '71') {
          process.exit(0)
        }
        // Number keys
        else if (keyCode >= '31' && keyCode <= '39') {
          const pageNumber =
            Number.parseInt(
              String.fromCharCode(Number.parseInt(keyCode, 16)),
              10,
            ) - 1

          if (pageNumber >= 0 && pageNumber < tutorial.length) {
            i = pageNumber - 1
          }
        }

        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.off('SIGINT', onSigInt)
        resolve()
      })
      function onSigInt() {
        process.exit(0)
      }
      process.on('SIGINT', onSigInt)
    })
  }
}
