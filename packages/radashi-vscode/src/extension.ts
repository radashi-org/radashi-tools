import * as vscode from 'vscode'
import { getRadashiFolder } from './util/getRadashiFolder.js'
import { outputChannel } from './util/outputChannel.js'

export async function activate(context: vscode.ExtensionContext) {
  async function activate() {
    outputChannel.appendLine('🔍 Searching for Radashi workspace...')

    const radashiFolder = await getRadashiFolder()

    const open = (url: string) => {
      vscode.env.openExternal(vscode.Uri.parse(url))
    }

    const registerCommand = (
      command: string,
      callback: () => void | Promise<void>,
    ) => {
      context.subscriptions.push(
        vscode.commands.registerCommand(command, async () => {
          try {
            await callback()
          } catch (error: any) {
            outputChannel.appendLine(
              `🚫 Error executing command "${command}": ${error.stack}`,
            )
            throw error
          }
        }),
      )
    }

    registerCommand('radashi.searchFunctions', async () => {
      const { searchFunctions } = await import('./commands/searchFunctions.js')
      searchFunctions(radashiFolder)
    })

    registerCommand('radashi.proposeNewFunction', () => {
      open('https://github.com/orgs/radashi-org/discussions/new?category=ideas')
    })

    registerCommand('radashi.applyToCoreTeam', () => {
      open('https://github.com/orgs/radashi-org/discussions/4')
    })

    registerCommand('radashi.exploreCoreFunctions', () => {
      open('https://radashi.js.org/reference')
    })

    await vscode.commands.executeCommand(
      'setContext',
      'radashi.hasRadashiWorkspace',
      !!radashiFolder && radashiFolder.type === 'workspace',
    )

    if (radashiFolder) {
      outputChannel.appendLine(
        `🏛️ Radashi workspace found at ${radashiFolder.path} (${radashiFolder.type})`,
      )

      registerCommand('radashi.createFunction', async () => {
        const helper = await radashiFolder.importHelper()
        await helper.run(['fn', 'create', '--dir', radashiFolder.path])
      })

      registerCommand('radashi.moveFunction', async () => {
        const helper = await radashiFolder.importHelper()
        await helper.run(['fn', 'move', '--dir', radashiFolder.path])
      })

      registerCommand('radashi.overrideFunction', async () => {
        const helper = await radashiFolder.importHelper()
        await helper.run(['fn', 'override', '--dir', radashiFolder.path])
      })

      registerCommand('radashi.importFunction', async () => {
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
        const helper = await radashiFolder.importHelper()
        await helper.run([
          'pr',
          'import',
          prNumber,
          '--dir',
          radashiFolder.path,
        ])
      })
    } else {
      outputChannel.appendLine(`🚫 Radashi workspace not found`)
    }
  }

  activate().catch(error => {
    outputChannel.appendLine(`🚫 Error activating Radashi: ${error.stack}`)
  })

  function reactivate() {
    outputChannel.appendLine('🔄 Reactivating Radashi...')

    // Dispose all existing subscriptions
    context.subscriptions.forEach(subscription => subscription.dispose())
    context.subscriptions.length = 0

    // Reactivate the extension
    activate().catch(error => {
      outputChannel.appendLine(`🚫 Error re-activating Radashi: ${error.stack}`)
    })
  }

  // Listen for workspace changes
  vscode.workspace.onDidChangeWorkspaceFolders(reactivate)

  // Listen for changes to the workspace configuration
  vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration('radashi.path')) {
      reactivate()
    }
  })
}

export function deactivate() {}
