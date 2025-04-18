import $ from 'picospawn'
import { proxied } from 'radashi'
import { botCommit } from '../bot'
import type { Env } from '../env'
import { EarlyExitError, forwardStderrAndRethrow } from './error'
import { prompt, type PromptChoice } from './prompt'
import { stdio } from './stdio'
import { updateRadashiConfig } from './updateRadashiConfig'

let forcedEditor: string | undefined
let openFile: OpenFileHandler | undefined

export async function openInEditor(file: string, env: Env, editor?: string) {
  if (openFile) {
    return openFile(file)
  }

  editor ||= forcedEditor || env.config.editor

  if (editor?.[0] === '!') {
    editor = editor.slice(1)
  } else if (!forcedEditor) {
    // Map program names to human-readable names.
    const displayNames = proxied(cmd => {
      switch (cmd) {
        case 'code':
          return 'VS Code'
        case 'code-insiders':
          return 'VS Code Insiders'
        case 'cursor':
          return 'Cursor'
        case 'vim':
          return 'Vim'
        case 'emacs':
          return 'Emacs'
        case 'sublime':
          return 'Sublime Text'
        case 'atom':
          return 'Atom'
      }
      return cmd
    })

    const addAvailableEditors = async (choices: PromptChoice<string>[]) => {
      if (process.env.EDITOR) {
        choices.push({
          title: `Open with $EDITOR (${process.env.EDITOR})`,
          value: '$EDITOR',
        })
      }

      for (const editor of [
        'code',
        'code-insiders',
        'cursor',
        'vim',
        'emacs',
        'sublime',
        'atom',
      ]) {
        try {
          await $('command -v', [editor])
          choices.push({
            title: `Open with ${displayNames[editor]}`,
            value: editor,
          })
        } catch {
          // Editor not found, skip
        }
      }

      choices.push({
        title: 'Open with custom command',
        value: 'custom',
      })
    }

    while (true) {
      const choices: PromptChoice<string>[] = []

      if (env.config.editor) {
        choices.push({
          title: `Open with ${displayNames[env.config.editor]}`,
          value: env.config.editor,
        })
        choices.push({
          title: `Always open with ${displayNames[env.config.editor]}`,
          value: '!' + env.config.editor,
        })
        choices.push({
          title: 'Select another editor',
          value: 'other',
        })
      } else {
        await addAvailableEditors(choices)
      }

      const response = await prompt({
        type: 'autocomplete',
        name: 'response',
        message: 'How would you like to open the file?',
        choices: choices,
      })
      if (!response) {
        throw new EarlyExitError('No editor selected. Exiting...')
      }

      if (response === 'other') {
        env.config.editor = undefined
        await addAvailableEditors(choices)
        continue
      }

      if (response === 'custom') {
        const customCommand = await prompt({
          type: 'text',
          name: 'customCommand',
          message: 'Enter the command to open the file:',
        })
        if (!customCommand) {
          throw new EarlyExitError('No command provided. Exiting...')
        }
        editor = customCommand
      } else if (response[0] === '!') {
        editor = response.slice(1)
      } else if (response === '$EDITOR') {
        editor = process.env.EDITOR!
      } else {
        editor = response
      }

      forcedEditor = editor
      if (env.configPath) {
        await updateRadashiConfig(env, {
          editor: response === 'custom' ? editor : response,
        })
        await botCommit('chore: set preferred editor in radashi.json', {
          cwd: env.root,
          add: [env.configPath],
        })
      }

      break
    }
  }

  if (editor) {
    await $(editor, [file], { stdio }).catch(forwardStderrAndRethrow)
  }
}

export type OpenFileHandler = (file: string) => Promise<void>

export function setFileOpener(handler: OpenFileHandler) {
  openFile = handler
}
