import { noop } from 'radashi'

export let log: {
  (msg: string, ...args: any[]): void
  warn(msg: string, ...args: any[]): void
  error(msg: string, ...args: any[]): void
}

export type LogHandler = (
  type: 'info' | 'warn' | 'error',
  msg: string,
  ...args: any[]
) => void

export function setLogHandler(handler: LogHandler) {
  log = ((msg, ...args) => handler('info', msg, ...args)) as typeof log
  log.warn = (msg, ...args) => handler('warn', msg, ...args)
  log.error = (msg, ...args) => handler('error', msg, ...args)
}

setLogHandler(noop)
