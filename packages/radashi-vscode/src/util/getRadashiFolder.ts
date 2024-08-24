import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path, { isAbsolute } from 'node:path'
import LazyPromise from 'p-lazy'
import memoize from 'p-memoize'
import * as vscode from 'vscode'
import { importRadashiHelper, type RadashiHelper } from './helper.js'
import { outputChannel } from './outputChannel.js'

export interface RadashiFolder {
  type: 'workspace' | 'package'
  path: string
  importHelper: () => Promise<RadashiHelper>
}

export async function getRadashiFolder(): Promise<RadashiFolder | undefined> {
  const isRadashiPath = (folderPath: string) => {
    return (
      path.basename(folderPath) === 'radashi' ||
      existsSync(path.join(folderPath, 'radashi.json'))
    )
  }

  const createRadashiFolder = (
    type: 'workspace' | 'package',
    path: string,
  ) => ({
    type,
    path,
    importHelper: memoize(() => lazyImportRadashiHelper(path)),
  })

  // Check if one of the workspace folders is a Radashi project
  const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => {
    return isRadashiPath(folder.uri.fsPath)
  })

  if (workspaceFolder) {
    return createRadashiFolder('workspace', workspaceFolder.uri.fsPath)
  }

  // Check the "radashi.path" extension setting
  const radashiPath = vscode.workspace
    .getConfiguration('radashi')
    .get<string>('path')

  if (radashiPath) {
    outputChannel.appendLine(
      `🔍 Checking "radashi.path" setting: ${radashiPath}`,
    )

    if (isAbsolute(radashiPath)) {
      if (!existsSync(radashiPath)) {
        outputChannel.appendLine(`🚫 ${radashiPath} does not exist`)
        return undefined
      }

      if (!isRadashiPath(radashiPath)) {
        outputChannel.appendLine(
          `🚫 ${radashiPath} exists but is not a Radashi project`,
        )
        return undefined
      }

      return createRadashiFolder('workspace', radashiPath)
    }

    if (!vscode.workspace.workspaceFolders) {
      outputChannel.appendLine(
        '🚫 Failed to resolve. No workspace folders found',
      )
      return undefined
    }

    const workspaceFolder = vscode.workspace.workspaceFolders.find(folder => {
      const root = path.join(folder.uri.fsPath, radashiPath)

      if (existsSync(root)) {
        if (isRadashiPath(root)) {
          return true
        }

        outputChannel.appendLine(
          `🚫 ${root} exists but is not a Radashi project`,
        )
      }

      return false
    })

    if (workspaceFolder) {
      const root = path.join(workspaceFolder.uri.fsPath, radashiPath)
      return createRadashiFolder('workspace', root)
    }
  }

  // Recursively search for Radashi in all workspace folders
  const packageJsonUris = await vscode.workspace.findFiles(
    '**/package.json',
    '**/node_modules/**',
  )

  for (const packageJsonUri of packageJsonUris) {
    const folderPath = path.dirname(packageJsonUri.fsPath)

    if (isRadashiPath(folderPath)) {
      return {
        type: 'package',
        path: folderPath,
        helper: lazyImportRadashiHelper(folderPath),
      }
    }
  }

  return undefined
}

function lazy<T>(fn: () => Promise<T>) {
  return new LazyPromise<T>((resolve, reject) => {
    try {
      resolve(fn())
    } catch (error) {
      reject(error)
    }
  })
}

async function lazyImportRadashiHelper(root: string) {
  return new LazyPromise(resolve =>
    resolve(
      (async (): Promise<RadashiHelper> => {
        const pkgJsonPath = path.join(root, 'package.json')
        const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8'))

        if (pkgJson.devDependencies?.['radashi-helper']) {
          const nodeModulesDir = path.join(root, 'node_modules')
          if (!existsSync(nodeModulesDir)) {
            outputChannel.appendLine(
              `🚫 node_modules directory not found: ${nodeModulesDir}`,
            )
            throw new Error(
              `The node_modules directory does not exist. Run \`pnpm install\` first.`,
            )
          }

          const helperPath = path.join(nodeModulesDir, 'radashi-helper')
          if (existsSync(helperPath)) {
            return importRadashiHelper(helperPath)
          }

          outputChannel.appendLine(
            `🚫 radashi-helper not found in ${helperPath}`,
          )
        } else {
          outputChannel.appendLine(
            `🚫 radashi-helper not found in "devDependencies" of ${pkgJsonPath}`,
          )
        }

        throw new Error(
          `To use this command, you need to install radashi-helper. Run \`pnpm add -D radashi-helper\`.`,
        )
      })(),
    ),
  )
}
