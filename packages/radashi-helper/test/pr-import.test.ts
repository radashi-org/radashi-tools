import {
  expectGitDiffToMatchSnapshot,
  expectLogsToMatchSnapshot,
} from './util/expect'
import { getGitCommitSHAs } from './util/git'
import { run } from './util/run'
import { replaceWordsInString } from './util/string'

test('import a pr', async () => {
  await run('pr import 208')

  // Commit hashes are non-deterministic, so we replace them with a
  // placeholder.
  const commits = await getGitCommitSHAs({ short: true })
  expectLogsToMatchSnapshot(logs =>
    replaceWordsInString(logs, commits, '*******'),
  )

  await expectGitDiffToMatchSnapshot('last-commit')
})
