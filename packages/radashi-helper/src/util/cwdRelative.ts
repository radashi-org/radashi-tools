import { white } from 'kleur/colors'
import { relative } from 'node:path'

export function cwdRelative(path: string) {
  let result = relative(process.cwd(), path)
  if (!result.startsWith('..')) {
    result = `./${result}`
  }
  return white(result)
}
