import glob from 'fast-glob'
import fs from 'node:fs'
import path from 'node:path'
import * as vscode from 'vscode'

export interface RadashiFolder {
  type: 'workspace' | 'package'
  path: string
}

export function getRadashiFolder(): RadashiFolder | undefined {
  const isRadashiPath = (folderPath: string) => {
    return (
      path.basename(folderPath) === 'radashi' ||
      fs.existsSync(path.join(folderPath, 'radashi.json'))
    )
  }

  const workspaceFolderPath = vscode.workspace.workspaceFolders?.find(
    folder => {
      const folderPath = folder.uri.fsPath
      return isRadashiPath(folderPath)
    },
  )?.uri.fsPath

  if (workspaceFolderPath) {
    return { type: 'workspace', path: workspaceFolderPath }
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
          return { type: 'package', path: folderPath }
        }
      }
    }
  }

  return undefined
}
