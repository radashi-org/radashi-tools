import type { LogHandler } from '../../src/util/log'
import type { OpenFileHandler } from '../../src/util/openInEditor'
import type { PromptHandler } from '../../src/util/prompt'

export const prompt = vi.fn<PromptHandler>(async () => {
  throw new Error('`prompt` handler is not mocked')
})

export const openFile = vi.fn<OpenFileHandler>()

export const log = vi.fn<LogHandler>()

export function debug() {
  log.mockImplementation(logToConsole)
}

function logToConsole(type: 'info' | 'warn' | 'error', ...args: any[]) {
  switch (type) {
    case 'info':
      console.log(...args)
      break
    case 'warn':
      console.warn(...args)
      break
    case 'error':
      console.error(...args)
      break
  }
}
