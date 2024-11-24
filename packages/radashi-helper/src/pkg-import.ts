import { exec } from 'exec'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { debug } from './util/debug'
import { RadashiError } from './util/error'
import { stdio } from './util/stdio'
import { updateRadashiConfig } from './util/updateRadashiConfig'

export interface ImportPackageOptions extends CommonOptions {
  exact?: boolean
}

export async function importPackage(
  name: string,
  options: ImportPackageOptions = {},
) {
  const env = options.env ?? getEnv(options.dir)

  if (env.pkg.devDependencies && name in env.pkg.devDependencies) {
    debug(`Package '${name}' is already installed in node_modules.`)
  } else {
    debug(`Package '${name}' is not found in node_modules. Installing...`)

    const { exitCode } = await exec('pnpm', ['install', '-D', name], {
      cwd: env.root,
      stdio,
      reject: false,
    })

    if (exitCode !== 0) {
      throw new RadashiError(
        `Failed to install package '${name}'. See the logs above.`,
      )
    }
  }

  await updateRadashiConfig(env, {
    vendor: [...(env.config.vendor ?? []), { name }],
  })
}
