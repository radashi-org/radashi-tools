import { isError } from 'radashi'
import { log } from './log'

export class RadashiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RadashiError'
  }
}

export class EarlyExitError extends RadashiError {
  constructor(message = 'Cannot continue. Exiting...') {
    super(message)
    this.name = 'EarlyExitError'
  }
}

export function forwardStderrAndRethrow(error: any): never {
  if (isError(error) && 'stderr' in error) {
    if ('stdout' in error) {
      log(error.stdout as string)
    }
    log.error(error.stderr as string)
  }
  throw error
}
