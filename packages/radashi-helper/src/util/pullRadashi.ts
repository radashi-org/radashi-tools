import { exec } from 'exec'
import { existsSync } from 'node:fs'
import { memo } from 'radashi'
import type { Env } from '../env'
import { cloneRadashi, getRadashiCloneURL } from './cloneRadashi'
import { forwardStderrAndRethrow } from './error'
import { prepareGitHubDefaultRepo } from './github'
import { isExactCommit } from './isExactCommit'
import { log } from './log'
import { stdio } from './stdio'

export const pullRadashi = memo<[env: Env], Promise<void>>(
  async function pullRadashi(env) {
    const ref = await env.radashiRef

    if (existsSync(env.radashiDir)) {
      if (isExactCommit(ref)) {
        if (await isRepoInSync(ref, { cwd: env.radashiDir })) {
          return
        }

        log('Updating radashi. Please wait...')

        // Ensure the remote URL is set to the correct clone URL. For
        // exact alpha/beta versions, the tags are stored in another
        // repository.
        await exec(
          'git',
          ['remote', 'set-url', 'origin', getRadashiCloneURL(ref)],
          { cwd: env.radashiDir },
        ).catch(forwardStderrAndRethrow)

        // In case the ref was not found, fetch the latest changes.
        await exec('git', ['fetch', 'origin', ref], {
          cwd: env.radashiDir,
          stdio,
        })

        await exec('git', ['checkout', ref], {
          cwd: env.radashiDir,
        }).catch(forwardStderrAndRethrow)
      } else {
        // Switch to the branch if it's not already checked out.
        await exec('git', ['checkout', ref], {
          cwd: env.radashiDir,
          reject: false,
        })

        log('Updating radashi. Please wait...')

        await exec('git', ['pull', 'origin', ref], {
          cwd: env.radashiDir,
          stdio,
        })
      }

      await prepareGitHubDefaultRepo(env.radashiDir)
    } else {
      log('Cloning radashi. Please wait...')
      await cloneRadashi(ref, env.radashiDir, {
        stdio,
      })
    }

    // await exec('git', ['checkout', '-b', 'dev'], {
    //   cwd: env.radashiDir,
    // }).catch(forwardStderrAndRethrow)

    // await exec('git', ['branch', '--set-upstream-to=origin/' + ref], {
    //   cwd: env.radashiDir,
    // }).catch(forwardStderrAndRethrow)
  },
  {
    // Only run this function once per process.
    key: env => env.pkg.dependencies?.radashi ?? '',
  },
)

/**
 * Resolves to `true` if the repository is in sync with the given ref name.
 */
async function isRepoInSync(ref: string, opts: { cwd: string }) {
  try {
    const { stdout: refCommit } = await exec(
      'git',
      ['rev-parse', '--verify', ref],
      opts,
    )

    const { stdout: headCommit } = await exec(
      'git',
      ['rev-parse', 'HEAD'],
      opts,
    )

    return refCommit === headCommit
  } catch (error) {
    return false
  }
}
