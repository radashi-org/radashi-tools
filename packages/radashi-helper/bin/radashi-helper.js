#!/usr/bin/env node
import('../dist/cli.js').then(
  async ({
    run,
    setPromptHandler,
    setLogHandler,
    setStdio,
    EarlyExitError,
    RadashiError,
  }) => {
    const { yellow } = await import('kleur/colors')

    setLogHandler(log)
    setPromptHandler(prompt)
    setStdio('inherit')

    try {
      await run(process.argv)
    } catch (error) {
      if (error instanceof EarlyExitError) {
        process.exit(0)
      }
      if (error instanceof RadashiError) {
        console.error(error.message)
      } else {
        console.error(error)
      }
      process.exit(1)
    }

    function log(type, msg, ...args) {
      switch (type) {
        case 'info':
          console.log(msg, ...args)
          break
        case 'warn':
          console.warn(yellow('ATTN') + ' ' + msg, ...args)
          break
        case 'error':
          console.error(msg, ...args)
          break
      }
    }

    async function prompt(options) {
      const { default: prompts } = await import('prompts')

      // Print a blank line to separate the prompt from the output.
      console.log()

      const answer = await prompts(options)
      return answer[options.name]
    }
  },
)
