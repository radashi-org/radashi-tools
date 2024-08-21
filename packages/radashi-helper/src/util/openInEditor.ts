import { execa } from 'execa'
import { proxied } from 'radashi'
import type { Env } from '../env'
import { EarlyExitError } from './error'
import { prompt } from './prompt'
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

    const editorOptions = []

    if (env.config.editor) {
      editorOptions.push({
        title: `Open with ${displayNames[env.config.editor]}`,
        value: env.config.editor,
      })
      editorOptions.push({
        title: `Always open with ${displayNames[env.config.editor]}`,
        value: '!' + env.config.editor,
      })
    } else {
      if (process.env.EDITOR) {
        editorOptions.push({
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
          await execa('command', ['-v', editor])
          editorOptions.push({
            title: `Open with ${displayNames[editor]}`,
            value: editor,
          })
        } catch {
          // Editor not found, skip
        }
      }

      editorOptions.push({
        title: 'Open with custom command',
        value: 'custom',
      })
    }

    const response = await prompt({
      type: 'autocomplete',
      name: 'response',
      message: 'How would you like to open the file?',
      choices: editorOptions,
    })
    if (!response) {
      throw new EarlyExitError('No editor selected. Exiting...')
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
    await updateRadashiConfig(env, {
      editor: response === 'custom' ? editor : response,
    })
  }

  if (editor) {
    try {
      await execa(editor, [file], { stdio })
    } catch (error) {
      console.error(`Failed to open file with ${editor}:`, error)
    }
  }
}

export type OpenFileHandler = (file: string) => Promise<void>

export function setFileOpener(handler: OpenFileHandler) {
  openFile = handler
}
