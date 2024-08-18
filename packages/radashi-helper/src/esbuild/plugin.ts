import type { Plugin } from 'esbuild'
import { writeFile } from 'node:fs/promises'
import { type Env, getEnv } from '../env'
import { generateUmbrella } from '../util/generateUmbrella'

export function esbuildRadashi(options?: { root?: string; env?: Env }): Plugin {
  const env = options?.env ?? getEnv(options?.root)

  return {
    name: 'esbuild-radashi',
    setup(build) {
      build.onLoad({ filter: /\/mod\.ts$/, namespace: 'file' }, async args => {
        if (args.path === env.modPath) {
          const code = await generateUmbrella(env)
          await writeFile(
            args.path,
            '// BEWARE: This file is *generated* by the esbuild-radashi plugin. Do not edit directly!\n\n' +
              code,
          )

          return {
            loader: 'ts',
            contents: code,
          }
        }
      })
    },
  }
}
