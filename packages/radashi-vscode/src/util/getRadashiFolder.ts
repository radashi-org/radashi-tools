import fs from 'node:fs'
import path, { isAbsolute } from 'node:path'
import LazyPromise from 'p-lazy'
import * as vscode from 'vscode'
import { importRadashiHelper, type RadashiHelper } from './helper.js'
import { outputChannel } from './outputChannel.js'

export interface RadashiFolder {
  type: 'workspace' | 'package'
  path: string
  helper: Promise<RadashiHelper>
}

export async function getRadashiFolder(): Promise<RadashiFolder | undefined> {
  const isRadashiPath = (folderPath: string) => {
    return (
      path.basename(folderPath) === 'radashi' ||
      fs.existsSync(path.join(folderPath, 'radashi.json'))
    )
  }

  // Check if one of the workspace folders is a Radashi project
  const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => {
    return isRadashiPath(folder.uri.fsPath)
  })

  if (workspaceFolder) {
    return {
      type: 'workspace',
      path: workspaceFolder.uri.fsPath,
      helper: lazyImportRadashiHelper(workspaceFolder.uri.fsPath),
    }
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
      if (!fs.existsSync(radashiPath)) {
        outputChannel.appendLine(`🚫 ${radashiPath} does not exist`)
        return undefined
      }

      if (!isRadashiPath(radashiPath)) {
        outputChannel.appendLine(
          `🚫 ${radashiPath} exists but is not a Radashi project`,
        )
        return undefined
      }

      return {
        type: 'package',
        path: radashiPath,
        helper: lazyImportRadashiHelper(radashiPath),
      }
    }

    if (!vscode.workspace.workspaceFolders) {
      outputChannel.appendLine(
        '🚫 Failed to resolve. No workspace folders found',
      )
      return undefined
    }

    const workspaceFolder = vscode.workspace.workspaceFolders.find(folder => {
      const root = path.join(folder.uri.fsPath, radashiPath)

      if (fs.existsSync(root)) {
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
      return {
        type: 'package',
        path: root,
        helper: lazyImportRadashiHelper(root),
      }
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

async function lazyImportRadashiHelper(root: string) {
  return new LazyPromise<RadashiHelper>(resolve => {
    const pkgPath = path.join(root, 'node_modules/radashi-helper')
    resolve(importRadashiHelper(pkgPath))
  })
}
