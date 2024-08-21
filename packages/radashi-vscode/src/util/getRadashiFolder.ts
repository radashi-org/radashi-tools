import fs from 'node:fs'
import path from 'node:path'
import LazyPromise from 'p-lazy'
import * as vscode from 'vscode'
import { importRadashiHelper, type RadashiHelper } from './helper.js'

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

  const workspaceFolder = vscode.workspace.workspaceFolders?.find(folder => {
    const folderPath = folder.uri.fsPath
    return isRadashiPath(folderPath)
  })

  if (workspaceFolder) {
    return {
      type: 'workspace',
      path: workspaceFolder.uri.fsPath,
      helper: lazyImportRadashiHelper(workspaceFolder.uri.fsPath),
    }
  }

  // Search for Radashi in all workspace folders
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (workspaceFolders) {
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
  }

  return undefined
}

async function lazyImportRadashiHelper(root: string) {
  return new LazyPromise<RadashiHelper>(resolve => {
    const pkgPath = path.join(root, 'node_modules/radashi-helper')
    resolve(importRadashiHelper(pkgPath))
  })
}
