import fs from 'node:fs'
import { inspect } from 'node:util'
import pmemo from 'p-memoize'
import { isString } from 'radashi'
import * as vscode from 'vscode'
import { outputChannel } from './outputChannel.js'

export type RadashiHelper = Awaited<ReturnType<typeof importRadashiHelper>>

export const importRadashiHelper = pmemo(async (pkgPath: string) => {
  outputChannel.appendLine(
    `🔧 Importing radashi-helper from ${fs.realpathSync(pkgPath)}`,
  )

  const helper: typeof import('radashi-helper') = require(pkgPath)
  const { run, RadashiError, EarlyExitError } = helper

  helper.setPromptHandler(async options => {
    switch (options.type) {
      case 'confirm': {
        const quickPick = vscode.window.createQuickPick()
        quickPick.items = [{ label: 'Yes' }, { label: 'No' }]
        quickPick.title = options.message
        quickPick.canSelectMany = false

        return new Promise<boolean>(resolve => {
          quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0]
            quickPick.hide()
            resolve(selection.label === 'Yes')
          })
          quickPick.show()
        })
      }
      case 'autocomplete':
      case 'select': {
        const quickPick = vscode.window.createQuickPick()
        quickPick.items = options.choices!.map(
          (choice): vscode.QuickPickItem => ({
            label: choice.title,
            description: choice.description,
          }),
        )
        quickPick.title = options.message
        quickPick.canSelectMany = false

        return new Promise<any>(resolve => {
          quickPick.onDidAccept(() => {
            const selection = quickPick.selectedItems[0]
            quickPick.hide()
            resolve(
              options.choices!.find(choice => choice.title === selection.label)!
                .value,
            )
          })
          quickPick.show()
        })
      }
      case 'text': {
        const inputBox = vscode.window.createInputBox()
        inputBox.title = options.message

        return new Promise<string>(resolve => {
          inputBox.onDidAccept(() => {
            if (options.validate) {
              const validationResult = options.validate(inputBox.value as any)
              if (validationResult !== true) {
                inputBox.validationMessage = validationResult
                return
              }
            }
            inputBox.hide()
            resolve(inputBox.value)
          })
          inputBox.show()
        })
      }
    }
  })

  helper.setLogHandler((type, msg, ...args) => {
    if (type === 'warn') {
      vscode.window.showWarningMessage(msg)
    } else {
      const prefix = type === 'info' ? '[stdout]' : '[stderr]'
      if (args.length > 0) {
        msg +=
          ' ' +
          args
            .map(arg =>
              isString(arg)
                ? arg
                : inspect(arg, {
                    depth: Number.POSITIVE_INFINITY,
                  }),
            )
            .join(' ')
      }
      msg = msg.replace(/^/gm, `${prefix} `)
      outputChannel.appendLine(msg)
    }
  })

  helper.setFileOpener(async file => {
    const doc = await vscode.workspace.openTextDocument(file)
    vscode.window.showTextDocument(doc)
  })

  // biome-ignore lint/correctness/useYield:
  const stdout = async function* (data: unknown) {
    outputChannel.appendLine(String(data).replace(/^/gm, '[stdout] '))
  }

  // biome-ignore lint/correctness/useYield:
  const stderr = async function* (data: unknown) {
    outputChannel.appendLine(String(data).replace(/^/gm, '[stderr] '))
  }

  helper.setStdio(['ignore', stdout, stderr])

  helper.run = (argv: string[]) =>
    // Since we're not using process.argv, we need a placeholder for
    // the first two args: the node binary and the script path. These
    // are required by CAC (our CLI framework) but not the CLI itself,
    // so we can pass empty strings.
    run(['', '', ...argv]).catch(error => {
      // Errors are never rethrown, but either logged to the output
      // channel or shown as a message to the user.
      if (error instanceof EarlyExitError) {
        outputChannel.appendLine('[stdout] ' + error.message)
      } else if (error instanceof RadashiError) {
        vscode.window.showErrorMessage(error.message)
      } else {
        outputChannel.appendLine(error.stack.replace(/^/gm, '[stderr] '))
      }
    })

  return helper
})
