import escalade from 'escalade/sync'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import LazyPromise from 'p-lazy'
import { isString } from 'radashi'
import type { PackageJson } from 'type-fest'
import { getInstalledRadashiRef } from './util/cloneRadashi'
import { RadashiError } from './util/error'
import { log } from './util/log'

// These config options don't have default values.
interface OptionalConfig {
  /**
   * The editor to use when opening a new function.
   */
  editor?: string
  /**
   * Packages that have been imported into the project.
   */
  vendor?: VendorConfig[]
}

/**
 * The config located at `./radashi.json`
 */
export interface UserConfig extends OptionalConfig {
  /**
   * Whether to emit TypeScript declaration files.
   *
   * @default false
   */
  dts?: boolean
  /**
   * Control which bundle formats are used.
   *
   * @default ['esm']
   */
  formats?: ('esm' | 'cjs')[]
}

/**
 * The config for a package that has been imported into the project.
 */
interface VendorConfig {
  /** The name of the package. */
  name: string
  /**
   * The exports to include from the package. If undefined, all
   * exports are included.
   *
   * Note that type exports are also affected by this option.
   */
  include?: string[]
  /**
   * The exports to exclude from the package. If undefined, no exports
   * are excluded.
   *
   * Note that type exports are also affected by this option.
   */
  exclude?: string[]
  /**
   * The exports to rename from the package. Any exports listed here
   * are automatically added to the `include` array (if not already
   * present).
   */
  rename?: Record<string, string>
}

export interface Config
  extends Required<Omit<UserConfig, keyof OptionalConfig>>,
    OptionalConfig {}

export interface Env {
  pkg: PackageJson
  config: Config
  configPath: string
  root: string
  modPath: string
  outDir: string
  radashiDir: string
  overrideDir: string
  radashiRef: LazyPromise<string>
}

export function getEnv(root?: string | void): Env {
  root = root
    ? resolve(root)
    : escalade(
        process.cwd(),
        (dir, files) =>
          (dir.includes('radashi') || files.includes('radashi.json')) && dir,
      )

  if (!isString(root)) {
    throw new RadashiError('Could not find your Radashi root directory')
  }

  const pkg = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as PackageJson

  const radashiDir = join(root, '.radashi/upstream')
  const overrideDir = join(root, 'overrides')

  const [configPath, config] = getConfig(root)

  return {
    pkg,
    root,
    modPath: join(root, 'mod.ts'),
    config,
    configPath,
    outDir: process.env.RADASHI_OUT_DIR || join(root, 'dist'),
    radashiDir,
    overrideDir,
    radashiRef: new LazyPromise((resolve, reject) => {
      getInstalledRadashiRef(pkg).then(resolve, reject)
    }),
  }
}

function getConfig(root: string) {
  const configPath = join(root, 'radashi.json')

  let userConfig: UserConfig
  try {
    userConfig = JSON.parse(readFileSync(configPath, 'utf8')) as UserConfig
  } catch (error) {
    log.error('Error parsing radashi.json:', error)
    userConfig = {} as UserConfig
  }

  let editor = userConfig.editor?.replace(
    /^\$EDITOR$/,
    process.env.EDITOR ?? '',
  )
  if (editor === '!') {
    editor = ''
  }

  const userFormats = userConfig.formats?.filter(
    value => value === 'esm' || value === 'cjs',
  )

  const config: Config = {
    dts: true,
    ...userConfig,
    formats: userFormats && userFormats.length > 0 ? userFormats : ['esm'],
    editor: editor || undefined,
  }

  return [configPath, config] as const
}
