import { getEnv } from '../env'
import { generateUmbrella } from '../util/generateUmbrella'

export function vitestRadashi(): import('vite').Plugin {
  const env = getEnv()

  return {
    name: 'vitest-radashi',
    async load(id) {
      if (id === env.modPath) {
        const code = await generateUmbrella(env)
        return { code }
      }
    },
  }
}
