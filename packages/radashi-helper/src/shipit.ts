import { execa } from 'execa'
import fs, { readFile, rename, writeFile } from 'node:fs/promises'
import { Module } from 'node:module'
import { join, sep } from 'node:path'
import { omit } from 'radashi'
import type { CommonOptions } from './cli/options'
import { getEnv } from './env'
import { cwdRelative } from './util/cwdRelative'
import { RadashiError } from './util/error'
import { log } from './util/log'
import { stdio } from './util/stdio'

export interface ShipItOptions extends CommonOptions {
  dryRun?: boolean
  debug?: boolean
}

export async function shipIt(options: ShipItOptions) {
  const env = getEnv(options.dir)

  options = {
    ...options,
    dryRun: options.dryRun ?? options.debug,
  }

  if (!options.debug) {
    if (env.pkg.name === '@yourname/radashi') {
      throw new RadashiError(
        'Please update the "name" field in your package.json to include your NPM username.\n\n' +
          `You might want to search-and-replace the entire project with "${env.pkg.name}" as the query.`,
      )
    }

    try {
      const { stdout } = await execa('git', ['status', '--porcelain'], {
        cwd: env.root,
      })
      if (stdout.trim() !== '') {
        throw new RadashiError(
          'There are uncommitted changes in the repository. Please commit or stash them first.',
        )
      }
    } catch (error) {
      throw new RadashiError(`Failed to check git status: ${error}`)
    }
  }

  // Run pnpm build
  if (env.pkg.scripts?.build) {
    await fs.rm(env.outDir, { recursive: true })
    await execa('pnpm', ['build'], {
      cwd: env.root,
      stdio,
      env: {
        RADASHI_OUT_DIR: join(env.outDir, 'dist'),
      },
    })
  }

  if (!env.pkg.name) {
    throw new RadashiError(
      `Missing "name" field in ${cwdRelative(join(env.root, 'package.json'))}`,
    )
  }

  let needBump = options.debug === true

  // Check if the current package version is already published
  const { stdout, exitCode, stderr } = await execa(
    'npm',
    ['view', env.pkg.name!, 'version'],
    {
      cwd: env.root,
      reject: false,
    },
  )

  if (exitCode === 0) {
    const publishedVersion = stdout.trim()

    if (publishedVersion === env.pkg.version) {
      needBump = true
      log(
        `Version ${env.pkg.version} is already published. Please bump the version before publishing.`,
      )
    }
  } else if (exitCode === 1 && stderr.includes('npm ERR! 404')) {
    // Package not found on npm, this might be the first publication
  } else {
    throw new RadashiError(`Failed to check npm version: ${stderr}`)
  }

  if (needBump) {
    const bumpp = resolveDependency('bumpp', import.meta.url)
    const bumppBin = join(bumpp, 'bin/bumpp.js')

    log('')
    const { exitCode } = await execa(
      'node',
      [
        bumppBin,
        ...(options.dryRun
          ? ['--no-commit', '--no-tag']
          : ['-c', 'v%s\n\n[skip ci]']),
        '--no-verify',
        '--no-push',
      ],
      {
        cwd: env.root,
        stdio,
        reject: false,
      },
    )
    if (exitCode !== 0) {
      process.exit(exitCode)
    }

    // Reload env.pkg after bumping
    env.pkg = JSON.parse(await readFile(join(env.root, 'package.json'), 'utf8'))
  }

  const distPackageJson = omit(env.pkg, [
    'private',
    'scripts',
    'devDependencies',
  ])

  const exports = (distPackageJson.exports as Record<string, any>)['.']

  if (!env.config.formats.includes('esm')) {
    if (exports) {
      exports.default = exports.require
      delete exports.require
    }
    delete distPackageJson.module
  }

  if (!env.config.formats.includes('cjs')) {
    if (exports) {
      delete exports.require
    }
    distPackageJson.main = distPackageJson.module
    delete distPackageJson.module
  }

  await writeFile(
    join(env.outDir, 'package.json'),
    JSON.stringify(distPackageJson, null, 2),
  )

  log(
    options.dryRun
      ? '\nWould publish to NPM (dry run)\n'
      : '\nPublishing to NPM\n',
  )

  // Publish to NPM
  await execa('npm', ['publish', ...(options.dryRun ? ['--dry-run'] : [])], {
    cwd: env.outDir,
    stdio,
  })

  if (options.dryRun) {
    log('\nDry run complete. No changes were published.')
  } else {
    log('\nReverting ./dist/ to original state.')
    // Move files from {outDir}/dist into {outDir}
    const tmpDir = env.outDir + '-tmp'
    await rename(join(env.outDir, 'dist'), tmpDir)
    await fs.rm(env.outDir, { recursive: true })
    await rename(tmpDir, env.outDir)
    log('Reverted.')
  }
}

function resolveDependency(name: string, importer: string) {
  const require = Module.createRequire(importer)
  const entryPath = require.resolve(name)
  const entryPathArray = entryPath.split(sep)
  const lastNodeModulesIndex = entryPathArray.lastIndexOf('node_modules')
  return entryPathArray.slice(0, lastNodeModulesIndex + 2).join(sep)
}
