import * as path from 'node:path'
import * as vscode from 'vscode'
import type { RadashiFolder } from '../util/getRadashiFolder.js'
import { promptForGroup } from '../util/promptForGroup.js'

async function moveFunction(radashiFolder: RadashiFolder) {
  const editor = vscode.window.activeTextEditor
  if (!editor) {
    vscode.window.showErrorMessage('No active editor.')
    return
  }

  let functionName: string | undefined

  if (isFunctionFile(editor.document.fileName)) {
    functionName = path
      .basename(editor.document.fileName)
      .replace(/\.(ts|bench\.ts|mdx|test\.ts|test-d\.ts)$/, '')
  } else {
    const functionNames = await getFunctionNames()
    functionName = await vscode.window.showQuickPick(functionNames, {
      placeHolder: 'Select the function to move',
    })
  }

  if (!functionName) {
    return
  }

  const OptRenameFunction = 'Rename function'
  const OptChangeGroup = 'Change group'
  const OptBoth = 'Both rename and change group'

  const options = [OptRenameFunction, OptChangeGroup, OptBoth]
  const choice = await vscode.window.showQuickPick(options, {
    placeHolder: 'What would you like to do?',
  })

  if (!choice) {
    return
  }

  let newName: string | undefined = functionName
  let newGroup: string | undefined = path.basename(
    path.dirname(editor.document.fileName),
  )

  if (choice === OptRenameFunction || choice === OptBoth) {
    newName = await vscode.window.showInputBox({
      prompt: 'Enter the new function name',
      value: functionName,
    })
    if (!newName) {
      return
    }
  }

  if (choice === OptChangeGroup || choice === OptBoth) {
    const funcPaths = await getRadashiFuncPaths(radashiFolder.path)

    newGroup = await promptForGroup(funcPaths)
    if (!newGroup) {
      return
    }
  }

  runShellScript('move_function.sh', [functionName, newName, newGroup])
}

function isFunctionFile(filePath: string): boolean {
  return (
    path.extname(filePath) === '.ts' &&
    /(^|\/)src\//.test(filePath) &&
    !/\.test\.ts$/.test(filePath)
  )
}
