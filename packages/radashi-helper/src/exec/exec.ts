import type { IOType } from 'node:child_process'
import { type Stream, Writable } from 'node:stream'
import { isArray, isFunction } from 'radashi'
import spawn from 'tinyspawn'

type Falsy = null | undefined | false | ''

export function exec(
  command: string,
  args: (string | Falsy)[],
  options?: ExecOptions,
) {
  let stdoutSink: Writable | undefined
  let stderrSink: Writable | undefined

  const stdio = options?.stdio
  if (isArray(stdio)) {
    let [stdin, stdout, stderr] = stdio
    if (isFunction(stdout)) {
      stdoutSink = createAsyncGeneratorStream(stdout, process.stdout)
      stdout = 'pipe'
    }
    if (isFunction(stderr)) {
      stderrSink = createAsyncGeneratorStream(stderr, process.stderr)
      stderr = 'pipe'
    }
    if (stdio[1] !== stdout || stdio[2] !== stderr) {
      options = { ...options, stdio: [stdin, stdout, stderr] }
    }
  }

  const proc = spawn(command, args as string[], options as TinySpawnOptions)

  if (stdoutSink) {
    proc.stdout!.pipe(stdoutSink)
  }
  if (stderrSink) {
    proc.stderr!.pipe(stderrSink)
  }

  if (options?.reject === false) {
    return Object.assign(
      proc.catch(error => error),
      proc,
    )
  }

  return proc
}

type TinySpawnOptions = Extract<Parameters<typeof spawn.extend>[0], object>

export type ExecOptions = Omit<TinySpawnOptions, 'stdio'> & {
  reject?: boolean
  stdio?: StdioOption
}

export type StdioOption =
  | IOType
  | Array<
      | ((chunk: unknown) => AsyncGenerator<unknown, void, void>)
      | IOType
      | 'ipc'
      | Stream
      | number
      | null
      | undefined
    >

function createAsyncGeneratorStream(
  init: (chunk: unknown) => AsyncGenerator<unknown, void, void>,
  sink: Writable,
): Writable {
  let generator: AsyncGenerator<unknown, void, void> | undefined

  return new Writable({
    async write(chunk, encoding, callback) {
      try {
        const data = chunk.toString('utf8')
        const result = await (generator ??= init(data)).next(data)
        if (!result.done && result.value !== undefined) {
          sink.write(result.value)
        }
        callback()
      } catch (error: any) {
        callback(error)
      }
    },
    async final(callback) {
      try {
        await generator?.return()
        callback()
      } catch (error: any) {
        callback(error)
      }
    },
  })
}
