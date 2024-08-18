import { unique } from 'radashi'
import * as vscode from 'vscode'

export async function promptForGroup(
  funcPaths: string[],
): Promise<string | undefined> {
  const OptCreateNewGroup = 'Create new group'

  const groups = [
    ...unique(funcPaths.map(f => f.split('/').slice(0, -1).join('/'))).sort(),
    OptCreateNewGroup,
  ]

  const selectedGroup = await vscode.window.showQuickPick(groups, {
    placeHolder: 'Select or create a group',
  })

  if (selectedGroup === OptCreateNewGroup) {
    return vscode.window.showInputBox({ prompt: 'Enter the new group name' })
  }

  return selectedGroup
}
