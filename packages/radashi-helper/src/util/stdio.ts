import type { ExecaMethod } from 'execa'

type ExecaOptions = Extract<Parameters<ExecaMethod>[1], object>

export let stdio: ExecaOptions['stdio'] = 'ignore'

export function setStdio(arg: ExecaOptions['stdio']) {
  stdio = arg
}
