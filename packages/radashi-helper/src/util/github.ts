import { exec } from 'exec'
import { debug } from './debug'
import { forwardStderrAndRethrow } from './error'

export async function isGitHubAuthenticated() {
  if (process.env.GITHUB_TOKEN) {
    return true
  }

  const { exitCode } = await exec('gh', ['auth', 'status'], { reject: false })
  return exitCode === 0
}

export async function prepareGitHubDefaultRepo(cwd?: string) {
  const radashiUrl = 'https://github.com/radashi-org/radashi'
  const originUrl = await exec('git', ['remote', 'get-url', 'origin'], {
    cwd,
  }).then(r => r.stdout)

  debug('originUrl', originUrl)

  // There needs to exist a remote pointing to the main repository,
  // since the GitHub CLI relies on it.
  if (originUrl !== radashiUrl) {
    await exec('git', ['remote', 'add', 'radashi', radashiUrl], {
      cwd,
      reject: false,
    })

    // If the GitHub CLI is authenticated, make sure it uses the main
    // repository as the default for things like checking out PRs.
    if (await isGitHubAuthenticated()) {
      await exec('gh', ['repo', 'set-default', 'radashi-org/radashi'], {
        cwd,
      }).catch(forwardStderrAndRethrow)
    }
  }
}
