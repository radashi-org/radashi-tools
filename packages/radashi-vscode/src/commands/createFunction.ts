import * as vscode from 'vscode'
import { execIntoOutputChannel } from '../util/exec.js'
import type { RadashiFolder } from '../util/getRadashiFolder.js'
import { getRadashiFuncPaths } from '../util/getRadashiFuncPaths.js'
import { promptForGroup } from '../util/promptForGroup.js'

export async function createFunction(radashiFolder: RadashiFolder) {
  const functionName = await vscode.window.showInputBox({
    prompt: 'Enter the function name',
  })
  if (!functionName) {
    return
  }

  const funcPaths = await getRadashiFuncPaths(radashiFolder.path)
  const group = await promptForGroup(funcPaths)
  if (!group) {
    return
  }

  const description = await vscode.window.showInputBox({
    prompt: 'Enter a short description for the function',
  })
  if (!description) {
    return
  }

  const result = await execIntoOutputChannel(
    'pnpm',
    [
      'radashi',
      'fn',
      'create',
      functionName,
      '-g',
      group,
      '-d',
      description,
      '--no-editor',
    ],
    {
      cwd: radashiFolder.path,
    },
  )

  if (result.exitCode === 0) {
    vscode.window.showInformationMessage('Function created successfully')
  } else {
    vscode.window.showErrorMessage('Failed to create function')
  }
}
