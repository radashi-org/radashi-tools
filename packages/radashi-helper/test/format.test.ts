import { expectForkSnapshot } from './util/mocks'
import { run } from './util/run'

test.skip('format', async () => {
  await run('format')
  await expectForkSnapshot()
})
