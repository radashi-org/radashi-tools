import { expectForkSnapshot } from './util/mocks'
import { run } from './util/run'

test.skip('create a pr branch', async () => {
  await run('pr create --dry-run')
  await expectForkSnapshot()
})
