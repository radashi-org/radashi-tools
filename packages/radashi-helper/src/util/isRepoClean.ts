import { exec } from 'node:child_process'

export async function isRepoClean(cwd: string): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    exec('git status --porcelain', { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Error executing git status: ${stderr}`))
      } else {
        resolve(stdout.trim() === '')
      }
    })
  })
}
