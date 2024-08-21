import { execa } from 'execa'
import globRegex from 'glob-regex'
import { yellow } from 'kleur/colors'
import { existsSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { botCommit } from './bot'
import type { CommonOptions } from './cli/options'
import { type Env, getEnv } from './env'
import { addOverride } from './fn-override'
import { undoRewire } from './rewired/undoRewire'
import { assertRepoClean } from './util/assertRepoClean'
import { checkCommand } from './util/checkCommand'
import { isPreReleaseRadashiTag } from './util/cloneRadashi'
import { debug } from './util/debug'
import { dedent } from './util/dedent'
import {
  EarlyExitError,
  forwardStderrAndRethrow,
  RadashiError,
} from './util/error'
import { findSources } from './util/findSources'
import { log } from './util/log'
import { prompt } from './util/prompt'
import { pullRadashi } from './util/pullRadashi'

export async function importPullRequest(
  prNumber: string,
  options: CommonOptions,
) {
  if (Number.isNaN(+prNumber)) {
    throw new RadashiError(`Invalid PR number "${prNumber}"`)
  }

  if (!(await checkCommand('gh'))) {
    throw new RadashiError(
      dedent`
        gh command is not installed.

        You can install it using Homebrew:
          brew install gh

        Or using the official website:
          https://cli.github.com/
      `,
    )
  }

  const env = options.env ?? getEnv(options.dir)

  await assertRepoClean(env.root)
  await pullRadashi(env)

  // Delete previous PR branch.
  await execa('git', ['branch', '-D', 'pr-' + prNumber], {
    cwd: env.radashiDir,
    reject: false,
  })

  log('Checking out PR...')

  // Checkout the PR.
  await execa('gh', ['pr', 'checkout', prNumber, '-b', 'pr-' + prNumber], {
    cwd: env.radashiDir,
  }).catch(error => {
    log.error(error.stderr)

    let reason = ''
    if (error.message.includes('Could not resolve')) {
      reason = `Could not find any PR with number ${prNumber}.`
    } else if (error.message.includes("couldn't find remote ref")) {
      reason = 'The author appears to have deleted the PR branch.'
    }

    throw new RadashiError(
      'Failed to checkout PR' + (reason ? `: ${reason}` : ''),
    )
  })

  // Get the target branch of the PR.
  const targetBranch = await getTargetBranch(env)

  debug('Target branch of the PR:', targetBranch)

  // Ensure the target branch exists locally and is up-to-date.
  await execa(
    'git',
    ['fetch'].concat(
      targetBranch.includes('/')
        ? targetBranch.split('/')
        : ['origin', targetBranch],
    ),
    {
      cwd: env.radashiDir,
    },
  ).catch(forwardStderrAndRethrow)

  // Get the base commit of the PR
  const baseCommit = await execa('git', ['merge-base', 'HEAD', targetBranch], {
    cwd: env.radashiDir,
  }).then(r => r.stdout)

  debug('Base commit of the PR:', baseCommit)

  // Determine which files were changed or added.
  const changes = await parseGitDiff(baseCommit, {
    cwd: env.radashiDir,
  })

  debug('Parsed changes from git diff:', changes)

  const pathsIn = await findSources(env)

  // Sort source files first.
  const srcGlob = globRegex('src/*/*.ts')
  changes.sort((a, b) => {
    return srcGlob.test(a.file) && !srcGlob.test(b.file)
      ? -1
      : srcGlob.test(b.file) && !srcGlob.test(a.file)
        ? 1
        : a.file.localeCompare(b.file)
  })

  const addedFiles: string[] = []
  const modifiedFiles: string[] = []

  for (const change of changes) {
    if (change.status === 'A') {
      addedFiles.push(change.file)

      if (change.file.startsWith('src/')) {
        const srcPath = join(env.root, change.file)
        if (pathsIn.src.includes(srcPath)) {
          throw new RadashiError(
            `Cannot import PR. File named "${change.file}" is already a source file created by you.`,
          )
        }
      }
    } else if (change.status === 'M' && change.file !== 'src/mod.ts') {
      modifiedFiles.push(change.file)

      if (change.file.startsWith('src/')) {
        const overridePath = join(
          env.root,
          change.file.replace('src/', 'overrides/src/'),
        )
        if (pathsIn.overrides.includes(overridePath)) {
          throw new RadashiError(
            `Cannot import PR. File named "${change.file}" already exists in the overrides folder.`,
          )
        }

        const funcPath = relative(env.overrideDir, overridePath).slice(0, -3)
        const rewiredPath = overridePath.replace('/src/', '/rewired/')

        if (pathsIn.rewired.includes(rewiredPath)) {
          // Remove rewired files that were modified by the PR.
          await undoRewire(funcPath, env)
        }

        // Override the file before applying the PR modifications.
        await addOverride(funcPath, {
          env,
          exactMatch: true,
          fromBranch: baseCommit,
        })
      }
    }
  }

  for (const file of addedFiles) {
    debug(`Adding "${file}" to project`)
    await tryCopyFile(join(env.radashiDir, file), join(env.root, file))
  }
  for (const file of modifiedFiles) {
    debug(`Modifying "${file}" override in project`)
    await tryCopyFile(
      join(env.radashiDir, file),
      join(env.root, 'overrides', file),
    )
  }

  let prTitle = await execa(
    'gh',
    ['pr', 'view', '--json', 'title', '--jq', '.title'],
    { cwd: env.radashiDir },
  ).then(result => result.stdout.trim())

  const validTitleRE =
    /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([^):]+\))?: /

  if (!validTitleRE.test(prTitle)) {
    log.error('')
    log.error(
      yellow('ATTN'),
      'The PR title does not follow the Conventional Commits format.',
    )
    log.error('Please select the type of change this PR introduces:\n')

    const type = await prompt({
      type: 'autocomplete',
      name: 'type',
      message: 'Select the type of change:',
      choices: getConventionalCommitTypes(),
    })
    if (!type) {
      throw new EarlyExitError('No change type selected. Exiting...')
    }

    const description = await prompt({
      type: 'text',
      name: 'description',
      message: 'Enter a short description of the change:',
    })
    if (!description) {
      throw new EarlyExitError('No description provided. Exiting...')
    }

    prTitle = `${type}: ${description}`
  }

  // Update mod.ts
  const { default: build } = await import('./build')
  await build({ env })

  // Print a blank line.
  log('')

  await botCommit(prTitle, {
    cwd: env.root,
    add: ['-A'],
  })
}

