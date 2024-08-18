import glob from 'fast-glob'
import type { Env } from '../env'

const fileTypes = ['src', 'overrides', 'rewired'] as const

type FileType = (typeof fileTypes)[number]

export async function findSources<Only extends FileType = FileType>(
  env: Env,
  only?: Only[],
): Promise<{
  src: 'src' extends Only ? string[] : undefined
  overrides: 'overrides' extends Only ? string[] : undefined
  rewired: 'rewired' extends Only ? string[] : undefined
}>

export async function findSources(
  env: Env,
  only?: FileType[],
): Promise<{
  src: string[] | undefined
  overrides: string[] | undefined
  rewired: string[] | undefined
}> {
  const [src, overrides, rewired] = await Promise.all(
    [
      {
        id: 'src' as const,
        glob: ['src/**/*.ts', '!src/*.ts'],
      },
      {
        id: 'overrides' as const,
        glob: ['overrides/src/**/*.ts', '!overrides/src/*.ts'],
      },
      {
        id: 'rewired' as const,
        glob: ['overrides/rewired/**/*.ts'],
      },
    ].map(file =>
      only?.includes(file.id) !== false
        ? glob(file.glob, {
            cwd: env.root,
            absolute: true,
          })
        : undefined,
    ),
  )

  return {
    src,
    overrides,
    rewired,
  }
}
