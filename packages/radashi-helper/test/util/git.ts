import { execa, type Result } from 'execa'

export type GitDiffMode = 'all-staged' | 'last-commit'

export async function gitDiff(mode: GitDiffMode) {
  let diff: Result
  if (mode === 'all-staged') {
    await execa('git', ['add', '-A'])
    diff = await execa('git', ['diff', '--staged'])
  } else if (mode === 'last-commit') {
    diff = await execa('git', ['diff', 'HEAD^'])
  } else {
    throw new Error(`Unknown git diff mode: ${mode}`)
  }
  return diff.stdout
}

export async function gitCurrentBranch(cwd = process.cwd()) {
  const { stdout: currentBranch } = await execa(
    'git',
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    { cwd },
  )
  return currentBranch
}

export async function gitBranchExists(branch: string, cwd = process.cwd()) {
  const { exitCode } = await execa('git', ['rev-parse', '--verify', branch], {
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
  await execa('git', ['checkout', ref, '-f'], { cwd })
  await execa('git', ['reset', '--hard', ref], { cwd })
  await execa('git', ['clean', '-df'], { cwd })
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

  await execa('git', ['checkout', '--orphan', 'tmp'], { cwd })
  await execa('git', ['commit', '-m', 'Initial commit'], { cwd })
  await execa('git', ['branch', '-D', 'test'], { cwd })
  await execa('git', ['branch', '-m', 'test'], { cwd })
}

export async function getGitCommitSHAs({
  short,
  cwd = process.cwd(),
}: {
  short?: boolean
  cwd?: string
} = {}) {
  const { stdout } = await execa('git', ['log', '--pretty=format:%H'], {
    cwd,
  })
  return short
    ? stdout.split('\n').map(sha => sha.slice(0, 7))
    : stdout.split('\n')
}
