import stringArgv from 'string-argv'
import * as cli from '../../src/cli'

export function run(command: string) {
  return cli.run(['', '', ...stringArgv(command)])
}
