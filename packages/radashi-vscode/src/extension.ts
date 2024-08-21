import * as vscode from 'vscode'
import { getRadashiFolder } from './util/getRadashiFolder.js'
import { importRadashiHelper } from './util/helper.js'

export function activate(context: vscode.ExtensionContext) {
  function activate() {
    const radashiFolder = getRadashiFolder()

    const open = (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url))
    }

    context.subscriptions.push(
      vscode.commands.registerCommand('radashi.searchFunctions', async () => {
        const { searchFunctions } = await import(
          './commands/searchFunctions.js'
        )
        searchFunctions(radashiFolder)
      }),
      vscode.commands.registerCommand('radashi.proposeNewFunction', () => {
        open(
          'https://github.com/orgs/radashi-org/discussions/new?category=ideas',
        )
      }),
      vscode.commands.registerCommand('radashi.applyToCoreTeam', () => {
        open('https://github.com/orgs/radashi-org/discussions/4')
      }),
      vscode.commands.registerCommand('radashi.exploreCoreFunctions', () => {
        open('https://radashi.js.org/reference')
      }),
    )

    vscode.commands.executeCommand(
      'setContext',
      'radashi.hasRadashiWorkspace',
      !!radashiFolder && radashiFolder.type === 'workspace',
    )

    if (radashiFolder) {
      context.subscriptions.push(
        vscode.commands.registerCommand('radashi.createFunction', async () => {
          const helper = await importRadashiHelper()
          await helper.run(['fn', 'create', '--dir', radashiFolder.path])
        }),
        vscode.commands.registerCommand('radashi.moveFunction', async () => {
          const helper = await importRadashiHelper()
          await helper.run(['fn', 'move', '--dir', radashiFolder.path])
        }),
        vscode.commands.registerCommand(
          'radashi.overrideFunction',
          async () => {
            const helper = await importRadashiHelper()
            await helper.run(['fn', 'override', '--dir', radashiFolder.path])
          },
        ),
        vscode.commands.registerCommand('radashi.importFunction', async () => {
          const prNumber = await vscode.window.showInputBox({
            prompt: 'Enter the PR number to import',
            placeHolder: 'e.g. 123',
            validateInput: value => {
              if (!value || !/^\d+$/.test(value)) {
                return 'Please enter a valid PR number'
              }
              return null
            },
          })
          if (!prNumber) {
            return // User cancelled the input
          }
          const helper = await importRadashiHelper()
          await helper.run([
            'pr',
            'import',
            prNumber,
            '--dir',
            radashiFolder.path,
          ])
        }),
      )
    }
  }

  activate()

  // Listen for workspace changes
  vscode.workspace.onDidChangeWorkspaceFolders(() => {
    // Dispose all existing subscriptions
    context.subscriptions.forEach(subscription => subscription.dispose())
    context.subscriptions.length = 0

    // Reactivate the extension
    activate()
  })
}

export function deactivate() {}