async function tryCopyFile(src: string, dst: string) {
  if (existsSync(src)) {
    try {
      await mkdir(dirname(dst), { recursive: true })
      await copyFile(src, dst)
      return true
    } catch {}
  }
  return false
}

async function parseGitDiff(ref: string, opts: { cwd: string }) {
  const { stdout: nameStatus } = await execa(
    'git',
    ['diff', ref, '--name-status'],
    opts,
  )
  return nameStatus
    .trim()
    .split('\n')
    .map(line => {
      const [status, file] = line.split('\t')
      return { status, file }
    })
}

/**
 * Get the remote branch being targeted by the currently checked-out pull request.
 */
async function getTargetBranch(env: Env) {
  const { stdout } = await execa(
    'gh',
    ['pr', 'view', '--json', 'baseRefName', '--jq', '.baseRefName'],
    { cwd: env.radashiDir },
  )
  const targetBranch = stdout?.trim() ?? 'main'
  const radashiRef = await env.radashiRef
  if (isPreReleaseRadashiTag(radashiRef)) {
    return 'radashi/' + targetBranch
  }
  return targetBranch
}

function getConventionalCommitTypes() {
  return [
    {
      title: 'feat',
      description: 'A new feature',
      value: 'feat',
    },
    {
      title: 'fix',
      description: 'A bug fix',
      value: 'fix',
    },
    {
      title: 'docs',
      description: 'Documentation only changes',
      value: 'docs',
    },
    {
      title: 'style',
      description: 'Changes that do not affect the meaning of the code',
      value: 'style',
    },
    {
      title: 'refactor',
      description: 'A code change that neither fixes a bug nor adds a feature',
      value: 'refactor',
    },
    {
      title: 'perf',
      description: 'A code change that improves performance',
      value: 'perf',
    },
    {
      title: 'test',
      description: 'Adding missing tests or correcting existing tests',
      value: 'test',
    },
    {
      title: 'build',
      description:
        'Changes that affect the build system or external dependencies',
      value: 'build',
    },
    {
      title: 'ci',
      description: 'Changes to our CI configuration files and scripts',
      value: 'ci',
    },
    {
      title: 'chore',
      description: "Other changes that don't modify src or test files",
      value: 'chore',
    },
    {
      title: 'revert',
      description: 'Reverts a previous commit',
      value: 'revert',
    },
  ]
}
