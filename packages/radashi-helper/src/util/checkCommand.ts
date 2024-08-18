import { exec } from 'node:child_process'

export async function checkCommand(cmd: string) {
  return new Promise<boolean>(resolve => {
    exec(`command -v ${cmd}`, error => {
      resolve(!error)
    })
  })
}
