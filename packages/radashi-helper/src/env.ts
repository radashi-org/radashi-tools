import escalade from 'escalade/sync'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import LazyPromise from 'p-lazy'
import { isString, tryit } from 'radashi'
import type { PackageJson } from 'type-fest'
import { getInstalledRadashiRef } from './util/cloneRadashi'
import { debug } from './util/debug'
import { RadashiError } from './util/error'

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
  configPath: string | null
  root: string
  modPath: string
  outDir: string
  radashiDir: string | null
  overrideDir: string
  radashiRef: LazyPromise<string>
}

export function getEnv(root?: string | void): Env {
  let configRequired = false

  root = root
    ? resolve(root)
    : escalade(process.cwd(), (dir, files) => {
        if (dir.includes('radashi')) {
          return dir
        }
        if (files.includes('radashi.json')) {
          configRequired = true
          return dir
        }
      })

  if (!isString(root)) {
    throw new RadashiError('Could not find your Radashi root directory')
  }

  const pkg = JSON.parse(
    readFileSync(join(root, 'package.json'), 'utf8'),
  ) as PackageJson

  const originUrl = readOriginSync(root)

  const [configPath, config] = getConfig(root, configRequired)

  return {
    pkg,
    root,
    modPath: join(root, 'mod.ts'),
    config,
    configPath,
    outDir: process.env.RADASHI_OUT_DIR || join(root, 'dist'),
    radashiDir: !originUrl?.includes('github.com/radashi-org/radashi')
      ? join(root, '.radashi/upstream')
      : null,
    overrideDir: join(root, 'overrides'),
    radashiRef: new LazyPromise((resolve, reject) => {
      getInstalledRadashiRef(pkg).then(resolve, reject)
    }),
  }
}

function getConfig(root: string, configRequired: boolean) {
  const configPath = join(root, 'radashi.json')

  let userConfig: UserConfig | undefined
  try {
    userConfig = JSON.parse(readFileSync(configPath, 'utf8')) as UserConfig
  } catch (error: any) {
    if (configRequired) {
      error.message = 'Error parsing radashi.json: ' + error.message
      throw error
    }
    debug('Failed to read radashi.json, using defaults')
  }

  let editor = userConfig?.editor?.replace(
    /^\$EDITOR$/,
    process.env.EDITOR ?? '',
  )
  if (editor === '!') {
    editor = ''
  }

  const userFormats = userConfig?.formats?.filter(
    value => value === 'esm' || value === 'cjs',
  )

  const config: Config = {
    dts: true,
    ...userConfig,
    formats: userFormats && userFormats.length > 0 ? userFormats : ['esm'],
    editor: editor || undefined,
  }

  return [userConfig ? configPath : null, config] as const
}

function readOriginSync(root: string) {
  const [err, gitconfig] = tryit(() =>
    readFileSync(join(root, '.git/config'), 'utf8'),
  )()
  if (err) {
    return null
  }

  const originSectionIdx = gitconfig.indexOf('[remote "origin"]')
  if (originSectionIdx === -1) {
    return null
  }

  const urlRegex = /url = (.+)/g
  urlRegex.lastIndex = originSectionIdx
  return urlRegex.exec(gitconfig)?.[1] ?? null
}
