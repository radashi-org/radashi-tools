import glob from 'fast-glob'
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

export function getRadashiFolder(): RadashiFolder | undefined {
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
    for (const folder of workspaceFolders) {
      const folderPath = folder.uri.fsPath
      const packageJsonPaths = glob.sync('**/package.json', {
        cwd: folderPath,
      })

      for (const packageJsonPath of packageJsonPaths) {
        const folderPath = path.dirname(packageJsonPath)

        if (isRadashiPath(folderPath)) {
          return {
            type: 'package',
            path: folderPath,
            helper: lazyImportRadashiHelper(folderPath),
          }
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
