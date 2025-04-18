import $, { type PicospawnResult } from 'picospawn'

export type GitDiffMode = 'all-staged' | 'last-commit'

export async function gitDiff(mode: GitDiffMode) {
  let diff: PicospawnResult
  if (mode === 'all-staged') {
    await $('git', ['add', '-A'])
    diff = await $('git diff --staged')
  } else if (mode === 'last-commit') {
    diff = await $('git diff HEAD^')
  } else {
    throw new Error(`Unknown git diff mode: ${mode}`)
  }
  return diff.stdout
}

export async function gitCurrentBranch(cwd = process.cwd()) {
  return (await $('git rev-parse --abbrev-ref HEAD', { cwd })).stdout
}

export async function gitBranchExists(branch: string, cwd = process.cwd()) {
  const { exitCode } = await $('git rev-parse --verify', [branch], {
    cwd,
    reject: false,
  })
  return exitCode === 0
}

/**
 * Reset the current branch to the given ref.
 */
export async function gitHardReset(ref: string, cwd = process.cwd()) {
  if (!cwd.includes('my-radashi')) {
    throw new Error(
      'To prevent accidental data loss, `gitHardReset` can only be run in the `my-radashi` directory',
    )
  }

  // Reset the files.
  await $('git checkout %s -f', [ref], { cwd })
  await $('git reset --hard', [ref], { cwd })
  await $('git clean -df', { cwd })
}

/**
 * Squash all commits of the current branch into a single commit.
 */
export async function gitClobberBranch(cwd = process.cwd()) {
  if (!cwd.includes('my-radashi')) {
    throw new Error(
      'To prevent accidental data loss, `gitClobberBranch` can only be run in the `my-radashi` directory',
    )
  }

  await $('git checkout --orphan tmp', { cwd })
  await $('git commit -m', ['Initial commit'], { cwd })
  await $('git branch -D test', { cwd })
  await $('git branch -m test', { cwd })
}

export async function getGitCommitSHAs({
  short,
  cwd = process.cwd(),
}: {
  short?: boolean
  cwd?: string
} = {}) {
  const lines = (await $('git log --pretty=format:%H', { cwd })).stdout.split(
    '\n',
  )
  if (short) {
    return lines.map(sha => sha.slice(0, 7))
  }
  return lines
}
