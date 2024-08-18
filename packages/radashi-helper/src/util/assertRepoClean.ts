import { RadashiError } from './error'
import { isRepoClean } from './isRepoClean'

export async function assertRepoClean(cwd: string) {
  if (!(await isRepoClean(cwd))) {
    throw new RadashiError(
      'Your repository has uncommitted changes.' +
        ' Please commit or stash them before overriding.',
    )
  }
}
