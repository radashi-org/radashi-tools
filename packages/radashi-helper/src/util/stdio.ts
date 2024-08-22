import type { StdioOption } from 'exec'

export let stdio: StdioOption = 'ignore'

export function setStdio(arg: StdioOption) {
  stdio = arg
}
