import { existsSync } from 'node:fs'
import $ from 'picospawn'
import { memo } from 'radashi'
import type { Env } from '../env'
import { cloneRadashi, getRadashiCloneURL } from './cloneRadashi'
import { forwardStderrAndRethrow, RadashiError } from './error'
import { prepareGitHubDefaultRepo } from './github'
import { isExactCommit } from './isExactCommit'
import { log } from './log'
import { stdio } from './stdio'

export const pullRadashi = memo<[env: Env], Promise<void>>(
  async function pullRadashi(env) {
    if (!env.radashiDir) {
      throw new RadashiError('No upstream repository exists')
    }

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
        await $('git remote set-url origin', [getRadashiCloneURL(ref)], {
          cwd: env.radashiDir,
        }).catch(forwardStderrAndRethrow)

        // In case the ref was not found, fetch the latest changes.
        await $('git fetch origin', [ref], {
          cwd: env.radashiDir,
          stdio,
        })

        await $('git checkout', [ref], {
          cwd: env.radashiDir,
        }).catch(forwardStderrAndRethrow)
      } else {
        // Switch to the branch if it's not already checked out.
        await $('git checkout', [ref], {
          cwd: env.radashiDir,
          reject: false,
        })

        log('Updating radashi. Please wait...')

        try {
          await $('git pull origin', [ref], {
            cwd: env.radashiDir,
            stdio,
          })
        } catch {
          console.error('Pull exited with an error. Continuing...')
        }
      }

      await prepareGitHubDefaultRepo(env.radashiDir)
    } else {
      log('Cloning radashi. Please wait...')
      await cloneRadashi(ref, env.radashiDir, {
        stdio,
      })
    }
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
    const refCommit = (await $('git rev-parse --verify', [ref], opts)).stdout
    const headCommit = (await $('git rev-parse HEAD', opts)).stdout

    return refCommit === headCommit
  } catch (error) {
    return false
  }
}
