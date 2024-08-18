import { execa } from 'execa'
import { stdio } from './util/stdio'

const bot = {
  name: 'Radashi Bot',
  email: '175859458+radashi-bot@users.noreply.github.com',
}

export async function botCommit(
  message: string,
  opts: { cwd: string; add: string[] },
): Promise<void> {
  await execa('git', ['add', ...opts.add], { cwd: opts.cwd, stdio })
  await execa(
    'git',
    ['commit', '-m', message, '--author', `${bot.name} <${bot.email}>`],
    { cwd: opts.cwd, stdio },
  )
}
