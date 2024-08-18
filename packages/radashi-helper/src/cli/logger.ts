import { cyan, red } from 'kleur/colors'

export function info(msg: string) {
  console.log(cyan(msg))
}

export function fatal(msg: string): never {
  console.error(red('ERROR') + ' ' + msg)
  process.exit(1)
}
