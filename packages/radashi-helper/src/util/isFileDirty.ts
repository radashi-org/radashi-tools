import { execa } from 'execa'
import { debug } from './debug'

export async function isFileDirty(filePath: string): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['status', '--porcelain', filePath])
    return stdout.trim().length > 0
  } catch (error) {
    debug(`Error checking file status: ${error}`)
    return false
  }
}
