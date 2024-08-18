import { existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { sift } from 'radashi'
import { getEnv } from './env'
import { cwdRelative } from './util/cwdRelative'
import { findSources } from './util/findSources'
import { log } from './util/log'
import { openInEditor } from './util/openInEditor'
import { projectFolders } from './util/projectFolders'
import { queryFuncs } from './util/queryFuncs'

interface Flags {
  source?: boolean
  test?: boolean
  typeTest?: boolean
  benchmark?: boolean
  docs?: boolean
  all?: boolean
}

export async function openFunction(query = '', flags: Flags = {}) {
  const env = getEnv()

  const sources = await findSources(env, ['src', 'overrides'])
  const { funcPath } = await queryFuncs(
    query,
    sift(
      Object.entries(sources).flatMap(([type, paths]) => {
        const root = join(env.root, type === 'src' ? '' : type, 'src')
        return paths?.map(p => relative(root, p).replace(/\.ts$/, ''))
      }),
    ),
  )

  const targetFolders = flags.all
    ? projectFolders
    : projectFolders.filter(f => {
        return (
          (flags.source && f.name === 'src') ||
          (flags.test && f.extension === '.test.ts') ||
          (flags.typeTest && f.extension === '.test-d.ts') ||
          (flags.benchmark && f.name === 'benchmarks') ||
          (flags.docs && f.name === 'docs')
        )
      })

  let openedCount = 0
  for (const folder of targetFolders) {
    for (const overrideFolder of ['', 'overrides']) {
      const file = join(
        env.root,
        overrideFolder,
        folder.name,
        funcPath + folder.extension,
      )
      if (existsSync(file)) {
        await openInEditor(file, env)
        log(`\nOpening ${cwdRelative(file)}`)
        openedCount++
      }
    }
  }

  if (openedCount === 0) {
    log('\nNo files were found. Exiting.')
  }
}
