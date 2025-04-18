import type { PicospawnOptions } from 'picospawn'

export let stdio: PicospawnOptions['stdio'] = 'ignore'

export function setStdio(arg: PicospawnOptions['stdio']) {
  stdio = arg
}
