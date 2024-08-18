import * as vscode from 'vscode'
import { execIntoOutputChannel } from '../util/exec'
import type { RadashiFolder } from '../util/getRadashiFolder'

export async function importPullRequest(radashiFolder: RadashiFolder) {
  const prNumber = await vscode.window.showInputBox({
    prompt: 'Enter the pull request number',
  })
  if (!prNumber) {
    return
  }

  await execIntoOutputChannel('pnpm', ['radashi', 'pr', 'import', prNumber])
}
