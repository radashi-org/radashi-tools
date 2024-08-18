import path from 'node:path'
import { inspect } from 'node:util'
import { isString } from 'radashi'
import stripAnsi from 'strip-ansi'
import { gitDiff, type GitDiffMode } from './git'
import { log, openFile, prompt } from './mocks'

export function expectLogsToMatchSnapshot(rewriter?: (str: string) => string) {
  const formatLog = (call: any[]) =>
    stripAnsi(
      call
        .slice(1)
        .map(arg => (isString(arg) ? arg : inspect(arg)))
        .join(' '),
    ).replace(/^/gm, `[${call[0]}] `)

  let logs = log.mock.calls.map(formatLog).join('\n')
  if (rewriter) {
    logs = rewriter(logs)
  }

  expect(logs).toMatchSnapshot('logs')
}

export function expectPromptsToMatchSnapshot() {
  expect(prompt.mock.calls).toMatchSnapshot('interactive prompts')
}

export function expectOpenedFilesToMatchSnapshot() {
  expect(
    openFile.mock.calls.map(call => path.relative(process.cwd(), call[0])),
  ).toMatchSnapshot('opened files')
}

export async function expectGitDiffToMatchSnapshot(mode: GitDiffMode) {
  expect(await gitDiff(mode)).toMatchSnapshot(`git diff (${mode})`)
}
