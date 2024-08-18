import { execa, type Options as ExecaOptions } from 'execa'
import type { PackageJson } from 'type-fest'
import { forwardStderrAndRethrow, RadashiError } from './error'
import { prepareGitHubDefaultRepo } from './github'

export async function getInstalledRadashiRef(pkg: PackageJson) {
  const specifier = pkg.dependencies?.radashi
  if (!specifier) {
    throw new RadashiError('No radashi dependency found in package.json')
  }

  let ref = specifier.split('@').pop()!

  if (ref === 'beta') {
    ref = 'main'
  } else if (ref !== 'next') {
    ref = await execa('npm', ['view', 'radashi@' + ref, '--json']).then(
      ({ stdout }) => 'v' + JSON.parse(stdout).version,
    )
  }

  return ref
}

export function isPreReleaseRadashiTag(ref: string) {
  return /-(beta|alpha)/.test(ref)
}

export function getRadashiCloneURL(ref: string) {
  let cloneUrl = 'https://github.com/radashi-org/radashi'
  if (isPreReleaseRadashiTag(ref)) {
    // The "radashi-beta" repo is where versioned pre-release tags are
    // stored, which helps to avoid spamming the main repo.
    cloneUrl += '-beta'
  }
  return cloneUrl
}

export async function cloneRadashi(
  ref: string,
  dir: string,
  opts: ExecaOptions = {},
) {
  const cloneUrl = getRadashiCloneURL(ref)
  await execa(
    'git',
    ['clone', cloneUrl, '--branch', ref, '--single-branch', dir],
    opts,
  ).catch(error => {
    if (opts.stdio == null) {
      forwardStderrAndRethrow(error)
    }
    throw error
  })
  await prepareGitHubDefaultRepo(dir)
}
