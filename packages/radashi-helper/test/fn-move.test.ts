import {
  expectGitDiffToMatchSnapshot,
  expectLogsToMatchSnapshot,
  expectOpenedFilesToMatchSnapshot,
  expectPromptsToMatchSnapshot,
} from './util/expect'
import { prompt } from './util/mocks'
import { run } from './util/run'

test('move a function', async () => {
  const responses: Record<string, any> = {
    selectedFunc: 'number/add',
    action: 'both',
    selectedGroup: 'new',
    newGroup: 'test',
    newFuncName: 'combine',
  }

  prompt.mockImplementation(async options => {
    return responses[options.name]
  })

  await run('fn move')

  expectLogsToMatchSnapshot()
  expectPromptsToMatchSnapshot()
  expectOpenedFilesToMatchSnapshot()
  await expectGitDiffToMatchSnapshot('all-staged')
})
