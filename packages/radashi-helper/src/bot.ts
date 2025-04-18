import $ from 'picospawn'
import { forwardStderrAndRethrow } from './util/error'
import { stdio } from './util/stdio'

const bot = {
  name: 'Radashi Bot',
  email: '175859458+radashi-bot@users.noreply.github.com',
}

export async function botCommit(
  message: string,
  opts: { cwd: string; add: string[] },
): Promise<void> {
  if (opts.add.length > 0) {
    await $('git add', opts.add, { cwd: opts.cwd }).catch(
      forwardStderrAndRethrow,
    )
  }
  await $(
    'git commit -m %s --author %s',
    [message, `${bot.name} <${bot.email}>`],
    { cwd: opts.cwd, stdio },
  )
}
