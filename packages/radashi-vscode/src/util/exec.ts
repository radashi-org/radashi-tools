import { execa } from 'execa'
import { outputChannel } from './outputChannel'

export function execIntoOutputChannel(
  command: string,
  args: string[],
  opts?: {
    cwd?: string
  },
) {
  const subprocess = execa(command, args, {
    reject: false,
    cwd: opts?.cwd,
  })

  outputChannel.show()
  subprocess.stdout?.on('data', data => {
    outputChannel.append(data.toString())
  })
  subprocess.stderr?.on('data', data => {
    outputChannel.append(data.toString())
  })

  return subprocess
}
