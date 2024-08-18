import {
  expectGitDiffToMatchSnapshot,
  expectLogsToMatchSnapshot,
  expectOpenedFilesToMatchSnapshot,
  expectPromptsToMatchSnapshot,
} from './util/expect'
import { prompt } from './util/mocks'
import { run } from './util/run'

test('create a function', async () => {
  const responses: Record<string, any> = {
    funcName: 'test',
    selectedGroup: 'new',
    newGroup: 'test',
    description: 'test',
  }

  prompt.mockImplementation(async options => {
    return responses[options.name]
  })

  await run('fn create')

  expectLogsToMatchSnapshot()
  expectPromptsToMatchSnapshot()
  expectOpenedFilesToMatchSnapshot()
  await expectGitDiffToMatchSnapshot('all-staged')
})
