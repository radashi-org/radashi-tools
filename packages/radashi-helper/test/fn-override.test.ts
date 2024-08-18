import { existsSync } from 'node:fs'
import {
  expectGitDiffToMatchSnapshot,
  expectLogsToMatchSnapshot,
  expectOpenedFilesToMatchSnapshot,
  expectPromptsToMatchSnapshot,
} from './util/expect'
import { getGitCommitSHAs } from './util/git'
import { prompt } from './util/mocks'
import { run } from './util/run'
import { replaceWordsInString } from './util/string'

test('override a function', async () => {
  const responses: Record<string, any> = {
    selectedFunc: 'object/set',
  }

  prompt.mockImplementation(async options => {
    return responses[options.name]
  })

  await run('fn override')

  // Commit hashes are non-deterministic, so we replace them with a
  // placeholder.
  const commits = await getGitCommitSHAs({ short: true })
  expectLogsToMatchSnapshot(logs =>
    replaceWordsInString(logs, commits, '*******'),
  )

  expectPromptsToMatchSnapshot()
  expectOpenedFilesToMatchSnapshot()
  await expectGitDiffToMatchSnapshot('last-commit')

  // Check to make sure rewired modules were actually created.
  expect(existsSync('overrides/rewired/object/construct.ts')).toBe(true)
})
