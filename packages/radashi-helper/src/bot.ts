import { exec } from 'exec'
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
    await exec('git', ['add', ...opts.add], { cwd: opts.cwd }).catch(
      forwardStderrAndRethrow,
    )
  }
  await exec(
    'git',
    ['commit', '-m', message, '--author', `${bot.name} <${bot.email}>`],
    { cwd: opts.cwd, stdio },
  )
}
